package com.kanalog.speech.application

import com.kanalog.speech.application.model.SpeechRequest
import com.kanalog.speech.application.port.out.SpeechSynthesizer
import com.kanalog.speech.domain.SpeechInput
import org.springframework.stereotype.Service

@Service
class SpeechService(
    private val synthesizer: SpeechSynthesizer,
) {
    fun generate(input: SpeechRequest) = synthesizer.synthesize(SpeechInput(input.text, input.voice))
}
