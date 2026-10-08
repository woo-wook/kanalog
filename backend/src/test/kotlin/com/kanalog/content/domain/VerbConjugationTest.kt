package com.kanalog.content.domain

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Test
import tools.jackson.databind.json.JsonMapper
import java.nio.file.Files
import java.nio.file.Path

class VerbConjugationTest {
    @Test fun `all verb groups and irregulars agree with shared independently written examples`() {
        val rows =
            JsonMapper
                .builder()
                .build()
                .readTree(Files.readString(Path.of("../native/shared/verb-fixtures.json")))
                .path("cases")
        for (row in rows) {
            val front = row.path("front").asString()
            val actual =
                VerbConjugator.generate(
                    front,
                    row.path("reading").asString(),
                    row.path("partOfSpeech").takeIf { it.isString }?.asString(),
                )
            if (row.path("verbClass").isNull) {
                assertNull(actual, front)
                continue
            }
            assertNotNull(actual, front)
            assertEquals(row.path("verbClass").asString(), actual!!.verbClass, front)
            assertEquals(row.path("formCount").asInt(), actual.forms.size, front)
            for ((key, expected) in row.path("expected").properties()) {
                val form = actual.forms.single { it.key == key }
                assertEquals(expected.path("japanese").asString(), form.japanese, "$front/$key")
                assertEquals(expected.path("reading").asString(), form.reading, "$front/$key")
                if (expected.path("hangul").isString) {
                    assertEquals(expected.path("hangul").asString(), form.readingGuide.hangul, "$front/$key/hangul")
                }
            }
            for (key in row.path("absent")) assertNull(actual.forms.firstOrNull { it.key == key.asString() }, front)
        }
    }

    @Test fun `godan produces complete grouped forms with correct readings and changed endings`() {
        val table = VerbConjugator.generate("書く", "かく", "5단동사 · 타동사")!!
        assertEquals("GODAN", table.verbClass)
        assertEquals(21, table.forms.size)
        assertEquals("", table.forms.single { it.key == "dictionary" }.suffix)
        assertEquals("書いて", table.forms.single { it.key == "te" }.japanese)
        assertEquals("かいて", table.forms.single { it.key == "te" }.reading)
        assertEquals("書かせられる", table.forms.single { it.key == "causativePassive" }.japanese)
        table.forms.forEach {
            assertEquals(it.japanese, it.stem + it.suffix)
            assertEquals(it.japanese, it.readingGuide.segments.joinToString("") { segment -> segment.text })
            assertNotNull(it.readingGuide.hangul)
        }
    }
}
