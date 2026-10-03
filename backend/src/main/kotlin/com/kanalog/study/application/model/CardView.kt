package com.kanalog.study.application.model

import com.kanalog.content.domain.GrammarFocus
import java.time.*
import java.util.*
import org.springframework.web.bind.annotation.*

data class CardView(val id: UUID, val version: Long, val kind: String, val front: String, val reading: String?,
                    val meaning: String?, val example: String?, val exampleMeaning: String?,
                    val explanation: String?, val partOfSpeech: String?, val hangulHint: String?, val audioId: UUID?, val exampleAudioId: UUID?,
                    val due: Instant?, val examples: List<ExampleView> = emptyList(), val lastRating:String? = null, val grammarFocus:GrammarFocus? = null)
