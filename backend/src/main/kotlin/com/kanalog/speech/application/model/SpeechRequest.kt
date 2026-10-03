package com.kanalog.speech.application.model

import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Pattern
import jakarta.validation.constraints.Size

data class SpeechRequest(
    @field:NotBlank @field:Size(max = 500) val text: String,
    @field:Pattern(regexp = "[FM][1-5]") val voice: String,
)
