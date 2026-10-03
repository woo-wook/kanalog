package com.kanalog.study.application.port.out

import com.kanalog.study.application.model.CardView
import com.kanalog.study.application.model.DeckView
import com.kanalog.study.application.model.ReviewRequest
import com.kanalog.study.domain.ReviewState
import java.time.Instant
import java.util.UUID

data class StudyScope(val deckId: UUID?, val lessonId: UUID?, val mixedCards: List<UUID>?)
data class QueueAvailability(val total: Int, val unseen: Int, val nextDue: Instant?)
data class SessionMetadata(val lessonId: UUID?, val title: String?, val practice: Boolean)
data class SavedReview(val requestHash: String, val nextState: String, val nextVersion: Long)

interface StudyStore {
    fun decks(owner: UUID): List<DeckView>
    fun lockUser(owner: UUID)
    fun deckExists(owner: UUID, deck: UUID): Boolean
    fun selectDeck(owner: UUID, deck: UUID)
    fun dailyNewLimit(owner: UUID): Int
    fun newCardsUsed(owner: UUID, start: Instant, end: Instant): Int
    fun dueCards(owner: UUID, scope: StudyScope, size: Int): List<UUID>
    fun unseenCards(owner: UUID, scope: StudyScope, size: Int): List<UUID>
    fun practiceCards(owner: UUID, scope: StudyScope, size: Int): List<UUID>
    fun availability(owner: UUID, scope: StudyScope): QueueAvailability
    fun createSession(id: UUID, owner: UUID, scope: StudyScope, title: String?, practice: Boolean)
    fun reserveCard(session: UUID, owner: UUID, card: UUID, position: Int, practice: Boolean)
    fun metadata(owner: UUID, session: UUID): SessionMetadata?
    fun sessionCards(owner: UUID, session: UUID, practice: Boolean): List<UUID>
    fun answerCount(owner: UUID, session: UUID, practice: Boolean): Int
    fun card(owner: UUID, cardId: UUID): CardView?
    fun practiceRequestHash(owner: UUID, key: String): String?
    fun savedReview(owner: UUID, key: String): SavedReview?
    fun sessionContains(owner: UUID, session: UUID, card: UUID): Boolean
    fun isPractice(owner: UUID, session: UUID): Boolean
    fun lockState(owner: UUID, card: UUID): ReviewState?
    fun saveReview(owner: UUID, request: ReviewRequest, state: ReviewState, nextJson: String, due: Instant, now: Instant, digest: String, schedulerVersion: String, schedulerSettings: String)
    fun practiceCardAvailable(owner: UUID, card: UUID): Boolean
    fun practiceAnswered(session: UUID, card: UUID): Boolean
    fun savePractice(owner: UUID, request: ReviewRequest, digest: String)
    fun saveKanaRating(owner: UUID, request: ReviewRequest)
    fun timezone(owner: UUID): String?
}
