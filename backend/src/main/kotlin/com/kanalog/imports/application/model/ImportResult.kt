package com.kanalog.imports.application.model

import java.util.UUID

data class ImportResult(
    val sourceId: UUID,
    val cards: Int,
    val media: Int,
    val report: String,
)
