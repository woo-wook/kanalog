package com.kanalog.tools

import org.junit.jupiter.api.Test
import tools.jackson.databind.json.JsonMapper
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertTrue

class NativeContentExporterTest {
    private val mapper = JsonMapper.builder().build()

    @Test
    fun `exports every kana with the same stable identity and category as web`() {
        val notes = NativeContentExporter().builtinNotes()
        assertEquals(208, notes.size)
        assertEquals(208, notes.map { it["id"] }.toSet().size)
        assertEquals(104, notes.count { it["kind"] == "hiragana" })
        assertEquals(92, notes.count { it["group"] == "basic" })
        assertTrue(notes.all { it["readingGuide"] != null })
    }

    @Test
    fun `exports source grammar highlights and reading without revealing invented fields`() {
        val row =
            mapper.readTree(
                """{"schemaVersion":1,"sourceGuid":"synthetic-grammar","cardDirection":"recall",
            "kind":"grammar","level":"N5","front":"水です。","answer":"물입니다.\n접속\n명사 + です",
            "furigana":[{"text":"水","reading":"みず"},{"text":"です。"}],
            "grammarFocus":{"title":"です","segments":[{"text":"水","highlighted":false},
            {"text":"です","highlighted":true},{"text":"。","highlighted":false}]}}""",
            )
        val note = NativeContentExporter().convert(row, emptyMap())
        assertEquals("max:synthetic-grammar:recall", note["id"])
        assertEquals("물입니다.\n접속\n명사 + です", note["meaning"])
        assertTrue(note["grammarFocus"] != null)
        assertTrue(note["readingGuide"] != null)
        assertEquals(null, note["audio"])
    }

    @Test
    fun `rejects missing audio rather than silently losing original recording`() {
        val row =
            mapper.readTree(
                """{"schemaVersion":1,"sourceGuid":"synthetic-word","cardDirection":"recognition",
            "kind":"vocabulary","front":"水","reading":"みず","meaning":"물","wordAudio":"missing.mp3"}""",
            )
        assertFailsWith<IllegalStateException> { NativeContentExporter().convert(row, emptyMap()) }
    }
}
