package com.kanalog.curriculum.domain

import com.kanalog.course.domain.CourseView
import com.kanalog.course.domain.LessonView
import com.kanalog.curriculum.domain.CurriculumBuilder
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import java.util.UUID

class CurriculumBuilderTest {
    private fun lesson(
        position: Int,
        optional: Boolean = false,
        total: Int = 5,
        completed: Boolean = false,
        selected: Boolean = false,
        due: Int = 0,
    ) = LessonView(
        UUID.randomUUID(),
        "기존 레슨 $position",
        position,
        optional,
        total,
        if (completed) total else 0,
        if (completed) total else 0,
        due,
        selected,
        completed,
    )

    private fun course(
        kind: String,
        level: String? = null,
        lessons: List<LessonView>,
    ) = CourseView(
        UUID.randomUUID(),
        kind,
        "기존 설명",
        kind,
        level,
        0,
        lessons.sumOf { it.totalCards },
        lessons.sumOf { it.studiedCards },
        lessons.sumOf { it.completedCards },
        lessons.sumOf { it.dueCount },
        lessons,
        null,
    )

    @Test fun `six permanent levels preserve order and do not invent unavailable content`() {
        val result = CurriculumBuilder().build(emptyList())
        assertEquals(listOf("starter", "n5", "n4", "n3", "n2", "n1"), result.levels.map { it.key })
        assertEquals(listOf("왕초보", "입문", "초급", "중급", "중고급", "고급"), result.levels.map { it.title })
        assertTrue(result.levels.all { !it.available && it.units.isEmpty() && !it.completed })
        assertEquals(null, result.recommendedLevelKey)
        assertEquals(null, result.recommendedLessonId)
    }

    @Test fun `kana core precedes optional expansion and progress counts only core`() {
        val kana =
            List(16) { position ->
                lesson(
                    position,
                    optional = position >= 10,
                    total =
                        if (position == 7 ||
                            position == 9
                        ) {
                            3
                        } else if (position == 15) {
                            33
                        } else {
                            5
                        },
                )
            }
        val result =
            CurriculumBuilder().build(
                listOf(
                    course("hiragana", lessons = kana.map { it.copy(id = UUID.randomUUID()) }),
                    course("katakana", lessons = kana),
                ),
            )
        val starter = result.levels.first()
        assertEquals(listOf("hiragana-basic", "katakana-basic", "hiragana-extra", "katakana-extra"), starter.units.map { it.key })
        assertEquals(listOf(46, 46, 58, 58), starter.units.map { it.totalCards })
        assertEquals(
            listOf("히라가나", "가타카나"),
            starter.units.filter { !it.optional }.map { it.title },
        )
        assertEquals(92, starter.totalCards)
        assertEquals(2, starter.totalLessons)
        assertEquals(
            starter.units
                .first()
                .lessons
                .first()
                .id,
            result.recommendedLessonId,
        )
        assertEquals("starter", result.recommendedLevelKey)
        assertTrue(starter.available)
        assertFalse(starter.completed)
        val ids = starter.units.flatMap { it.lessons }.map { it.id }
        assertEquals(4, ids.size)
        assertEquals(ids.size, ids.toSet().size)
        assertEquals(
            listOf(kana.first().id, kana[10].id),
            starter.units
                .filter {
                    it.lessons.first().kind == "katakana"
                }.flatMap { it.lessons }
                .map { it.id },
        )
    }

    @Test fun `MAX units interleave four vocabulary and two grammar lessons without duplication`() {
        val vocabulary = List(8) { lesson(it, total = 20) }
        val grammar = List(4) { lesson(it, total = 5) }
        val result = CurriculumBuilder().build(listOf(course("grammar", "N5", grammar), course("vocabulary", "N5", vocabulary)))
        val level = result.levels[1]
        assertEquals(listOf(6, 6), level.units.map { it.lessons.size })
        assertTrue(
            level.units
                .first()
                .goal
                .contains("단어 4개 레슨"),
        )
        assertTrue(
            level.units
                .first()
                .goal
                .contains("문법 2개 레슨"),
        )
        assertEquals(
            listOf("vocabulary", "vocabulary", "grammar", "vocabulary", "vocabulary", "grammar"),
            level.units.first().lessons.map {
                it.kind
            },
        )
        assertEquals(
            listOf(
                vocabulary[0].id,
                vocabulary[1].id,
                grammar[0].id,
                vocabulary[2].id,
                vocabulary[3].id,
                grammar[1].id,
            ),
            level.units.first().lessons.map {
                it.id
            },
        )
        val ids = level.units.flatMap { it.lessons }.map { it.id }
        assertEquals((vocabulary + grammar).map { it.id }.toSet(), ids.toSet())
        assertEquals(12, ids.size)
        assertEquals(180, level.totalCards)
        assertEquals(12, level.totalLessons)
        assertEquals("n5", result.recommendedLevelKey)
        val grammarOnly = CurriculumBuilder().build(listOf(course("grammar", "N4", grammar))).levels[2]
        assertEquals(listOf(2, 2), grammarOnly.units.map { it.lessons.size })
        assertTrue(grammarOnly.units.flatMap { it.lessons }.all { it.kind == "grammar" })
    }

    @Test fun `unfinished optional kana does not block recommendation of N5 core`() {
        val kana = List(11) { lesson(it, optional = it == 10, completed = it < 10) }
        val next = lesson(0, total = 20)
        val result = CurriculumBuilder().build(listOf(course("katakana", lessons = kana), course("vocabulary", "N5", listOf(next))))
        assertTrue(result.levels.first().completed)
        assertEquals(1, result.levels.first().completedLessons)
        assertEquals(50, result.levels.first().completedCards)
        assertFalse(
            result.levels
                .first()
                .units
                .last()
                .completed,
        )
        assertEquals(next.id, result.recommendedLessonId)
        assertEquals("n5", result.recommendedLevelKey)
    }

    @Test fun `selected available lesson continues when unfinished or due but empty selected lessons are skipped`() {
        val first = lesson(0)
        val chosen = lesson(1, selected = true)
        val result = CurriculumBuilder().build(listOf(course("katakana", lessons = listOf(first, chosen))))
        assertEquals(first.id, result.recommendedLessonId)
        val dueChosen = chosen.copy(completed = true, completedCards = 5, studiedCards = 5, dueCount = 2)
        assertEquals(
            first.id,
            CurriculumBuilder().build(listOf(course("katakana", lessons = listOf(first, dueChosen)))).recommendedLessonId,
        )
        val completedChosen = dueChosen.copy(dueCount = 0)
        assertEquals(
            first.id,
            CurriculumBuilder().build(listOf(course("katakana", lessons = listOf(first, completedChosen)))).recommendedLessonId,
        )
        val emptyChosen = chosen.copy(totalCards = 0)
        val filtered = CurriculumBuilder().build(listOf(course("katakana", lessons = listOf(emptyChosen, first))))
        assertEquals(first.id, filtered.recommendedLessonId)
        assertEquals(1, filtered.levels.first().totalLessons)
    }

    @Test fun `uneven MAX tracks spread lessons across units without trailing missing tracks`() {
        fun units(
            words: Int,
            patterns: Int,
        ) = CurriculumBuilder()
            .build(
                listOf(
                    course("vocabulary", "N4", List(words) { lesson(it) }),
                    course("grammar", "N4", List(patterns) { lesson(it) }),
                ),
            ).levels[2]
            .units
        val n4 = units(44, 13)
        assertEquals(11, n4.size)
        assertTrue(n4.all { unit -> unit.lessons.any { it.kind == "grammar" } })
        assertEquals(listOf(1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 2), n4.map { unit -> unit.lessons.count { it.kind == "grammar" } })
        val n1 = units(158, 86)
        assertEquals(43, n1.size)
        assertTrue(n1.all { unit -> unit.lessons.any { it.kind == "vocabulary" } })
        assertTrue(
            (n4 + n1).all { unit ->
                unit.lessons.count { it.kind == "vocabulary" } <= 4 && unit.lessons.count { it.kind == "grammar" } <= 2
            },
        )
    }

    @Test fun `after core completion optional practice then due review remains available`() {
        val practiced = lesson(0, completed = true, due = 3)
        val extra = lesson(10, optional = true)
        val optional = CurriculumBuilder().build(listOf(course("katakana", lessons = listOf(practiced, extra))))
        assertEquals(extra.id, optional.recommendedLessonId)
        assertEquals(3, optional.levels.first().dueCount)
        val due = CurriculumBuilder().build(listOf(course("katakana", lessons = listOf(practiced, extra.copy(completed = true)))))
        assertEquals(practiced.id, due.recommendedLessonId)
        val empty = CurriculumBuilder().build(listOf(course("katakana", lessons = listOf(lesson(0, total = 0)))))
        assertFalse(empty.levels.first().available)
        assertFalse(empty.levels.first().completed)
        assertEquals(0, empty.levels.first().totalLessons)
        assertEquals(null, empty.recommendedLessonId)
    }
}
