package com.kanalog.content.application.model

import jakarta.validation.constraints.NotBlank

data class NoteCreate(@field:NotBlank val japanese: String, @field:NotBlank val reading: String,
    @field:NotBlank val meaning: String, val example: String? = null, val exampleMeaning: String? = null,
    val memo: String? = null, val hangulHint: String? = null)
