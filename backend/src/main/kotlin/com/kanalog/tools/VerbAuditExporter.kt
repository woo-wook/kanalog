package com.kanalog.tools

import com.atilika.kuromoji.ipadic.Tokenizer
import com.kanalog.content.domain.VerbConjugator
import tools.jackson.databind.json.JsonMapper
import java.nio.file.Files
import java.nio.file.Path
import java.nio.file.StandardCopyOption

/** Offline QA export; never starts Spring, changes content, or connects to a database. */
object VerbAuditExporter {
    @JvmStatic
    fun main(args: Array<String>) {
        require(args.size == 2) { "Provide input notes.jsonl and private-data output.jsonl" }
        val input = Path.of(args[0]).toAbsolutePath().normalize()
        val output = Path.of(args[1]).toAbsolutePath().normalize()
        require(output.any { it.toString() == "private-data" }) { "Output must be in private-data" }
        require(input != output) { "Input and output must differ" }
        Files.createDirectories(output.parent)
        val temporary = Files.createTempFile(output.parent, "verb-audit-", ".jsonl")
        val mapper = JsonMapper.builder().build()
        val tokenizer = Tokenizer()
        var notes = 0
        var forms = 0
        try {
            Files.newBufferedWriter(temporary).use { writer ->
                Files.lines(input).use { lines ->
                    lines.filter { it.isNotBlank() }.forEach { line ->
                        val note = mapper.readTree(line)
                        val pos = note.path("partOfSpeech").asString("")
                        if (note.path("kind").asString() != "vocabulary" ||
                            !listOf("5단동사", "1단동사", "サ변", "カ변", "五段", "一段", "サ変", "カ変").any(pos::contains)
                        ) {
                            return@forEach
                        }
                        val front = note.path("front").asString()
                        val reading = note.path("reading").asString("")
                        val conjugation = VerbConjugator.generate(front, reading, pos)
                        val dictionary =
                            tokenizer.tokenize(front).map { token ->
                                mapOf(
                                    "surface" to token.surface,
                                    "baseForm" to token.baseForm,
                                    "known" to token.isKnown,
                                    "partOfSpeech" to
                                        listOf(
                                            token.partOfSpeechLevel1,
                                            token.partOfSpeechLevel2,
                                            token.partOfSpeechLevel3,
                                            token.partOfSpeechLevel4,
                                        ),
                                    "conjugationType" to token.conjugationType,
                                    "reading" to token.reading,
                                    "pronunciation" to token.pronunciation,
                                )
                            }
                        writer.write(
                            mapper.writeValueAsString(
                                mapOf(
                                    "sourceGuid" to note.path("sourceGuid").asString(),
                                    "front" to front,
                                    "reading" to reading,
                                    "partOfSpeech" to pos,
                                    "conjugation" to conjugation,
                                    "dictionary" to dictionary,
                                ),
                            ),
                        )
                        writer.newLine()
                        notes++
                        forms += conjugation?.forms?.size ?: 0
                    }
                }
            }
            Files.move(temporary, output, StandardCopyOption.REPLACE_EXISTING, StandardCopyOption.ATOMIC_MOVE)
        } finally {
            Files.deleteIfExists(temporary)
        }
        println("notes=$notes forms=$forms")
    }
}
