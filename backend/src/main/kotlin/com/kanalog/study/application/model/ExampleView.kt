package com.kanalog.study.application.model

import com.kanalog.content.domain.ReadingGuide
import java.util.UUID

data class ExampleView(
    val japanese: String,
    val reading: String?,
    val korean: String?,
    val audioId: UUID?,
    val readingGuide: ReadingGuide? = null,
)
