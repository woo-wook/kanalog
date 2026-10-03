package com.kanalog.progress.domain

import java.time.LocalDate

object LearningStreak {
    fun count(
        days: Set<LocalDate>,
        today: LocalDate,
    ): Int {
        var day = if (today in days) today else today.minusDays(1)
        var count = 0
        while (day in days) {
            count++
            day = day.minusDays(1)
        }
        return count
    }
}
