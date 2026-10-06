package com.kanalog.tools

import com.kanalog.content.domain.HangulPronunciation
import com.kanalog.content.domain.KanaAlignment
import org.junit.jupiter.api.Test
import tools.jackson.databind.json.JsonMapper
import java.nio.file.Files
import java.nio.file.Path
import kotlin.test.assertEquals

class NativeReadingParityTest {
    @Test
    fun `web domain obeys shared native pronunciation and alignment vectors`() {
        val fixture = JsonMapper.builder().build().readTree(Files.readString(Path.of("../native/shared/reading-fixtures.json")))
        val hints = fixture.path("hangul")
        for (index in 0 until hints.size()) {
            val row = hints.get(index)
            val result = HangulPronunciation.guide(row.path("reading").asString())
            assertEquals(row.path("text").takeIf { it.isString }?.asString(), result.text)
            assertEquals(row.path("status").asString(), result.status)
        }
        val alignments = fixture.path("alignment")
        for (index in 0 until alignments.size()) {
            val row = alignments.get(index)
            val result = KanaAlignment.align(row.path("text").asString(), row.path("reading").asString())
            assertEquals(row.path("segments").toString(), JsonMapper.builder().build().writeValueAsString(result))
        }
    }
}
