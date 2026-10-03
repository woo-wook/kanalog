package com.kanalog.study.infrastructure

import com.kanalog.common.error.ApiFailure
import com.kanalog.study.infrastructure.FsrsAdapter

import io.github.openspacedrepetition.Card
import io.github.openspacedrepetition.Rating
import io.github.openspacedrepetition.Scheduler
import java.time.Instant
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertTrue

/** Regression checks against the pinned java-fsrs 1.0.0 public API. */
class FsrsAdapterTest {
    private val adapter = FsrsAdapter()
    private val reference = Scheduler.builder().enableFuzzing(false).build()
    private val reviewTime = Instant.parse("2050-01-01T12:00:00Z")

    @Test
    fun `all four API ratings map to the official scheduler result`() {
        val initial = Card.builder().build().toJson()
        val dueByRating = mutableMapOf<String, Instant>()

        for (ratingName in listOf("AGAIN", "HARD", "GOOD", "EASY")) {
            val expected = reference.reviewCard(
                Card.fromJson(initial), Rating.valueOf(ratingName), reviewTime,
            ).card()
            val (storedJson, due) = adapter.review(initial, ratingName, reviewTime)

            assertEquals(expected.toJson(), storedJson, "$ratingName must keep every FSRS card field")
            assertEquals(expected.due, due, "$ratingName must use the scheduler due time")
            dueByRating[ratingName] = due
        }

        // The library's default learning steps are 1 and 10 minutes.
        assertEquals(reviewTime.plusSeconds(60), dueByRating["AGAIN"])
        assertEquals(reviewTime.plusSeconds(600), dueByRating["GOOD"])
        assertTrue(dueByRating.getValue("AGAIN") < dueByRating.getValue("HARD"))
        assertTrue(dueByRating.getValue("HARD") < dueByRating.getValue("GOOD"))
        assertTrue(dueByRating.getValue("GOOD") < dueByRating.getValue("EASY"))
    }

    @Test
    fun `persisted card JSON restores the full state for the next review`() {
        val initial = Card.builder().build().toJson()
        val (savedJson, firstDue) = adapter.review(initial, "GOOD", reviewTime)
        val restored = Card.fromJson(savedJson)
        assertEquals(savedJson, restored.toJson())

        val nextReviewTime = firstDue.plusSeconds(1)
        val expected = reference.reviewCard(
            Card.fromJson(savedJson), Rating.HARD, nextReviewTime,
        ).card()
        val (nextJson, nextDue) = adapter.review(savedJson, "HARD", nextReviewTime)

        assertEquals(expected.toJson(), nextJson)
        assertEquals(expected.due, nextDue)
        assertEquals(savedJson, restored.toJson(), "review must not mutate the persisted snapshot")
    }

    @Test
    fun `fixed time and disabled fuzzing produce repeatable results`() {
        val initial = Card.builder().build().toJson()
        val first = adapter.review(initial, "EASY", reviewTime)
        val second = adapter.review(initial, "EASY", reviewTime)
        assertEquals(first, second)

        val restoredSettings = Scheduler.fromJson(adapter.settingsJson)
        val expected = restoredSettings.reviewCard(
            Card.fromJson(initial), Rating.EASY, reviewTime,
        ).card()
        assertEquals(expected.toJson(), first.first)
        assertEquals("java-fsrs/1.0.0", adapter.version)
    }

    @Test
    fun `unknown rating is rejected before scheduling`() {
        val failure = assertFailsWith<ApiFailure> {
            adapter.review(null, "알 수 없음", reviewTime)
        }
        assertEquals("BAD_RATING", failure.code)
    }
}
