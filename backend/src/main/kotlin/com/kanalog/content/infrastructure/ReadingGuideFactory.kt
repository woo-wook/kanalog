package com.kanalog.content.infrastructure

import com.atilika.kuromoji.ipadic.Tokenizer
import com.kanalog.content.domain.HangulPronunciation
import com.kanalog.content.domain.KanaAlignment
import com.kanalog.content.domain.ReadingGuide
import com.kanalog.content.domain.ReadingSegment
import com.kanalog.content.domain.VerbConjugation
import com.kanalog.content.domain.VerbConjugator
import org.springframework.stereotype.Component
import tools.jackson.databind.JsonNode

/** Source readings override dictionary guesses. No raw HTML is rendered by clients. */
@Component
class ReadingGuideFactory {
    private val tokenizer by lazy { Tokenizer() }

    fun verb(
        front: String,
        reading: String?,
        partOfSpeech: String?,
        kind: String,
    ): VerbConjugation? {
        if (kind != "vocabulary") return null
        if (!partOfSpeech.isNullOrBlank()) return VerbConjugator.generate(front, reading, partOfSpeech)
        VerbConjugator.generate(front, reading, null)?.let { return it }
        if (front.isBlank() || front.length > 128) return null
        val token = tokenizer.tokenize(front).singleOrNull() ?: return null
        if (token.surface != front || !token.isKnown) return null
        val dictionaryReading = KanaAlignment.hiragana(token.reading)
        if (!KanaAlignment.isKana(dictionaryReading)) return null
        if (!reading.isNullOrBlank() && KanaAlignment.hiragana(reading) != dictionaryReading) return null
        val pos =
            when {
                token.partOfSpeechLevel1 == "名詞" && token.partOfSpeechLevel2 == "サ変接続" -> "명사 · サ변동사"
                token.partOfSpeechLevel1 != "動詞" || token.baseForm != front -> return null
                token.conjugationType.startsWith("五段") -> "5단동사"
                token.conjugationType.startsWith("一段") -> "1단동사"
                token.conjugationType.startsWith("サ変") -> "サ변동사"
                token.conjugationType.startsWith("カ変") -> "カ변동사"
                else -> return null
            }
        return VerbConjugator.generate(front, dictionaryReading, pos)
    }

    fun sourceSegments(
        node: JsonNode?,
        text: String,
    ): List<ReadingSegment>? {
        if (node == null || !node.isArray || node.size() !in 1..512 || text.length > 4096) return null
        val segments =
            (0 until node.size()).map { index ->
                val part = node.get(index)
                if (!part.path("text").isString || part.path("text").asString().isEmpty()) return null
                val readingNode = part.path("reading")
                if (!readingNode.isMissingNode && !readingNode.isNull && !readingNode.isString) return null
                val reading = readingNode.takeIf { it.isString }?.asString()
                if (reading != null && (reading.length > 512 || !KanaAlignment.isKana(reading))) return null
                ReadingSegment(part.path("text").asString(), reading?.let(KanaAlignment::hiragana))
            }
        return segments.takeIf { it.joinToString("") { s -> s.text } == text }
    }

    fun create(
        text: String?,
        reading: String? = null,
        manualHangul: String? = null,
        original: JsonNode? = null,
        sentence: Boolean = false,
    ): ReadingGuide? {
        if (text.isNullOrBlank() || text.length > 4096) return null
        val source = sourceSegments(original, text)
        val hasSuppliedReading = reading != null && KanaAlignment.isKana(reading)
        val supplied = reading?.takeIf(KanaAlignment::isKana)?.let { KanaAlignment.align(text, it) }
        val tokens =
            if (sentence ||
                (source == null && supplied == null && KanaAlignment.hasKanji(text)) ||
                source?.any { it.reading == null && KanaAlignment.hasKanji(it.text) } == true
            ) {
                tokenizer.tokenize(text)
            } else {
                emptyList()
            }
        val dictionary =
            if (source == null && supplied == null && !hasSuppliedReading) {
                tokens
                    .flatMap { token ->
                        if (token.reading != "*" && KanaAlignment.isKana(token.reading)) {
                            KanaAlignment.align(token.surface, token.reading) ?: listOf(ReadingSegment(token.surface))
                        } else {
                            listOf(ReadingSegment(token.surface))
                        }
                    }.takeIf { it.isNotEmpty() && it.joinToString("") { s -> s.text } == text }
            } else {
                null
            }
        val segments =
            source?.let { originalSegments ->
                var offset = 0
                originalSegments.flatMap { segment ->
                    val start = offset
                    offset += segment.text.length
                    if (segment.reading != null || !KanaAlignment.hasKanji(segment.text)) {
                        listOf(segment)
                    } else {
                        // Only complete tokens inside an unannotated span may supply a reading.
                        val result = mutableListOf<ReadingSegment>()
                        var cursor = start
                        tokens.filter { it.position >= start && it.position + it.surface.length <= offset }.forEach { token ->
                            if (token.position > cursor) result += ReadingSegment(text.substring(cursor, token.position))
                            result +=
                                if (token.reading != "*" && KanaAlignment.isKana(token.reading)) {
                                    KanaAlignment.align(token.surface, token.reading) ?: listOf(ReadingSegment(token.surface))
                                } else {
                                    listOf(ReadingSegment(token.surface))
                                }
                            cursor = token.position + token.surface.length
                        }
                        if (cursor < offset) result += ReadingSegment(text.substring(cursor, offset))
                        result
                    }
                }
            } ?: supplied ?: dictionary ?: listOf(ReadingSegment(text))
        val particles =
            tokens.filter { it.partOfSpeechLevel1 == "助詞" && it.surface in listOf("は", "へ", "を") }.associate {
                it.position to
                    KanaAlignment.hiragana(it.pronunciation)
            }
        var offset = 0
        val vowelBreaks = mutableSetOf<Int>()
        var readingOffset = 0
        val pronunciation =
            segments.joinToString("") { segment ->
                val start = offset
                offset += segment.text.length
                vowelBreaks += readingOffset
                val value =
                    KanaAlignment.hiragana(
                        segment.reading ?: segment.text
                            .mapIndexed { index, char ->
                                if (particles.containsKey(start + index)) vowelBreaks += readingOffset + index + 1
                                particles[start + index] ?: char.toString()
                            }.joinToString(""),
                    )
                readingOffset += value.length
                value
            }
        val automatic =
            HangulPronunciation.guide(
                if (source == null && supplied == null && hasSuppliedReading) reading.orEmpty() else pronunciation,
                if (source == null && supplied == null && hasSuppliedReading) emptySet() else vowelBreaks,
            )
        val hangul = manualHangul?.takeIf { it.isNotBlank() } ?: automatic.text
        return ReadingGuide(
            segments,
            when {
                source != null -> "ORIGINAL"
                hasSuppliedReading -> "READING"
                dictionary != null -> "DICTIONARY"
                else -> "NONE"
            },
            hangul,
            if (hangul ==
                null
            ) {
                null
            } else if (!manualHangul.isNullOrBlank()) {
                "MANUAL"
            } else {
                "APPROXIMATE"
            },
            if (!manualHangul.isNullOrBlank()) "COMPLETE" else automatic.status,
        )
    }
}
