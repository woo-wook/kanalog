package com.kanalog.core

data class GrammarTopic(
    val title: String,
    val paragraphs: List<String>,
)

data class GrammarAnswer(
    val example: String,
    val translation: String,
    val expression: String,
    val topics: List<GrammarTopic>,
)

fun structureGrammarAnswer(
    answer: String?,
    front: String,
): GrammarAnswer? {
    val lines = answer?.split(Regex("\\n+"))?.map(String::trim)?.filter(String::isNotEmpty) ?: return null
    if (lines.firstOrNull() != front.trim()) return null
    val titles = listOf("뉘앙스", "접속", "헷갈리는 문형")
    val positions = titles.map(lines::indexOf)
    if (positions.first() != 3 || positions.last() >= lines.lastIndex ||
        positions.withIndex().any { (i, position) ->
            position < 0 || lines.count { it == titles[i] } != 1 ||
                (i > 0 && position <= positions[i - 1] + 1)
        }
    ) {
        return null
    }
    return GrammarAnswer(
        lines[0],
        lines[1],
        lines[2],
        titles.mapIndexed { i, title ->
            GrammarTopic(
                title,
                lines.subList(
                    positions[i] + 1,
                    positions.getOrNull(i + 1) ?: lines.size,
                ),
            )
        },
    )
}
