package com.kanalog.study.application.port.out

import java.time.Instant

interface ReviewScheduler {
    val version: String
    val settingsJson: String

    fun review(
        json: String?,
        rating: String,
        now: Instant,
    ): Pair<String, Instant>

    fun due(json: String): Instant
}
