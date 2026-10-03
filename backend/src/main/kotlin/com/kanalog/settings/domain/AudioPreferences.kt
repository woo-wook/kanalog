package com.kanalog.settings.domain

import com.kanalog.common.error.fail
import java.time.ZoneId

data class AudioPreferences(val speed: Double, val engine: String, val voice: String, val timezone: String) {
    init {
        if(speed < 0.5 || speed > 2.0) fail("BAD_SETTING", "재생 속도는 0.5~2 사이여야 합니다")
        if(engine !in setOf("SUPERTONIC", "ORIGINAL", "DEVICE")) fail("BAD_AUDIO_ENGINE", "음성 재생 방식을 확인하세요")
        if(voice !in setOf("F1","F2","F3","F4","F5","M1","M2","M3","M4","M5")) fail("BAD_SUPERTONIC_VOICE", "Supertonic 음성을 확인하세요")
        try { ZoneId.of(timezone) } catch (_: Exception) { fail("BAD_TIMEZONE", "시간대를 확인하세요") }
    }
}
