package com.kanalog.study.application.model

import java.time.Instant

data class ReviewResult(
    val due: Instant?,
    val version: Long,
    val state: String,
    val retryCard: CardView? = null,
)
