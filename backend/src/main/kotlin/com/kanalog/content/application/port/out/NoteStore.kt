package com.kanalog.content.application.port.out

import com.kanalog.content.application.model.NoteCreate
import com.kanalog.content.application.model.NotePage
import com.kanalog.content.application.model.NotePatch
import com.kanalog.content.application.model.NoteView
import java.util.UUID

interface NoteStore {
    fun find(owner: UUID, id: UUID): NoteView?
    fun search(owner: UUID, query: String, page: Int, size: Int, kind: String): NotePage
    fun lockUser(owner: UUID)
    fun personalDeck(owner: UUID): UUID
    fun create(owner: UUID, id: UUID, deck: UUID, body: NoteCreate)
    fun update(owner: UUID, id: UUID, body: NotePatch)
    fun bookmark(owner: UUID, id: UUID, marked: Boolean)
    fun exclude(owner: UUID, id: UUID, excluded: Boolean)
}
