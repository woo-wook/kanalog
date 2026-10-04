package com.kanalog.study.domain

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test
import java.time.Instant
import java.time.ZoneId

class ReinforcementPolicyTest {
    @Test fun `tomorrow follows local date across Seoul midnight and daylight saving`() {
        val cases =
            listOf(
                Triple("2026-10-04T14:59:59Z", "Asia/Seoul", "2026-10-04T15:00:00Z"),
                Triple("2026-10-04T15:00:00Z", "Asia/Seoul", "2026-10-05T15:00:00Z"),
                Triple("2026-10-04T15:00:00Z", "UTC", "2026-10-05T00:00:00Z"),
                Triple("2026-03-08T08:30:00Z", "America/Los_Angeles", "2026-03-09T07:00:00Z"),
            )
        cases.forEach { (now, zone, expected) ->
            assertEquals(Instant.parse(expected), ReinforcementPolicy.tomorrow(Instant.parse(now), ZoneId.of(zone)))
        }
    }
}
