package com.kanalog.core

import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.int
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import java.io.File
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import kotlin.test.assertTrue

class VerbConjugationTest {
    private fun assertOptionalHangul(
        expected: JsonObject,
        actual: VerbForm,
    ) {
        if ("hangul" in expected) {
            assertEquals(expected.getValue("hangul").jsonPrimitive.contentOrNull, actual.readingGuide.hangul, "${actual.japanese} Hangul")
        }
    }

    @Test fun `optional Hangul fixture expectations reject incorrect values and allow absent fields`() {
        val panel = assertNotNull(conjugationFor(Note("synthetic:verb", "vocabulary", "書く", reading = "かく", partOfSpeech = "五段動詞")))
        val form = panel.forms.first { it.key == "masu" }
        assertOptionalHangul(Json.parseToJsonElement("{}").jsonObject, form)
        assertOptionalHangul(Json.parseToJsonElement("{\"hangul\":\"카키마스\"}").jsonObject, form)
        assertFailsWith<AssertionError> {
            assertOptionalHangul(Json.parseToJsonElement("{\"hangul\":\"틀린 합성 기대값\"}").jsonObject, form)
        }
    }

    @Test fun `shared verb fixtures preserve every supported form reading and omission`() {
        val fixture = Json.parseToJsonElement(File(System.getProperty("verbFixtureFile")).readText()).jsonObject
        assertEquals(1, fixture.getValue("schemaVersion").jsonPrimitive.int)
        val cases = fixture.getValue("cases").jsonArray
        assertTrue(cases.isNotEmpty())
        cases.forEachIndexed { index, vector ->
            val row = vector.jsonObject
            val front = row.getValue("front").jsonPrimitive.content
            val note =
                Note(
                    "synthetic:verb:$index",
                    "vocabulary",
                    front,
                    reading = row.getValue("reading").jsonPrimitive.contentOrNull,
                    partOfSpeech = row.getValue("partOfSpeech").jsonPrimitive.contentOrNull,
                )
            val panel = conjugationFor(note)
            val expectedClass = row.getValue("verbClass").jsonPrimitive.contentOrNull
            assertEquals(expectedClass, panel?.verbClass, front)
            if (expectedClass == null) {
                assertNull(panel, front)
            } else {
                assertNotNull(panel, front)
                assertEquals(row.getValue("formCount").jsonPrimitive.int, panel.forms.size, front)
                assertEquals(
                    panel.forms.size,
                    panel.forms
                        .map { it.key }
                        .toSet()
                        .size,
                    front,
                )
                val forms = panel.forms.associateBy { it.key }
                row.getValue("expected").jsonObject.forEach { (key, value) ->
                    val expected = value.jsonObject
                    val actual = assertNotNull(forms[key], "$front $key")
                    assertEquals(expected.getValue("japanese").jsonPrimitive.content, actual.japanese, "$front $key")
                    assertEquals(expected.getValue("reading").jsonPrimitive.content, actual.reading, "$front $key")
                    assertOptionalHangul(expected, actual)
                    assertEquals(actual.japanese, actual.stem + actual.suffix, "$front $key accent")
                    assertEquals(actual.japanese, actual.readingGuide.segments.joinToString("") { it.text }, "$front $key ruby")
                    assertTrue(actual.group in setOf("BASIC", "CONNECT", "ADVANCED"))
                }
                row.getValue("absent").jsonArray.forEach { assertNull(forms[it.jsonPrimitive.content], front) }
            }
        }
    }

    @Test fun `verb panel supplies all forms but noun grammar and unknown class stay absent`() {
        val verb = Note("synthetic:verb", "vocabulary", "書く", reading = "かく", partOfSpeech = "五段動詞")
        val panel = assertNotNull(conjugationFor(verb))
        assertEquals("GODAN", panel.verbClass)
        assertEquals(21, panel.forms.size)
        assertEquals(
            21,
            panel.forms
                .map { it.key }
                .toSet()
                .size,
        )
        assertEquals("書く", panel.dictionaryForm)
        assertEquals("かく", panel.dictionaryReading)
        assertNull(conjugationFor(verb.copy(partOfSpeech = "名詞")))
        assertNull(conjugationFor(verb.copy(kind = "grammar")))
        assertNull(conjugationFor(verb.copy(partOfSpeech = null)))
    }
}
