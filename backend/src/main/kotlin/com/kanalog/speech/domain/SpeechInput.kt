package com.kanalog.speech.domain

import com.kanalog.common.error.fail

data class SpeechInput(val text: String, val voice: String) {
    init {
        if(text.isBlank() || text.length > 500 || !voice.matches(Regex("[FM][1-5]")))
            fail("BAD_SPEECH_INPUT", "음성 요청을 확인하세요")
    }
}
