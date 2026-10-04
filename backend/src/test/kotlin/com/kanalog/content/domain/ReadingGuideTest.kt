package com.kanalog.content.domain

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Test

class ReadingGuideTest {
    @Test fun `aligns compounds and okurigana without inventing per-kanji readings`() {
        assertEquals(listOf(ReadingSegment("食", "た"), ReadingSegment("べる")), KanaAlignment.align("食べる", "たべる"))
        assertEquals(listOf(ReadingSegment("日本語", "にほんご")), KanaAlignment.align("日本語", "にほんご"))
        assertEquals(listOf(ReadingSegment("お"), ReadingSegment("母", "かあ"), ReadingSegment("さん")), KanaAlignment.align("お母さん", "おかあさん"))
        assertEquals(listOf(ReadingSegment("行", "い"), ReadingSegment("った")), KanaAlignment.align("行った", "いった"))
    }

    @Test fun `ambiguous anchors use known whole reading and invalid inputs have no guide`() {
        assertEquals(listOf(ReadingSegment("甲の乙", "あのいのう")), KanaAlignment.align("甲の乙", "あのいのう"))
        assertNull(KanaAlignment.align("食べる", "たべます"))
        assertNull(KanaAlignment.align("日本", "unknown"))
        assertNull(KanaAlignment.align("字".repeat(513), "あ"))
        assertEquals(listOf(ReadingSegment("カメラ")), KanaAlignment.align("カメラ", "かめら"))
        assertEquals(listOf(ReadingSegment("𠮷", "よし")), KanaAlignment.align("𠮷", "よし"))
    }

    @Test fun `hangul handles mora combinations long vowels gemination and nasal context`() {
        assertEquals("캬쿠", HangulPronunciation.convert("きゃく"))
        assertEquals("코오히이", HangulPronunciation.convert("コーヒー"))
        assertEquals("각코오", HangulPronunciation.convert("がっこう"))
        assertEquals("킷테", HangulPronunciation.convert("きって"))
        assertEquals("킵푸", HangulPronunciation.convert("きっぷ"))
        assertEquals("심분", HangulPronunciation.convert("しんぶん"))
        assertEquals("캉코쿠", HangulPronunciation.convert("かんこく"))
        assertEquals("파아티이", HangulPronunciation.convert("パーティー"))
        assertNull(HangulPronunciation.convert("未知"))
    }
}
