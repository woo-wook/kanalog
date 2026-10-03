package com.kanalog.domain

import com.kanalog.common.error.ApiFailure
import com.kanalog.content.domain.GrammarFocus
import com.kanalog.content.domain.HighlightSegment
import com.kanalog.content.domain.PersonalNote
import com.kanalog.course.domain.CoursePlan
import com.kanalog.course.domain.ImportedDeck
import com.kanalog.imports.domain.MaxImportPolicy
import com.kanalog.media.domain.ByteRanges
import com.kanalog.progress.domain.LearningStreak
import com.kanalog.settings.domain.AudioPreferences
import com.kanalog.speech.domain.SpeechInput
import com.kanalog.study.domain.ReviewState
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertThrows
import org.junit.jupiter.api.Test
import java.time.Instant
import java.time.LocalDate
import java.util.UUID

class DomainPolicyTest {
    @Test fun `review state rejects stale and early submissions but accepts due boundary and new cards`() {
        val now = Instant.parse("2026-10-03T00:00:00Z")
        val state = ReviewState(UUID.randomUUID(), null, 7, now.minusSeconds(60), now)
        state.requireReviewable(7, now)
        assertEquals("STALE_CARD", assertThrows(ApiFailure::class.java) { state.requireReviewable(6, now) }.code)
        assertEquals(
            "CARD_NOT_DUE",
            assertThrows(ApiFailure::class.java) { state.copy(dueAt = now.plusSeconds(1)).requireReviewable(7, now) }.code,
        )
        assertEquals("CARD_NOT_DUE", assertThrows(ApiFailure::class.java) { state.copy(dueAt = null).requireReviewable(7, now) }.code)
        state.copy(firstSeen = null, dueAt = null).requireReviewable(7, now)
    }

    @Test fun `personal content normalizes whitespace and requires all three vocabulary fields`() {
        assertEquals(PersonalNote("猫", "ねこ", "고양이"), PersonalNote.of(" 猫 ", " ねこ ", " 고양이 "))
        assertEquals("BAD_NOTE", assertThrows(ApiFailure::class.java) { PersonalNote.of("猫", null, "고양이") }.code)
    }

    @Test fun `grammar focus cannot highlight different text or mislabel the actual highlighted expression`() {
        val segments = listOf(HighlightSegment("あの", true), HighlightSegment("かばんです。", false))
        val focus = GrammarFocus("あの", segments)
        assertEquals(focus, focus.requireMatches("あのかばんです。"))
        assertThrows(IllegalStateException::class.java) { focus.requireMatches("このかばんです。") }
        assertThrows(IllegalStateException::class.java) { focus.copy(title = "저~").requireMatches("あのかばんです。") }
    }

    @Test fun `course plan preserves source order keys and exact vocabulary and grammar chunk boundaries`() {
        val words = (1..41).map { UUID.randomUUID() }
        val grammar = (1..6).map { UUID.randomUUID() }
        val plan =
            CoursePlan.build(
                listOf(
                    ImportedDeck(UUID.randomUUID(), "vocabulary", "N5", words),
                    ImportedDeck(UUID.randomUUID(), "grammar", "N5", grammar),
                ),
            )
        assertEquals(listOf("hiragana", "katakana"), plan.kana.map { it.kind })
        assertEquals(listOf(20, 20, 1), plan.imported[0].lessons.map { it.cards.size })
        assertEquals(words, plan.imported[0].lessons.flatMap { it.cards })
        assertEquals(listOf(5, 1), plan.imported[1].lessons.map { it.cards.size })
        assertEquals(listOf("chunk:0", "chunk:1"), plan.imported[1].lessons.map { it.key })
        assertEquals(
            "2단계 · 문법 6–6",
            plan.imported[1]
                .lessons
                .last()
                .title,
        )
        assertEquals(listOf(2, 3), plan.imported.map { it.position })
        assertEquals(104, plan.kana[0].lessons.sumOf { it.characters.size })
        assertEquals(104, plan.kana[1].lessons.sumOf { it.characters.size })
        assertEquals(
            "ア",
            plan.kana[1]
                .lessons[0]
                .characters[0]
                .glyph,
        )
    }

    @Test fun `streak includes yesterday when today has no answers and breaks at a missing day`() {
        val today = LocalDate.of(2026, 10, 3)
        assertEquals(0, LearningStreak.count(emptySet(), today))
        assertEquals(2, LearningStreak.count(setOf(today.minusDays(1), today.minusDays(2)), today))
        assertEquals(1, LearningStreak.count(setOf(today, today.minusDays(2)), today))
        assertEquals(0, LearningStreak.count(setOf(today.plusDays(1)), today))
    }

    @Test fun `media accepts valid bounded suffix and open byte ranges and rejects malformed values`() {
        assertEquals(2L to 4L, ByteRanges.parse("bytes=2-4", 10))
        assertEquals(7L to 9L, ByteRanges.parse("bytes=-3", 10))
        assertEquals(0L to 9L, ByteRanges.parse("bytes=-100", 10))
        assertEquals(2L to 9L, ByteRanges.parse("bytes=2-", 10))
        assertEquals(2L to 9L, ByteRanges.parse("bytes=2-100", 10))
        listOf("bytes=-0", "bytes=10-", "bytes=4-2", "bytes=0-1,3-4", "bytes=-", "bytes=999999999999999999999999-", "bad").forEach {
            assertNull(ByteRanges.parse(it, 10), it)
        }
    }

    @Test fun `audio preferences and synthesis input reject unsupported options`() {
        AudioPreferences(1.0, "SUPERTONIC", "F1", "Asia/Seoul")
        assertEquals("BAD_SETTING", assertThrows(ApiFailure::class.java) { AudioPreferences(2.1, "SUPERTONIC", "F1", "Asia/Seoul") }.code)
        assertEquals("BAD_AUDIO_ENGINE", assertThrows(ApiFailure::class.java) { AudioPreferences(1.0, "UNKNOWN", "F1", "Asia/Seoul") }.code)
        assertEquals("BAD_TIMEZONE", assertThrows(ApiFailure::class.java) { AudioPreferences(1.0, "ORIGINAL", "F1", "Unknown") }.code)
        assertEquals(
            "BAD_SUPERTONIC_VOICE",
            assertThrows(ApiFailure::class.java) { AudioPreferences(1.0, "DEVICE", "F6", "Asia/Seoul") }.code,
        )
        assertThrows(ApiFailure::class.java) { SpeechInput(" ", "F1") }
        assertThrows(ApiFailure::class.java) { SpeechInput("あ", "M6") }
    }

    @Test fun `import source and supported directions remain pinned to verified MAX data`() {
        MaxImportPolicy.requireSupportedSource(MaxImportPolicy.VERSION, MaxImportPolicy.CHECKSUM)
        MaxImportPolicy.requireSupportedCard("grammar", "recall")
        assertThrows(IllegalStateException::class.java) { MaxImportPolicy.requireSupportedSource("2.1.3", MaxImportPolicy.CHECKSUM) }
        assertThrows(IllegalStateException::class.java) { MaxImportPolicy.requireSupportedCard("grammar", "script") }
    }
}
