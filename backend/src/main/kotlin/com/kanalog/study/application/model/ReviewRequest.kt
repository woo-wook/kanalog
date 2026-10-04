package com.kanalog.study.application.model

import java.util.UUID

data class ReviewRequest(
    val sessionId: UUID,
    val cardId: UUID,
    val version: Long,
    val rating: String,
    val idempotencyKey: String,
    val reinforcement: Boolean = false,
    val retryVersion: Long = 0,
)
