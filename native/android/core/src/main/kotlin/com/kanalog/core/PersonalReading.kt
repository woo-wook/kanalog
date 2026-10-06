package com.kanalog.core

import com.kanalog.content.domain.HangulPronunciation
import com.kanalog.content.domain.KanaAlignment

object PersonalReading {
    fun guide(
        front: String,
        suppliedReading: String?,
    ): ReadingGuide? {
        val reading =
            suppliedReading?.trim()?.takeIf(String::isNotEmpty)
                ?: front.takeIf(KanaAlignment::isKana) ?: return null
        if (!KanaAlignment.isKana(reading)) return null
        val aligned =
            KanaAlignment.align(front, reading)?.map { ReadingSegment(it.text, it.reading) }
                ?: return null
        val hangul = HangulPronunciation.guide(reading)
        return ReadingGuide(
            segments = aligned,
            source = if (suppliedReading.isNullOrBlank()) "NONE" else "READING",
            hangul = hangul.text,
            hangulSource = if (hangul.text == null) null else "APPROXIMATE",
            hangulStatus = hangul.status,
        )
    }
}
