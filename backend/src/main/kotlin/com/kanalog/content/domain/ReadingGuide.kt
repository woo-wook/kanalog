package com.kanalog.content.domain

import java.text.Normalizer

data class ReadingSegment(
    val text: String,
    val reading: String? = null,
)

data class ReadingGuide(
    val segments: List<ReadingSegment>,
    val source: String,
    val hangul: String? = null,
    val hangulSource: String? = null,
    val hangulStatus: String = if (hangul == null) "UNAVAILABLE" else "COMPLETE",
)

/** Kana anchors constrain kanji blocks; ambiguous splits retain the supplied whole reading. */
object KanaAlignment {
    fun hiragana(text: String): String =
        Normalizer
            .normalize(text, Normalizer.Form.NFKC)
            .map {
                if (it in
                    'ァ'..'ヶ'
                ) {
                    (it.code - 0x60).toChar()
                } else {
                    it
                }
            }.joinToString("")

    fun isKana(text: String): Boolean = text.isNotEmpty() && hiragana(text).all { it in 'ぁ'..'ゖ' || it == 'ー' }

    fun hasKanji(text: String): Boolean =
        text.codePoints().anyMatch {
            Character.UnicodeScript.of(it) == Character.UnicodeScript.HAN ||
                it == '々'.code
        }

    fun align(
        text: String,
        reading: String,
    ): List<ReadingSegment>? {
        if (text.isBlank() || text.length > 512 || reading.length > 512 || !isKana(reading)) return null
        val kana = hiragana(reading)
        val groups = mutableListOf<String>()
        text.codePoints().forEach { point ->
            val value = String(Character.toChars(point))
            if (groups.isNotEmpty() && hasKanji(groups.last()) == hasKanji(value)) groups[groups.lastIndex] += value else groups += value
        }
        var budget = 20_000
        var exhausted = false
        val memo = mutableMapOf<Pair<Int, Int>, List<List<ReadingSegment>>>()

        fun solve(
            index: Int,
            offset: Int,
        ): List<List<ReadingSegment>> =
            memo.getOrPut(index to offset) {
                if (--budget < 0) {
                    exhausted = true
                    return@getOrPut emptyList()
                }
                if (index == groups.size) return@getOrPut if (offset == kana.length) listOf(emptyList()) else emptyList()
                val group = groups[index]
                if (!hasKanji(group)) {
                    val anchor = hiragana(group)
                    if (!kana.startsWith(anchor, offset)) {
                        emptyList()
                    } else {
                        solve(index + 1, offset + anchor.length).map {
                            listOf(ReadingSegment(group)) +
                                it
                        }
                    }
                } else {
                    val matches = mutableListOf<List<ReadingSegment>>()
                    for (end in offset + 1..kana.length) {
                        if (--budget < 0) {
                            exhausted = true
                            return@getOrPut emptyList()
                        }
                        if (kana[end - 1] in "ゃゅょぁぃぅぇぉ" && end - offset == 1) continue
                        if (end < kana.length && kana[end] in "ゃゅょぁぃぅぇぉ") continue
                        for (tail in solve(index + 1, end)) {
                            matches += listOf(ReadingSegment(group, kana.substring(offset, end))) + tail
                            if (matches.size == 2) return@getOrPut matches
                        }
                    }
                    matches
                }
            }
        val matches = solve(0, 0)
        if (exhausted) return null
        return when (matches.size) {
            0 -> null
            1 -> matches.single()
            else -> listOf(ReadingSegment(text, kana))
        }
    }
}
