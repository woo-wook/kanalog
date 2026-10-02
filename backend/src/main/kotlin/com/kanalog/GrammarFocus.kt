package com.kanalog

import tools.jackson.databind.JsonNode

data class HighlightSegment(val text:String,val highlighted:Boolean)
data class GrammarFocus(val title:String,val segments:List<HighlightSegment>)

fun convertedGrammarFocus(row:JsonNode,front:String):GrammarFocus? {
    val focus=row.path("grammarFocus")
    if(focus.isMissingNode || focus.isNull) return null
    check(focus.isObject) { "Invalid converted grammar focus" }
    val title=focus.path("title").asString("")
    val parts=focus.path("segments")
    check(title.length in 1..200 && parts.isArray && parts.size() in 1..100) { "Invalid converted grammar focus" }
    val segments=(0 until parts.size()).map { index ->
        val part=parts.get(index)
        val text=part.path("text").asString("")
        check(text.isNotEmpty() && part.path("highlighted").isBoolean) { "Invalid converted grammar segment" }
        HighlightSegment(text,part.path("highlighted").asBoolean())
    }
    check(segments.joinToString("") {it.text}==front) { "Grammar highlight text differs from front" }
    check(segments.filter {it.highlighted}.map {it.text.trim()}.filter {it.isNotEmpty()}.joinToString(" … ")==title) { "Grammar title differs from highlighted text" }
    return GrammarFocus(title,segments)
}
