package com.kanalog.content.domain

data class GrammarFocus(val title: String, val segments: List<HighlightSegment>) {
    fun requireMatches(front: String): GrammarFocus {
        check(title.length in 1..200 && segments.size in 1..100) { "Invalid converted grammar focus" }
        check(segments.all { it.text.isNotEmpty() }) { "Invalid converted grammar segment" }
        check(segments.joinToString("") { it.text } == front) { "Grammar highlight text differs from front" }
        check(segments.filter { it.highlighted }.map { it.text.trim() }.filter { it.isNotEmpty() }.joinToString(" … ") == title) {
            "Grammar title differs from highlighted text"
        }
        return this
    }
}
