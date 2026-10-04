package com.kanalog.study.application.model

import com.kanalog.content.domain.GrammarFocus
import com.kanalog.content.domain.ReadingGuide
import java.time.Instant
import java.util.UUID

data class CardView(
    val id: UUID,
    val version: Long,
    val kind: String,
    val front: String,
    val reading: String?,
    val meaning: String?,
    val example: String?,
    val exampleMeaning: String?,
    val explanation: String?,
    val partOfSpeech: String?,
    val hangulHint: String?,
    val audioId: UUID?,
    val exampleAudioId: UUID?,
    val due: Instant?,
    val examples: List<ExampleView> = emptyList(),
    val lastRating: String? = null,
    val grammarFocus: GrammarFocus? = null,
    val reinforcement: Boolean = false,
    val retryVersion: Long = 0,
    val readingGuide: ReadingGuide? = null,
    val exampleReadingGuide: ReadingGuide? = null,
)
