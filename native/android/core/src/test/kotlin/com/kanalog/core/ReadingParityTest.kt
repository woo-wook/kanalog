package com.kanalog.core

import com.kanalog.content.domain.HangulPronunciation
import com.kanalog.content.domain.KanaAlignment
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.int
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import java.io.File
import kotlin.test.Test
import kotlin.test.assertEquals

class ReadingParityTest {
    @Test fun `shared Hangul and kana alignment vectors match web contract`() {
        val fixture = Json.parseToJsonElement(File(System.getProperty("readingFixtureFile")).readText()).jsonObject
        assertEquals(1, fixture.getValue("schemaVersion").jsonPrimitive.int)
        val hangul = fixture.getValue("hangul").jsonArray
        val alignment = fixture.getValue("alignment").jsonArray
        assertEquals(14, hangul.size)
        assertEquals(9, alignment.size)
        hangul.forEach { vector ->
            val row = vector.jsonObject
            val result = HangulPronunciation.guide(row.getValue("reading").jsonPrimitive.content)
            assertEquals(row.getValue("text").jsonPrimitive.contentOrNull, result.text)
            assertEquals(row.getValue("status").jsonPrimitive.content, result.status)
        }
        alignment.forEach { vector ->
            val row = vector.jsonObject
            val expected =
                row.getValue("segments").takeUnless { it == JsonNull }?.jsonArray?.map { segment ->
                    val s = segment.jsonObject
                    ReadingSegment(s.getValue("text").jsonPrimitive.content, s.getValue("reading").jsonPrimitive.contentOrNull)
                }
            val result = KanaAlignment.align(row.getValue("text").jsonPrimitive.content, row.getValue("reading").jsonPrimitive.content)
            assertEquals(expected, result?.map { ReadingSegment(it.text, it.reading) })
        }
    }
}
