package com.kanalog.course.domain

import java.util.UUID

data class ImportedDeck(
    val id: UUID,
    val kind: String,
    val level: String,
    val cards: List<UUID>,
)

data class ImportedLesson(
    val key: String,
    val title: String,
    val position: Int,
    val cards: List<UUID>,
)

data class ImportedCourse(
    val deckId: UUID,
    val key: String,
    val title: String,
    val kind: String,
    val level: String,
    val position: Int,
    val lessons: List<ImportedLesson>,
)

/** Deterministic plan. Keys and input card order preserve lesson/card identities on reimport. */
data class CoursePlan(
    val kana: List<KanaCourse>,
    val imported: List<ImportedCourse>,
) {
    companion object {
        fun build(decks: List<ImportedDeck>): CoursePlan =
            CoursePlan(
                KanaInventory.courses(),
                decks.map { deck ->
                    val grammar = deck.kind == "grammar"
                    val size = if (grammar) 5 else 20
                    val label = if (grammar) "문법" else "단어"
                    val rank = deck.level.removePrefix("N").toIntOrNull() ?: 5
                    ImportedCourse(
                        deck.id,
                        "max:${deck.id}",
                        "${deck.level} $label",
                        deck.kind,
                        deck.level,
                        2 + (5 - rank) * 2 + if (grammar) 1 else 0,
                        deck.cards.chunked(size).mapIndexed { index, cards ->
                            ImportedLesson(
                                "chunk:$index",
                                "${index + 1}단계 · $label ${index * size + 1}–${index * size + cards.size}",
                                index,
                                cards,
                            )
                        },
                    )
                },
            )
    }
}
