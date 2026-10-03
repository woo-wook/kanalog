package com.kanalog

import com.kanalog.common.time.localDayWindow

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test
import java.time.Instant
import java.time.ZoneId

class DayWindowTest {
    @Test fun `Seoul midnight splits UTC review instants consistently`() {
        val seoul=ZoneId.of("Asia/Seoul")
        val before=localDayWindow(Instant.parse("2026-09-29T14:59:59Z"),seoul)
        val after=localDayWindow(Instant.parse("2026-09-29T15:00:00Z"),seoul)
        assertEquals(Instant.parse("2026-09-28T15:00:00Z"),before.first)
        assertEquals(Instant.parse("2026-09-29T15:00:00Z"),before.second)
        assertEquals(before.second,after.first)
    }
}
