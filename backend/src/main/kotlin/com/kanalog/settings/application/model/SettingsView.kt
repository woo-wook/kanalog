package com.kanalog.settings.application.model

data class SettingsView(
    val dailyNewLimit: Int, val showReadingHint: Boolean, val showHangulHint: Boolean,
    val autoPlayAudio: Boolean, val allowAudioBeforeReveal: Boolean, val ttsFallback: Boolean,
    val playbackSpeed: Double, val timezone: String, val preferredVoice: String?,
    val audioEngine: String, val supertonicVoice: String
)
