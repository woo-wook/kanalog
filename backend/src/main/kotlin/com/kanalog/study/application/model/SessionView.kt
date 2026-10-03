package com.kanalog.study.application.model

import java.util.UUID

data class SessionView(
    val id: UUID,
    val cards: List<CardView>,
    val answered: Int,
    val lessonId: UUID? = null,
    val lessonTitle: String? = null,
    val practice: Boolean = false,
    val queueInfo: QueueInfo? = null,
)
