package com.kanalog.tools

import com.kanalog.content.infrastructure.ReadingGuideFactory
import com.kanalog.content.infrastructure.convertedGrammarFocus
import com.kanalog.course.domain.KanaInventory
import tools.jackson.databind.JsonNode
import tools.jackson.databind.json.JsonMapper
import java.nio.file.Files
import java.nio.file.Path

/** Offline conversion only: no Spring context, database, credentials or network. */
class NativeContentExporter {
    private val guides = ReadingGuideFactory()

    fun builtinNotes(): List<Map<String, Any?>> =
        KanaInventory.courses().flatMap { course ->
            course.lessons.flatMapIndexed { index, lesson ->
                lesson.characters.map { character ->
                    mapOf(
                        "id" to character.sourceGuid,
                        "kind" to course.kind,
                        "group" to
                            when (index) {
                                in 0..9 -> "basic"
                                in 10..13 -> "voiced"
                                14 -> "semiVoiced"
                                else -> "yoon"
                            },
                        "front" to character.glyph,
                        "reading" to character.glyph,
                        "meaning" to character.hangul,
                        "readingGuide" to guides.create(character.glyph, character.glyph, character.hangul),
                        "examples" to emptyList<Any>(),
                    )
                }
            }
        }

    fun convert(
        row: JsonNode,
        media: Map<String, String>,
    ): Map<String, Any?> {
        check(row.path("schemaVersion").asInt() == 1) { "Unsupported converted note schema" }
        val kind = row.path("kind").asString()
        check(kind in setOf("vocabulary", "grammar")) { "Unsupported note kind" }
        val front = row.path("front").asString()
        val reading = row.text("reading")

        fun audio(name: String?): String? = name?.let { media[it] ?: error("Missing original audio mapping") }
        val entries = row.path("examples")
        val examples: List<Map<String, Any?>> =
            (0 until if (entries.isArray) entries.size() else 0).map { index ->
                val example = entries.get(index)
                val japanese = example.path("japanese").asString()
                mapOf(
                    "japanese" to japanese,
                    "reading" to example.text("reading"),
                    "korean" to example.text("korean"),
                    "audio" to audio(example.text("audio")),
                    "readingGuide" to
                        guides.create(
                            japanese,
                            example.text("reading"),
                            original = example.path("furigana"),
                            sentence = true,
                        ),
                )
            }
        return mapOf(
            "id" to "max:${row.path("sourceGuid").asString()}:${row.path("cardDirection").asString()}",
            "kind" to kind,
            "level" to row.text("level"),
            "front" to front,
            "reading" to reading,
            "meaning" to if (kind == "grammar") row.text("answer").orEmpty() else row.text("meaning").orEmpty(),
            "partOfSpeech" to row.text("partOfSpeech"),
            "grammarFocus" to if (kind == "grammar") convertedGrammarFocus(row, front) else null,
            "readingGuide" to guides.create(front, reading, original = row.path("furigana"), sentence = kind == "grammar"),
            "examples" to examples,
            "audio" to audio(row.text("wordAudio")),
        )
    }

    private fun JsonNode.text(key: String): String? = path(key).takeIf { it.isString }?.asString()?.takeIf { it.isNotBlank() }

    companion object {
        @JvmStatic
        fun main(args: Array<String>) {
            require(args.size in 1..3) { "Usage: output.json [notes.jsonl media-map.json]" }
            val mapper = JsonMapper.builder().build()
            val exporter = NativeContentExporter()
            val output = Path.of(args[0])
            val notes =
                if (args.size == 1) {
                    exporter.builtinNotes()
                } else {
                    require(args.size == 3)
                    val mapping = mapper.readTree(Files.readString(Path.of(args[2])))
                    val media = mapping.properties().associate { it.key to it.value.asString() }
                    Files.newBufferedReader(Path.of(args[1])).useLines { lines ->
                        lines.filter { it.isNotBlank() }.map { exporter.convert(mapper.readTree(it), media) }.toList()
                    }
                }
            require(notes.size <= 30_000)
            require(notes.map { it["id"] }.toSet().size == notes.size) { "Duplicate source identities" }
            Files.createDirectories(output.toAbsolutePath().parent)
            val json =
                mapper.writerWithDefaultPrettyPrinter().writeValueAsString(
                    mapOf(
                        "schemaVersion" to 1,
                        "packageId" to
                            if (args.size ==
                                1
                            ) {
                                "kanalog-kana"
                            } else {
                                "personal-jlpt-max"
                            },
                        "version" to "1",
                        "notes" to notes,
                    ),
                )
            require(json.toByteArray().size <= 64 * 1024 * 1024)
            Files.writeString(output, json)
            println("Exported ${notes.size} notes; no source text logged")
        }
    }
}
