package com.kanalog.settings.application.model

import jakarta.validation.constraints.Max
import jakarta.validation.constraints.Min
import org.springframework.web.bind.annotation.*

data class SettingsPatch(
    @field:Min(0) @field:Max(100) val dailyNewLimit: Int? = null,
    val showReadingHint: Boolean? = null, val showHangulHint: Boolean? = null,
    val autoPlayAudio: Boolean? = null, val allowAudioBeforeReveal: Boolean? = null,
    val ttsFallback: Boolean? = null, val playbackSpeed: Double? = null, val timezone: String? = null,
    val preferredVoice: String? = null, val audioEngine: String? = null, val supertonicVoice: String? = null
)
