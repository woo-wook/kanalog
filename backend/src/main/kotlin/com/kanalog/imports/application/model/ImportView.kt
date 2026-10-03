package com.kanalog.imports.application.model

import java.time.Instant
import java.util.UUID

data class ImportView(
    val id: UUID,
    val fileName: String,
    val status: String,
    val startedAt: Instant,
    val finishedAt: Instant?,
    val reportJson: String?,
    val errorMessage: String?,
)
