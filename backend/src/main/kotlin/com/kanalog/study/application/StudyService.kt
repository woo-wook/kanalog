package com.kanalog.study.application

import com.kanalog.common.crypto.sha256
import com.kanalog.common.error.fail
import com.kanalog.common.time.localDayWindow
import com.kanalog.course.application.CourseService
import com.kanalog.study.application.model.*
import com.kanalog.study.application.port.out.*
import com.kanalog.study.domain.KanaMixRequest
import java.time.*
import java.util.UUID
import com.kanalog.common.error.FailureStatus
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
class StudyService(private val store: StudyStore, private val scheduler: ReviewScheduler, private val courses: CourseService, private val kanaMix: KanaMixService) {
    fun decks(userId: UUID) = store.decks(userId)
    fun card(userId: UUID, cardId: UUID) = store.card(userId, cardId)

    @Transactional
    fun select(userId: UUID, deckId: UUID) {
        requireDeck(userId, deckId)
        store.selectDeck(userId, deckId)
    }

    @Transactional
    fun start(userId: UUID, deckId: UUID? = null, lessonId: UUID? = null, kana: KanaMixRequest? = null, practice: Boolean = false): SessionView {
        if (listOf(deckId, lessonId, kana).count { it != null } != 1) fail("BAD_STUDY_SCOPE", "코스 단계·덱·가나 연습 중 하나를 선택하세요")
        val lesson = lessonId?.let { courses.scope(userId, it) }
        val scope = StudyScope(lesson?.deckId ?: deckId, lessonId, kana?.let { kanaMix.cards(userId, it) })
        val isPractice = practice || kana != null
        store.lockUser(userId)
        scope.deckId?.let { requireDeck(userId, it) }
        val size = if (kana != null || (isPractice && lessonId != null)) Int.MAX_VALUE else 50
        val (begin, end) = localDayWindow(Instant.now(), zone(userId))
        val limit = store.dailyNewLimit(userId)
        val used = store.newCardsUsed(userId, begin, end)
        val remaining = limit - used
        val ids = if (isPractice) store.practiceCards(userId, scope, size) else {
            val due = store.dueCards(userId, scope, size)
            val unseen = if (remaining > 0) store.unseenCards(userId, scope, remaining) else emptyList()
            (due + unseen).distinct()
        }
        val availability = store.availability(userId, scope)
        val reason = when {
            ids.isNotEmpty() -> null
            availability.total == 0 -> "NO_ELIGIBLE_CARDS"
            !isPractice && availability.unseen > 0 && used >= limit -> "DAILY_LIMIT"
            else -> "NOT_DUE"
        }
        val info = QueueInfo(availability.total, availability.unseen, maxOf(0, remaining), availability.nextDue, reason)
        val id = UUID.randomUUID()
        val title = kana?.copy(practice = isPractice)?.title()
        store.createSession(id, userId, scope, title, isPractice)
        ids.forEachIndexed { position, card -> store.reserveCard(id, userId, card, position, isPractice) }
        return SessionView(id, ids.mapNotNull { card(userId, it) }, 0, lessonId, title ?: lesson?.title, isPractice, info)
    }

    fun session(userId: UUID, sessionId: UUID): SessionView {
        val metadata = store.metadata(userId, sessionId) ?: fail("SESSION_NOT_FOUND", "학습 세션을 찾을 수 없습니다", FailureStatus.NOT_FOUND)
        val ids = store.sessionCards(userId, sessionId, metadata.practice)
        return SessionView(sessionId, ids.mapNotNull { card(userId, it) }, store.answerCount(userId, sessionId, metadata.practice), metadata.lessonId, metadata.title, metadata.practice)
    }

    @Transactional
    fun review(userId: UUID, req: ReviewRequest): ReviewResult {
        if (req.idempotencyKey.length !in 8..100) fail("BAD_KEY", "요청 키를 확인하세요")
        val digest = sha256("${req.sessionId}|${req.cardId}|${req.version}|${req.rating}")
        // Preserve user -> card locking order and the user's shared daily allowance.
        store.lockUser(userId)
        store.practiceRequestHash(userId, req.idempotencyKey)?.let {
            requireSameRequest(it, digest)
            return ReviewResult(null, req.version, "PRACTICED")
        }
        store.savedReview(userId, req.idempotencyKey)?.let {
            requireSameRequest(it.requestHash, digest)
            return ReviewResult(scheduler.due(it.nextState), it.nextVersion, "SAVED")
        }
        if (!store.sessionContains(userId, req.sessionId, req.cardId)) fail("CARD_NOT_IN_SESSION", "세션 카드를 찾을 수 없습니다", FailureStatus.NOT_FOUND)
        if (store.isPractice(userId, req.sessionId)) return practiceAnswer(userId, req, digest)
        val state = store.lockState(userId, req.cardId) ?: fail("CARD_STATE_MISSING", "카드 상태를 다시 불러오세요", FailureStatus.CONFLICT)
        state.requireReviewable(req.version, Instant.now())
        if (state.firstSeen == null) {
            val (begin, end) = localDayWindow(Instant.now(), zone(userId))
            if (store.newCardsUsed(userId, begin, end) >= store.dailyNewLimit(userId)) fail("NEW_LIMIT", "오늘 새 카드 한도에 도달했습니다", FailureStatus.CONFLICT)
        }
        val now = Instant.now()
        val (nextJson, due) = scheduler.review(state.json, req.rating, now)
        store.saveReview(userId, req, state, nextJson, due, now, digest, scheduler.version, scheduler.settingsJson)
        store.saveKanaRating(userId, req)
        return ReviewResult(due, state.version + 1, "SAVED")
    }

    private fun practiceAnswer(userId: UUID, req: ReviewRequest, digest: String): ReviewResult {
        if (req.rating !in setOf("AGAIN", "HARD", "GOOD", "EASY")) fail("BAD_RATING", "평가를 확인하세요")
        if (!store.practiceCardAvailable(userId, req.cardId)) fail("CARD_NOT_AVAILABLE", "연습할 수 없는 카드입니다", FailureStatus.CONFLICT)
        if (store.practiceAnswered(req.sessionId, req.cardId)) fail("PRACTICE_ALREADY_ANSWERED", "이미 이 연습에서 답변한 카드입니다", FailureStatus.CONFLICT)
        store.savePractice(userId, req, digest)
        store.saveKanaRating(userId, req)
        return ReviewResult(null, req.version, "PRACTICED")
    }
    private fun requireSameRequest(saved: String, digest: String) {
        if (saved != digest) fail("IDEMPOTENCY_CONFLICT", "이미 다른 답변에 사용된 요청 키입니다", FailureStatus.CONFLICT)
    }
    private fun requireDeck(owner: UUID, deck: UUID) {
        if (!store.deckExists(owner, deck)) fail("DECK_NOT_FOUND", "덱을 찾을 수 없습니다", FailureStatus.NOT_FOUND)
    }
    fun zone(userId: UUID): ZoneId = try { ZoneId.of(store.timezone(userId) ?: "Asia/Seoul") } catch (_: Exception) { ZoneId.of("Asia/Seoul") }
}
