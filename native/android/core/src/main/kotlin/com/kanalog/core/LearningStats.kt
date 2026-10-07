package com.kanalog.core

import java.time.Instant
import java.time.ZoneId

data class LearningStats(
    val todayAnswers: Int = 0,
    val todayUniqueCards: Int = 0,
    val answers7Days: Int = 0,
    val uniqueCards7Days: Int = 0,
    val answers30Days: Int = 0,
    val uniqueCards30Days: Int = 0,
    val streak: Int = 0,
    val lastStudiedAt: Instant? = null,
)

fun learningStats(
    state: LocalState,
    now: Instant,
): LearningStats {
    val zone = ZoneId.of(state.settings.timeZone)
    val today = now.atZone(zone).toLocalDate()
    val end = today.plusDays(1).atStartOfDay(zone).toInstant()
    val events = state.reviews.map { it.noteId to Instant.parse(it.at) }.filter { (_, time) -> !time.isAfter(now) }

    fun since(days: Long): List<Pair<String, Instant>> {
        val start = today.minusDays(days - 1).atStartOfDay(zone).toInstant()
        return events.filter { (_, time) -> time >= start && time < end }
    }
    val day = since(1)
    val week = since(7)
    val month = since(30)
    val studiedDays = events.map { (_, time) -> time.atZone(zone).toLocalDate() }.toSet()
    var cursor = if (today in studiedDays) today else today.minusDays(1)
    var streak = 0
    while (cursor in studiedDays) {
        streak++
        cursor = cursor.minusDays(1)
    }
    return LearningStats(
        todayAnswers = day.size,
        todayUniqueCards = day.map { it.first }.toSet().size,
        answers7Days = week.size,
        uniqueCards7Days = week.map { it.first }.toSet().size,
        answers30Days = month.size,
        uniqueCards30Days = month.map { it.first }.toSet().size,
        streak = streak,
        lastStudiedAt = events.maxOfOrNull { it.second },
    )
}
