package com.kanalog.content.infrastructure

import com.atilika.kuromoji.ipadic.Tokenizer
import com.kanalog.content.domain.HangulPronunciation
import com.kanalog.content.domain.KanaAlignment
import com.kanalog.content.domain.ReadingGuide
import com.kanalog.content.domain.ReadingSegment
import org.springframework.stereotype.Component
import tools.jackson.databind.JsonNode

/** Source readings override dictionary guesses. No raw HTML is rendered by clients. */
@Component
class ReadingGuideFactory {
    private val tokenizer by lazy { Tokenizer() }

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
                (source == null && supplied == null && KanaAlignment.hasKanji(text))
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
        val segments = source ?: supplied ?: dictionary ?: listOf(ReadingSegment(text))
        val particles =
            tokens.filter { it.partOfSpeechLevel1 == "助詞" && it.surface in listOf("は", "へ", "を") }.associate {
                it.position to
                    KanaAlignment.hiragana(it.pronunciation)
            }
        var offset = 0
        val pieces =
            segments.map { segment ->
                val start = offset
                offset += segment.text.length
                if (segment.reading == null && segment.text.isBlank()) {
                    segment.text
                } else {
                    HangulPronunciation.convert(
                        segment.reading
                            ?: segment.text.mapIndexed { index, char -> particles[start + index] ?: char.toString() }.joinToString(""),
                    )
                }
            }
        val hangul =
            manualHangul?.takeIf { it.isNotBlank() }
                ?: if (source == null && supplied == null && hasSuppliedReading) {
                    HangulPronunciation.convert(reading.orEmpty())
                } else if (pieces.any { it == null }) {
                    null
                } else {
                    pieces.joinToString("") { it.orEmpty() }
                }
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
        )
    }
}
