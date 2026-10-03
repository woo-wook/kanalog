package com.kanalog.speech.application.port.out

import com.kanalog.speech.domain.SpeechInput

interface SpeechSynthesizer {
    fun synthesize(input: SpeechInput): ByteArray
}
