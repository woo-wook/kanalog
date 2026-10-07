package com.kanalog.core

import java.time.Instant
import java.time.ZoneId
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull

class LearningStatsTest {
    private fun review(
        id: String,
        at: Instant,
        reinforcement: Boolean = false,
    ) = Review("$id:$at:$reinforcement", id, "GOOD", 0, at.toString(), reinforcement)

    @Test fun `future answers after a clock rollback do not affect counts streak or latest study`() {
        val now = Instant.parse("2026-10-07T03:00:00Z")
        val future = listOf(review("future-today", now.plusNanos(1)), review("future-day", now.plusSeconds(86_400)))
        val state = LocalState(reviews = listOf(review("past", now.minusSeconds(1)), review("present", now)) + future)
        val stats = learningStats(state, now)
        assertEquals(2, stats.todayAnswers)
        assertEquals(2, stats.todayUniqueCards)
        assertEquals(2, stats.answers7Days)
        assertEquals(2, stats.uniqueCards7Days)
        assertEquals(2, stats.answers30Days)
        assertEquals(2, stats.uniqueCards30Days)
        assertEquals(1, stats.streak)
        assertEquals(now, stats.lastStudiedAt)
        val futureOnly = learningStats(LocalState(reviews = future), now)
        assertEquals(0, futureOnly.todayAnswers)
        assertEquals(0, futureOnly.streak)
        assertNull(futureOnly.lastStudiedAt)
    }

    @Test fun `local midnight windows include kana reinforcement and archived logs with unique ids`() {
        val now = Instant.parse("2026-10-06T15:00:00Z")
        val today = now.atZone(ZoneId.of("Asia/Seoul")).toLocalDate()
        val start7 = today.minusDays(6).atStartOfDay(ZoneId.of("Asia/Seoul")).toInstant()
        val start30 = today.minusDays(29).atStartOfDay(ZoneId.of("Asia/Seoul")).toInstant()
        val state =
            LocalState(
                reviews =
                    listOf(
                        review("hiragana:あ", now),
                        review("hiragana:あ", now.minusSeconds(1), reinforcement = true),
                        review("word:synthetic", start7),
                        review("archived:synthetic", start7.minusNanos(1)),
                        review("grammar:synthetic", start30),
                        review("older:synthetic", start30.minusNanos(1)),
                    ),
            )
        val stats = learningStats(state, now)
        assertEquals(1, stats.todayAnswers)
        assertEquals(1, stats.todayUniqueCards)
        assertEquals(3, stats.answers7Days)
        assertEquals(2, stats.uniqueCards7Days)
        assertEquals(5, stats.answers30Days)
        assertEquals(4, stats.uniqueCards30Days)
        assertEquals(2, stats.streak)
        assertEquals(now, stats.lastStudiedAt)
        val utc = learningStats(state.copy(settings = Settings(timeZone = "UTC")), now)
        assertEquals(2, utc.todayAnswers)
        assertEquals(4, utc.answers7Days)
        assertEquals(3, utc.uniqueCards7Days)
        assertEquals(6, utc.answers30Days)
    }

    @Test fun `streak continues from yesterday when no answer exists today`() {
        val now = Instant.parse("2026-10-06T15:00:00Z")
        val state =
            LocalState(
                reviews =
                    listOf(
                        review("kana", now.minusSeconds(1)),
                        review("word", now.minusSeconds(86_401), reinforcement = true),
                        review("older", now.minusSeconds(259_201)),
                    ),
            )
        val stats = learningStats(state, now)
        assertEquals(0, stats.todayAnswers)
        assertEquals(2, stats.streak)
        assertEquals(now.minusSeconds(1), stats.lastStudiedAt)
    }

    @Test fun `streak ends at a missing day and repeated answers do not add days`() {
        val now = Instant.parse("2026-10-07T03:00:00Z")
        val state =
            LocalState(
                reviews =
                    listOf(
                        review("one", now),
                        review("one", now, reinforcement = true),
                        review("older", now.minusSeconds(172_800)),
                    ),
            )
        assertEquals(1, learningStats(state, now).streak)
        assertEquals(2, learningStats(state, now).todayAnswers)
        assertEquals(1, learningStats(state, now).todayUniqueCards)
        assertEquals(0, learningStats(state.copy(reviews = state.reviews.takeLast(1)), now).streak)
        assertEquals(0, learningStats(LocalState(), now).streak)
        assertNull(learningStats(LocalState(), now).lastStudiedAt)
    }

    @Test fun `daylight saving repeated hour counts both answers in the same local day`() {
        val now = Instant.parse("2026-11-01T19:00:00Z")
        val start = Instant.parse("2026-11-01T04:00:00Z")
        val state =
            LocalState(
                settings = Settings(timeZone = "America/New_York"),
                reviews =
                    listOf(
                        review("a", start),
                        review("b", Instant.parse("2026-11-01T05:30:00Z")),
                        review("b", Instant.parse("2026-11-01T06:30:00Z"), reinforcement = true),
                        review("yesterday", start.minusNanos(1)),
                    ),
            )
        val stats = learningStats(state, now)
        assertEquals(3, stats.todayAnswers)
        assertEquals(2, stats.todayUniqueCards)
        assertEquals(2, stats.streak)
    }
}
