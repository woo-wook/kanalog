package com.kanalog.study.domain

import java.time.Instant
import java.time.ZoneId

object ReinforcementPolicy {
    fun tomorrow(
        now: Instant,
        zone: ZoneId,
    ): Instant =
        now
            .atZone(zone)
            .toLocalDate()
            .plusDays(1)
            .atStartOfDay(zone)
            .toInstant()
}
