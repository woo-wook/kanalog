package com.kanalog.content.infrastructure

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Test
import tools.jackson.databind.json.JsonMapper

class ReadingGuideFactoryTest {
    private val factory = ReadingGuideFactory()
    private val mapper = JsonMapper.builder().build()

    @Test fun `verb inference requires exact dictionary base and source class overrides ending guesses`() {
        assertEquals("GODAN", factory.verb("帰る", "かえる", "5단동사", "vocabulary")!!.verbClass)
        assertEquals("ICHIDAN", factory.verb("食べる", "たべる", null, "vocabulary")!!.verbClass)
        assertEquals("SURU", factory.verb("勉強", "べんきょう", null, "vocabulary")!!.verbClass)
        assertNull(factory.verb("食べます", "たべます", null, "vocabulary"))
        assertNull(factory.verb("椅子", "いす", null, "vocabulary"))
        assertNull(factory.verb("食べる", "たべます", null, "vocabulary"))
        assertNull(factory.verb("書く", "かく", "명사", "vocabulary"))
        assertNull(factory.verb("来る", "くる", "カ변동사", "grammar"))
    }

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

    @Test fun `fills missing source readings without changing original ruby or the base sentence`() {
        val raw = mapper.readTree("""[{"text":"日本","reading":"にっぽん"},{"text":"の学校へ行く。"}]""")
        val guide = factory.create("日本の学校へ行く。", original = raw, sentence = true)!!
        assertEquals("ORIGINAL", guide.source)
        assertEquals("にっぽん", guide.segments.first().reading)
        assertEquals("日本の学校へ行く。", guide.segments.joinToString("") { it.text })
        assertEquals("닙폰노각코오에이쿠。", guide.hangul)
    }

    @Test fun `pronunciation continues across ruby boundaries rather than converting each piece alone`() {
        val raw = mapper.readTree("""[{"text":"新","reading":"しん"},{"text":"聞","reading":"ぶん"}]""")
        assertEquals("심분", factory.create("新聞", original = raw)!!.hangul)
    }
}
