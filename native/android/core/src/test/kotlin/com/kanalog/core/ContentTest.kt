package com.kanalog.core

import java.io.File
import java.nio.file.Files
import java.time.Instant
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertNull
import kotlin.test.assertTrue

class ContentTest {
    @Test fun `private kana audio overlay keeps builtin ownership and existing review`() {
        val file = Files.createTempDirectory("kanalog").resolve("state.json").toFile()
        val store = LocalStore(file)
        store.install(File(System.getProperty("builtinFile")).readText())
        val now = Instant.parse("2026-10-06T03:00:00Z")
        val id = "hiragana:あ"
        val original = store.snapshot().notes.single { it.id == id }
        store.setFlags(id, bookmarked = true, memo = "내 합성 메모")
        val progress = store.review(id, "GOOD", "kana-review", 0, now)
        val overlay =
            """
            {"schemaVersion":1,"packageId":"private-synthetic","version":"1","notes":[
            {"id":"hiragana:あ","kind":"hiragana","group":"basic","front":"あ",
            "meaning":"교체하면 안 되는 합성 뜻","audio":"media/${"0".repeat(64)}.mp3"}]}
            """.trimIndent()
        store.install(overlay)
        assertEquals(208, store.snapshot().notes.size)
        assertEquals(original.copy(audio = "media/${"0".repeat(64)}.mp3"), store.snapshot().notes.single { it.id == id })
        assertEquals("kanalog-kana", store.snapshot().notePackages[id])
        assertEquals(progress, store.snapshot().progress[id])
        assertFailsWith<IllegalArgumentException> { store.install(overlay.replace("\"front\":\"あ\"", "\"front\":\"い\"")) }
        store.install("""{"schemaVersion":1,"packageId":"private-synthetic","version":"2","notes":[]}""")
        val reopened = LocalStore(file).snapshot()
        assertEquals(208, reopened.notes.size)
        assertEquals(progress, reopened.progress[id])
        assertEquals(1, reopened.reviews.size)
    }

    @Test fun `legacy profile owners are restored without losing prior cards or reviews`() {
        val file = Files.createTempDirectory("kanalog").resolve("state.json").toFile()
        file.writeText(
            """
            {"schemaVersion":1,"packages":{"sample":"1"},"notes":[
            {"id":"old","kind":"vocabulary","front":"合成"}]}
            """.trimIndent(),
        )
        val store = LocalStore(file)
        assertEquals("sample", store.snapshot().notePackages["old"])
        store.install("""{"schemaVersion":1,"packageId":"sample","version":"2","notes":[]}""")
        assertTrue(store.snapshot().notes.isEmpty())
        assertEquals("sample", LocalStore(file).snapshot().notePackages["old"])
    }

    @Test fun `builtin inventory and kana session include every chosen character`() {
        val file = Files.createTempDirectory("kanalog").resolve("state.json").toFile()
        val store = LocalStore(file)
        store.install(File(System.getProperty("builtinFile")).readText())
        assertEquals(208, store.snapshot().notes.size)
        val now = Instant.parse("2026-10-06T03:00:00Z")
        for (kind in LocalStore.KANA_KINDS) {
            for ((group, count) in mapOf("basic" to 46, "voiced" to 20, "semiVoiced" to 5, "yoon" to 33)) {
                assertEquals(count, store.queue(StudyScope(setOf(kind), setOf(group)), now).size)
            }
        }
        val session = store.startSession(StudyScope(LocalStore.KANA_KINDS), now)
        assertEquals(208, session.total)
        repeat(208) { session.rate("GOOD", now.plusSeconds(it.toLong())) }
        assertNull(session.current)
        assertEquals(208, LocalStore(file).snapshot().notes.size)
        assertEquals(208, store.snapshot().reviews.size)
    }

    @Test fun `confirmed grammar structure matches web and unknown layouts stay unstructured`() {
        val text = "この本です。\n합성 해석\nこの: 합성 표현\n뉘앙스\n합성 첫 설명\n접속\n합성 접속 설명\n헷갈리는 문형\n합성 마지막 설명"
        val answer = structureGrammarAnswer(text, "この本です。")!!
        assertEquals("합성 해석", answer.translation)
        assertEquals(listOf("뉘앙스", "접속", "헷갈리는 문형"), answer.topics.map { it.title })
        assertEquals(listOf("합성 접속 설명"), answer.topics[1].paragraphs)
        assertNull(structureGrammarAnswer(text, "다른 앞면"))
        assertNull(structureGrammarAnswer("합성 미확인 형식\n그대로 표시", "この本です。"))
    }

    @Test fun `optional private package verifies all hashes without committing private fixtures`() {
        if (System.getProperty("verifyPrivateContent") != "true") return
        val directory = File(System.getProperty("privateContentDirectory"))
        val file = Files.createTempDirectory("kanalog-private").resolve("state.json").toFile()
        try {
            val store = LocalStore(file)
            val updates = mutableListOf<InstallProgress>()
            store.installVerified(
                File(directory, "manifest.json").readText(),
                progress = { updates += it },
            ) { File(directory, it).readBytes() }
            assertEquals(10237, store.snapshot().notes.count { it.kind !in LocalStore.KANA_KINDS })
            assertEquals(9159, store.snapshot().notes.count { it.kind == "vocabulary" })
            assertEquals(1078, store.snapshot().notes.count { it.kind == "grammar" })
            assertTrue(store.hasInstalledManifest(File(directory, "manifest.json").readText()))
            assertEquals(store.snapshot().notes.size, LocalStore(file).snapshot().notes.size)
            assertEquals("CONTENT", updates.first().phase)
            assertEquals(InstallProgress("DONE", 1, 1), updates.last())
            val media = updates.filter { it.phase == "MEDIA" }
            assertEquals(media.last().total, media.last().completed)
            assertEquals(media.map { it.completed }.sorted(), media.map { it.completed })
        } finally {
            file.parentFile.deleteRecursively()
        }
    }
}
