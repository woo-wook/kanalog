package com.kanalog.study.application.model

import java.util.UUID

data class DeckView(
    val id: UUID,
    val title: String,
    val level: String?,
    val kind: String,
    val totalCards: Int,
    val studiedCards: Int,
    val unseenCards: Int,
    val selected: Boolean,
)
