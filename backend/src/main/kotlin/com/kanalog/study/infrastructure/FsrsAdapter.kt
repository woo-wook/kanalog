package com.kanalog.study.infrastructure

import com.kanalog.common.error.fail
import com.kanalog.study.application.port.out.ReviewScheduler
import io.github.openspacedrepetition.Card
import io.github.openspacedrepetition.Rating
import io.github.openspacedrepetition.Scheduler
import java.time.Instant
import org.springframework.stereotype.Service

@Service
class FsrsAdapter : ReviewScheduler {
    override fun due(json: String): Instant = Card.fromJson(json).due

    // Pinned java-fsrs 1.0.0, deterministic scheduling for repeatable previews and tests.
    private val scheduler = Scheduler.builder().enableFuzzing(false).build()
    override val version = "java-fsrs/1.0.0"
    override val settingsJson: String = scheduler.toJson()
    override fun review(json: String?, rating: String, now: Instant): Pair<String, Instant> {
        val enumRating = try { Rating.valueOf(rating) } catch (_: Exception) { fail("BAD_RATING","평가를 확인하세요") }
        val card = json?.let(Card::fromJson) ?: Card.builder().build()
        val next = scheduler.reviewCard(card, enumRating, now).card()
        return next.toJson() to next.due
    }
}
