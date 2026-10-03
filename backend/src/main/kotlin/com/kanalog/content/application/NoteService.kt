package com.kanalog.content.application

import com.kanalog.common.error.FailureStatus
import com.kanalog.common.error.fail
import com.kanalog.content.application.model.NoteCreate
import com.kanalog.content.application.model.NotePage
import com.kanalog.content.application.model.NotePatch
import com.kanalog.content.application.model.NoteView
import com.kanalog.content.application.port.out.NoteStore
import com.kanalog.content.domain.PersonalNote
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

@Service
class NoteService(
    private val store: NoteStore,
) {
    fun get(
        user: UUID,
        id: UUID,
    ) = store.find(user, id) ?: fail("NOTE_NOT_FOUND", "단어를 찾을 수 없습니다", FailureStatus.NOT_FOUND)

    fun list(
        user: UUID,
        query: String,
        page: Int,
        size: Int,
        kind: String = "",
    ): NotePage {
        if (page < 0 || size !in 1..100) fail("BAD_PAGE", "페이지 범위를 확인하세요")
        if (kind !in setOf("", "vocabulary", "grammar", "kana")) fail("BAD_NOTE_KIND", "단어장 분류를 확인하세요")
        return store.search(user, query, page, size, kind)
    }

    @Transactional
    fun create(
        user: UUID,
        body: NoteCreate,
    ): NoteView {
        store.lockUser(user)
        val content = PersonalNote.of(body.japanese, body.reading, body.meaning)
        val deck = store.personalDeck(user)
        val id = UUID.randomUUID()
        store.create(user, id, deck, body.copy(japanese = content.japanese, reading = content.reading, meaning = content.meaning))
        return get(user, id)
    }

    @Transactional
    fun patch(
        user: UUID,
        id: UUID,
        body: NotePatch,
    ): NoteView {
        val old = get(user, id)
        val editingSource = listOf(body.japanese, body.reading, body.meaning, body.example, body.exampleMeaning).any { it != null }
        if (old.source != "PERSONAL" && editingSource) fail("READ_ONLY_SOURCE", "가져온 원본은 수정할 수 없습니다", FailureStatus.FORBIDDEN)
        val front = (body.japanese ?: old.front).trim()
        val reading = (body.reading ?: old.reading)?.trim()
        val meaning = (body.meaning ?: old.meaning)?.trim()
        if (old.source == "PERSONAL") PersonalNote.of(front, reading, meaning)
        store.update(
            user,
            id,
            NotePatch(
                front,
                reading,
                meaning,
                body.example ?: old.example,
                body.exampleMeaning ?: old.exampleMeaning,
                body.memo ?: old.memo,
                body.hangulHint ?: old.hangulHint,
            ),
        )
        body.bookmarked?.let { store.bookmark(user, id, it) }
        body.excluded?.let { store.exclude(user, id, it) }
        return get(user, id)
    }
}
