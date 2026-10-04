package com.kanalog.study.application

import com.kanalog.common.crypto.sha256
import com.kanalog.common.error.FailureStatus
import com.kanalog.common.error.fail
import com.kanalog.common.time.localDayWindow
import com.kanalog.course.application.CourseService
import com.kanalog.study.application.model.QueueInfo
import com.kanalog.study.application.model.ReviewRequest
import com.kanalog.study.application.model.ReviewResult
import com.kanalog.study.application.model.SessionView
import com.kanalog.study.application.port.out.ReviewScheduler
import com.kanalog.study.application.port.out.StudyScope
import com.kanalog.study.application.port.out.StudyStore
import com.kanalog.study.domain.KanaMixRequest
import com.kanalog.study.domain.LevelStudyRequest
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Instant
import java.time.ZoneId
import java.util.UUID

@Service
class StudyService(
    private val store: StudyStore,
    private val scheduler: ReviewScheduler,
    private val courses: CourseService,
    private val kanaMix: KanaMixService,
) {
    fun options(userId: UUID) = store.options(userId)

    fun decks(userId: UUID) = store.decks(userId)

    fun card(
        userId: UUID,
        cardId: UUID,
    ) = store.card(userId, cardId)

    @Transactional
    fun select(
        userId: UUID,
        deckId: UUID,
    ) {
        requireDeck(userId, deckId)
        store.selectDeck(userId, deckId)
    }

    @Transactional
    fun start(
        userId: UUID,
        deckId: UUID? = null,
        lessonId: UUID? = null,
        kana: KanaMixRequest? = null,
        practice: Boolean = false,
        levelScope: LevelStudyRequest? = null,
    ): SessionView {
        if (listOf(deckId, lessonId, kana, levelScope).count { it != null } != 1) fail("BAD_STUDY_SCOPE", "코스 단계·덱·가나 연습 중 하나를 선택하세요")
        val lesson = lessonId?.let { courses.scope(userId, it) }
        val scope = StudyScope(lesson?.deckId ?: deckId, lessonId, kana?.let { kanaMix.cards(userId, it) }, levelScope)
        val isPractice = practice || kana != null
        store.lockUser(userId)
        scope.deckId?.let { requireDeck(userId, it) }
        val size = if (kana != null || (isPractice && lessonId != null)) Int.MAX_VALUE else 50
        val (begin, end) = localDayWindow(Instant.now(), zone(userId))
        val limit = store.dailyNewLimit(userId)
        val used = store.newCardsUsed(userId, begin, end)
        val remaining = limit - used
        val ids =
            if (isPractice) {
                store.practiceCards(userId, scope, size)
            } else {
                val due = store.dueCards(userId, scope, size)
                val unseen =
                    if (remaining > 0 &&
                        levelScope?.reviewOnly != true
                    ) {
                        store.unseenCards(userId, scope, remaining)
                    } else {
                        emptyList()
                    }
                (due + unseen).distinct()
            }
        val availability = store.availability(userId, scope)
        val reason =
            when {
                ids.isNotEmpty() -> null
                availability.total == 0 -> "NO_ELIGIBLE_CARDS"
                !isPractice && levelScope?.reviewOnly != true && availability.unseen > 0 && used >= limit -> "DAILY_LIMIT"
                else -> "NOT_DUE"
            }
        val info = QueueInfo(availability.total, availability.unseen, maxOf(0, remaining), availability.nextDue, reason)
        val id = UUID.randomUUID()
        val title = levelScope?.title() ?: kana?.copy(practice = isPractice)?.title()
        store.createSession(id, userId, scope, title, isPractice, info)
        ids.forEachIndexed { position, card -> store.reserveCard(id, userId, card, position, isPractice) }
        return SessionView(id, ids.mapNotNull { card(userId, it) }, 0, lessonId, title ?: lesson?.title, isPractice, info)
    }

    fun session(
        userId: UUID,
        sessionId: UUID,
    ): SessionView {
        val metadata = store.metadata(userId, sessionId) ?: fail("SESSION_NOT_FOUND", "학습 세션을 찾을 수 없습니다", FailureStatus.NOT_FOUND)
        val ids = store.sessionCards(userId, sessionId, metadata.practice)
        val summary = store.sessionSummary(userId, sessionId)
        return SessionView(
            sessionId,
            ids.mapNotNull {
                sessionCard(userId, sessionId, it)
            },
            store.answerCount(userId, sessionId, metadata.practice),
            metadata.lessonId,
            metadata.title,
            metadata.practice,
            queueInfo = metadata.queueInfo,
            answeredCards = summary.cards,
            ratingCounts = summary.ratings,
        )
    }

    @Transactional
    fun review(
        userId: UUID,
        req: ReviewRequest,
    ): ReviewResult {
        if (req.idempotencyKey.length !in 8..100) fail("BAD_KEY", "요청 키를 확인하세요")
        val digest =
            sha256(
                "${req.sessionId}|${req.cardId}|${req.version}|${req.rating}${if (req.reinforcement) "|retry|${req.retryVersion}" else ""}",
            )
        // Preserve user -> card locking order and the user's shared daily allowance.
        store.lockUser(userId)
        store.savedReinforcement(userId, req.idempotencyKey)?.let {
            requireSameRequest(it.requestHash, digest)
            return ReviewResult(null, it.nextVersion, "REINFORCED")
        }
        store.practiceRequestHash(userId, req.idempotencyKey)?.let {
            requireSameRequest(it, digest)
            return ReviewResult(null, req.version, "PRACTICED")
        }
        store.savedReview(userId, req.idempotencyKey)?.let {
            requireSameRequest(it.requestHash, digest)
            return ReviewResult(scheduler.due(it.nextState), it.nextVersion, "SAVED", it.retryCard)
        }
        if (!store.sessionContains(
                userId,
                req.sessionId,
                req.cardId,
            )
        ) {
            fail("CARD_NOT_IN_SESSION", "세션 카드를 찾을 수 없습니다", FailureStatus.NOT_FOUND)
        }
        if (req.reinforcement) return reinforcementAnswer(userId, req, digest)
        if (store.isPractice(userId, req.sessionId)) return practiceAnswer(userId, req, digest)
        if (!store.practiceCardAvailable(userId, req.cardId)) fail("CARD_NOT_AVAILABLE", "연습할 수 없는 카드입니다", FailureStatus.CONFLICT)
        val state = store.lockState(userId, req.cardId) ?: fail("CARD_STATE_MISSING", "카드 상태를 다시 불러오세요", FailureStatus.CONFLICT)
        if (store.retryStatus(userId, req.sessionId, req.cardId)?.pending ==
            true
        ) {
            fail("RETRY_REQUIRED", "즉시 재연습 답변으로 제출하세요", FailureStatus.CONFLICT)
        }
        state.requireReviewable(req.version, Instant.now(), store.followupDue(userId, req.cardId))
        if (store.scheduledAnswered(
                req.sessionId,
                req.cardId,
            )
        ) {
            fail("SESSION_ALREADY_ANSWERED", "이미 이 세션에서 평가한 카드입니다", FailureStatus.CONFLICT)
        }
        if (state.firstSeen == null) {
            val (begin, end) = localDayWindow(Instant.now(), zone(userId))
            if (store.newCardsUsed(userId, begin, end) >=
                store.dailyNewLimit(userId)
            ) {
                fail("NEW_LIMIT", "오늘 새 카드 한도에 도달했습니다", FailureStatus.CONFLICT)
            }
        }
        val now = Instant.now()
        val (nextJson, due) = scheduler.review(state.json, req.rating, now)
        store.saveReview(userId, req, state, nextJson, due, now, digest, scheduler.version, scheduler.settingsJson)
        store.saveKanaRating(userId, req)
        store.clearFollowup(userId, req.cardId)
        if (req.rating == "AGAIN" && store.retryStatus(userId, req.sessionId, req.cardId) != null) {
            val tomorrow =
                com.kanalog.study.domain.ReinforcementPolicy
                    .tomorrow(now, zone(userId))
            store.markRetry(userId, req, tomorrow)
        }
        val retry = retryCard(userId, req.sessionId, req.cardId)
        store.saveRetryResponse(userId, req.idempotencyKey, retry)
        return ReviewResult(due, state.version + 1, "SAVED", retry)
    }

    private fun sessionCard(
        user: UUID,
        session: UUID,
        cardId: UUID,
    ) = retryCard(user, session, cardId) ?: card(user, cardId)

    private fun retryCard(
        user: UUID,
        session: UUID,
        cardId: UUID,
    ) = store.retryStatus(user, session, cardId)?.takeIf { it.pending }?.let {
        card(user, cardId)?.copy(reinforcement = true, retryVersion = it.version)
    }

    private fun reinforcementAnswer(
        user: UUID,
        req: ReviewRequest,
        digest: String,
    ): ReviewResult {
        if (req.rating !in setOf("AGAIN", "HARD", "GOOD", "EASY")) fail("BAD_RATING", "평가를 확인하세요")
        if (!store.practiceCardAvailable(user, req.cardId)) fail("CARD_NOT_AVAILABLE", "연습할 수 없는 카드입니다", FailureStatus.CONFLICT)
        val retry = store.retryStatus(user, req.sessionId, req.cardId)
        if (retry == null || !retry.pending ||
            retry.version != req.retryVersion
        ) {
            fail("STALE_RETRY", "재연습 상태가 변경되었습니다. 다시 불러오세요", FailureStatus.CONFLICT)
        }
        val state = store.lockState(user, req.cardId) ?: fail("CARD_STATE_MISSING", "카드 상태를 다시 불러오세요", FailureStatus.CONFLICT)
        if (state.version != req.version) fail("STALE_CARD", "다른 기기에서 변경된 카드입니다. 새로 불러오세요", FailureStatus.CONFLICT)
        store.saveReinforcement(user, req, digest)
        return ReviewResult(null, state.version, "REINFORCED")
    }

    private fun practiceAnswer(
        userId: UUID,
        req: ReviewRequest,
        digest: String,
    ): ReviewResult {
        if (req.rating !in setOf("AGAIN", "HARD", "GOOD", "EASY")) fail("BAD_RATING", "평가를 확인하세요")
        if (!store.practiceCardAvailable(userId, req.cardId)) fail("CARD_NOT_AVAILABLE", "연습할 수 없는 카드입니다", FailureStatus.CONFLICT)
        if (store.practiceAnswered(
                req.sessionId,
                req.cardId,
            )
        ) {
            fail("PRACTICE_ALREADY_ANSWERED", "이미 이 연습에서 답변한 카드입니다", FailureStatus.CONFLICT)
        }
        store.savePractice(userId, req, digest)
        store.saveKanaRating(userId, req)
        return ReviewResult(null, req.version, "PRACTICED")
    }

    private fun requireSameRequest(
        saved: String,
        digest: String,
    ) {
        if (saved != digest) fail("IDEMPOTENCY_CONFLICT", "이미 다른 답변에 사용된 요청 키입니다", FailureStatus.CONFLICT)
    }

    private fun requireDeck(
        owner: UUID,
        deck: UUID,
    ) {
        if (!store.deckExists(owner, deck)) fail("DECK_NOT_FOUND", "덱을 찾을 수 없습니다", FailureStatus.NOT_FOUND)
    }

    fun zone(userId: UUID): ZoneId =
        try {
            ZoneId.of(store.timezone(userId) ?: "Asia/Seoul")
        } catch (_: Exception) {
            ZoneId.of("Asia/Seoul")
        }
}
