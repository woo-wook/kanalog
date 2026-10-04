package com.kanalog.content.infrastructure

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Test
import tools.jackson.databind.json.JsonMapper

class ReadingGuideFactoryTest {
    private val factory = ReadingGuideFactory()
    private val mapper = JsonMapper.builder().build()

    @Test fun `source ruby wins over dictionary with strict base match and manual hint priority`() {
        val raw = mapper.readTree("""[{"text":"日本","reading":"にっぽん"}]""")
        val guide = factory.create("日本", "にほん", "직접 입력", raw)!!
        assertEquals("にっぽん", guide.segments.single().reading)
        assertEquals("직접 입력", guide.hangul)
        assertEquals("MANUAL", guide.hangulSource)
        assertNull(factory.sourceSegments(raw, "中国"))
        assertNull(factory.sourceSegments(mapper.readTree("""[{"text":"日本","reading":"<script>"}]"""), "日本"))
    }

    @Test fun `mismatched anchors never replace the supplied reading with a dictionary guess`() {
        val guide = factory.create("食べる", "たべます")!!
        assertEquals("READING", guide.source)
        assertNull(guide.segments.single().reading)
        assertEquals("타베마스", guide.hangul)
    }

    @Test fun `dictionary readings handle sentence particles and keep unknown characters unannotated`() {
        val guide = factory.create("私は学校へ行く。", sentence = true)!!
        assertEquals("DICTIONARY", guide.source)
        assertEquals("와타시와각코오에이쿠。", guide.hangul)
        assertEquals("私は学校へ行く。", guide.segments.joinToString("") { it.text })
        assertNull(factory.create("𠮷𠮷XYZ")!!.hangul)
    }
}
