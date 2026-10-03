package com.kanalog.content.application.model

import com.kanalog.content.domain.GrammarFocus
import java.util.UUID

data class NoteView(val id: UUID, val japanese: String, val front: String, val reading: String?,
    val meaning: String?, val example: String?, val exampleMeaning: String?, val explanation: String?,
    val memo: String?, val hangulHint: String?, val source: String, val bookmarked: Boolean,
    val excluded: Boolean, val audioId: UUID?, val kind:String, val level:String?, val grammarFocus:GrammarFocus?)
