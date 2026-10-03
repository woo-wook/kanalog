package com.kanalog.common.time

import java.time.Instant
import java.time.ZoneId

fun localDayWindow(now: Instant, zone: ZoneId): Pair<Instant, Instant> {
    val day = now.atZone(zone).toLocalDate()
    return day.atStartOfDay(zone).toInstant() to day.plusDays(1).atStartOfDay(zone).toInstant()
}
