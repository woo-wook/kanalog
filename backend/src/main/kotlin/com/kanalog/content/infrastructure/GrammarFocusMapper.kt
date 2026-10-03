package com.kanalog.content.infrastructure

import com.kanalog.content.domain.GrammarFocus
import com.kanalog.content.domain.HighlightSegment
import tools.jackson.databind.JsonNode

fun convertedGrammarFocus(
    row: JsonNode,
    front: String,
): GrammarFocus? {
    val focus = row.path("grammarFocus")
    if (focus.isMissingNode || focus.isNull) return null
    check(focus.isObject) { "Invalid converted grammar focus" }
    val title = focus.path("title").asString("")
    val parts = focus.path("segments")
    check(title.length in 1..200 && parts.isArray && parts.size() in 1..100) { "Invalid converted grammar focus" }
    val segments =
        (0 until parts.size()).map { index ->
            val part = parts.get(index)
            val text = part.path("text").asString("")
            check(text.isNotEmpty() && part.path("highlighted").isBoolean) { "Invalid converted grammar segment" }
            HighlightSegment(text, part.path("highlighted").asBoolean())
        }
    return GrammarFocus(title, segments).requireMatches(front)
}
