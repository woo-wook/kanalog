package com.kanalog.core

import com.kanalog.content.domain.VerbConjugator

data class VerbForm(
    val key: String,
    val label: String,
    val group: String,
    val description: String,
    val japanese: String,
    val reading: String,
    val stem: String,
    val suffix: String,
    val readingGuide: ReadingGuide,
)

data class VerbConjugationPanel(
    val verbClass: String,
    val classLabel: String,
    val dictionaryForm: String,
    val dictionaryReading: String,
    val rule: String,
    val forms: List<VerbForm>,
)

fun conjugationFor(note: Note): VerbConjugationPanel? {
    if (note.kind != "vocabulary") return null
    val source = VerbConjugator.generate(note.front, note.reading, note.partOfSpeech) ?: return null
    return VerbConjugationPanel(
        source.verbClass,
        source.classLabel,
        source.dictionaryForm,
        source.dictionaryReading,
        source.rule,
        source.forms.map { form ->
            val guide = form.readingGuide
            VerbForm(
                form.key,
                form.label,
                form.group,
                form.description,
                form.japanese,
                form.reading,
                form.stem,
                form.suffix,
                ReadingGuide(
                    guide.segments.map { ReadingSegment(it.text, it.reading) },
                    guide.source,
                    guide.hangul,
                    guide.hangulSource,
                    guide.hangulStatus,
                ),
            )
        },
    )
}
