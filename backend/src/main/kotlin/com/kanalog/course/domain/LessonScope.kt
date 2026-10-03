package com.kanalog.course.domain

import java.util.UUID

data class LessonScope(
    val id: UUID,
    val deckId: UUID,
    val title: String,
)
