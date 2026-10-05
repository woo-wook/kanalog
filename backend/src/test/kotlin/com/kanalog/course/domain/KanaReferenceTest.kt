package com.kanalog.course.domain

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test

class KanaReferenceTest {
    @Test fun `reference pairs reuse every study character once across the four categories`() {
        val reference = KanaInventory.reference()
        assertEquals(listOf("basic", "voiced", "semiVoiced", "yoon"), reference.map { it.key })
        assertEquals(listOf(46, 20, 5, 33), reference.map { group -> group.rows.sumOf { it.characters.size } })
        val pairs = reference.flatMap { it.rows }.flatMap { it.characters }
        val courses = KanaInventory.courses()
        assertEquals(courses[0].lessons.flatMap { it.characters }.map { it.glyph }, pairs.map { it.hiragana })
        assertEquals(courses[1].lessons.flatMap { it.characters }.map { it.glyph }, pairs.map { it.katakana })
        assertEquals(104, pairs.map { it.hiragana }.distinct().size)
        assertEquals("n", pairs.single { it.hiragana == "ん" }.romaji)
    }
}
