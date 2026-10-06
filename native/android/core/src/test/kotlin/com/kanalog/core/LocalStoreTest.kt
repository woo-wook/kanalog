package com.kanalog.core

import java.nio.file.Files
import java.time.Instant
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFails
import kotlin.test.assertFailsWith
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import kotlin.test.assertTrue

class LocalStoreTest {
    private val sample =
        """
        {"schemaVersion":1,"packageId":"sample","version":"1","notes":[
        {"id":"one","kind":"vocabulary","level":"N5","front":"試験","reading":"しけん","meaning":"합성 테스트"}]}
        """.trimIndent()

    @Test fun `personal word reading creates aligned furigana and Hangul offline`() {
        val store = LocalStore(Files.createTempDirectory("kanalog").resolve("state.json").toFile())
        val id = store.savePersonalNote("試験", "しけん", "합성 뜻")
        val note = store.snapshot().notes.single { it.id == id }
        assertEquals(listOf(ReadingSegment("試験", "しけん")), note.readingGuide?.segments)
        assertEquals("시켄", note.readingGuide?.hangul)
        assertEquals("COMPLETE", note.readingGuide?.hangulStatus)
    }

    @Test fun `unknown personal reading does not invent furigana`() {
        val store = LocalStore(Files.createTempDirectory("kanalog").resolve("state.json").toFile())
        val id = store.savePersonalNote("日本", "unknown", "합성 뜻")
        assertNull(PersonalReading.guide("食べる", "たべます"))
        assertNull(
            store
                .snapshot()
                .notes
                .single { it.id == id }
                .readingGuide,
        )
    }

    @Test fun `package rejects unknown schema before applying`() {
        val store = LocalStore(Files.createTempDirectory("kanalog").resolve("state.json").toFile())
        assertFailsWith<IllegalArgumentException> { store.install("""{"schemaVersion":2,"packageId":"sample","version":"1","notes":[]}""") }
        assertTrue(store.snapshot().notes.isEmpty())
    }

    @Test fun `different package cannot replace active or archived content id`() {
        val store = LocalStore(Files.createTempDirectory("kanalog").resolve("state.json").toFile())
        store.install(sample)
        assertFailsWith<IllegalArgumentException> { store.install(sample.replace("\"sample\"", "\"intruder\"")) }
        store.install("""{"schemaVersion":1,"packageId":"sample","version":"2","notes":[]}""")
        assertFailsWith<IllegalArgumentException> { store.install(sample.replace("\"sample\"", "\"intruder\"")) }
    }

    @Test fun `same package removes inactive cards from queue but preserves progress and reimport`() {
        val file = Files.createTempDirectory("kanalog").resolve("state.json").toFile()
        val store = LocalStore(file)
        store.install(sample)
        store.setFlags("one", bookmarked = true)
        val now = Instant.parse("2026-10-06T03:00:00Z")
        val progress = store.review("one", "GOOD", "saved", 0, now)
        store.install("""{"schemaVersion":1,"packageId":"sample","version":"2","notes":[]}""")
        assertTrue(store.snapshot().notes.isEmpty())
        assertTrue(store.queue(StudyScope(setOf("vocabulary")), now.plusSeconds(86400)).isEmpty())
        assertEquals(progress, store.snapshot().progress.getValue("one"))
        assertEquals(1, store.snapshot().reviews.size)
        store.install(sample.replace("\"version\":\"1\"", "\"version\":\"3\""))
        assertEquals(progress, LocalStore(file).snapshot().progress.getValue("one"))
        assertEquals(1, store.snapshot().notes.size)
    }

    @Test fun `imported package cannot replace or claim personal note namespace`() {
        val store = LocalStore(Files.createTempDirectory("kanalog").resolve("state.json").toFile())
        val id = store.savePersonalNote("合成", "ごうせい", "내 합성 뜻")
        val prior = store.snapshot()
        assertFailsWith<IllegalArgumentException> { store.install(sample.replace("\"one\"", "\"$id\"")) }
        assertFailsWith<IllegalArgumentException> { store.install(sample.replace("\"one\"", "\"personal:unclaimed\"")) }
        assertEquals(prior, store.snapshot())
    }

    @Test fun `manifest mismatch rejects before replacing saved package`() {
        val store = LocalStore(Files.createTempDirectory("kanalog").resolve("state.json").toFile())
        store.install(sample)
        val prior = store.snapshot()
        val manifest = """{"schemaVersion":1,"packageId":"sample","version":"1","files":[{"path":"personal-content.json","sha256":"${"0".repeat(
            64,
        )}","bytes":${sample.toByteArray().size}}]}"""
        assertFailsWith<IllegalArgumentException> { store.installVerified(manifest) { sample.toByteArray() } }
        assertEquals(prior, store.snapshot())
    }

    @Test fun `review and bookmark survive reopening and same id content update`() {
        val path = Files.createTempDirectory("kanalog").resolve("state.json").toFile()
        val store = LocalStore(path)
        store.install(sample)
        store.setFlags("one", bookmarked = true)
        store.review("one", "GOOD", "fixed", 0, Instant.parse("2026-10-06T03:00:00Z"))
        store.install(sample.replace("합성 테스트", "변경된 합성 뜻"))
        val reopened = LocalStore(path).snapshot()
        assertEquals("변경된 합성 뜻", reopened.notes.single().meaning)
        assertTrue(reopened.progress.getValue("one").bookmarked)
        assertEquals(1, reopened.progress.getValue("one").version)
        assertNotNull(reopened.progress.getValue("one").fsrsJson)
        assertEquals(1, reopened.reviews.size)
    }

    @Test fun `fixed review key prevents duplicate scheduling and conflicting ratings`() {
        val store = LocalStore(Files.createTempDirectory("kanalog").resolve("state.json").toFile())
        store.install(sample)
        val now = Instant.parse("2026-10-06T03:00:00Z")
        val saved = store.review("one", "GOOD", "key", 0, now)
        assertEquals(saved, store.review("one", "GOOD", "key", 0, now))
        assertFailsWith<IllegalArgumentException> { store.review("one", "EASY", "key", 0, now) }
        assertFailsWith<IllegalArgumentException> { store.review("one", "GOOD", "another", 0, now) }
        assertEquals(1, store.snapshot().reviews.size)
    }

    @Test fun `again adds one reinforcement and keeps next day official review separate`() {
        val store = LocalStore(Files.createTempDirectory("kanalog").resolve("state.json").toFile())
        store.install(sample)
        val now = Instant.parse("2026-10-06T03:00:00Z")
        val session = StudySession(store, store.queue(StudyScope(setOf("vocabulary")), now))
        session.rate("AGAIN", now)
        assertTrue(session.current!!.reinforcement)
        val scheduled = store.snapshot().progress.getValue("one")
        assertEquals("2026-10-06T15:00:00Z", scheduled.nextDayReminder)
        assertEquals(
            io.github.openspacedrepetition.Card
                .fromJson(scheduled.fsrsJson!!)
                .due
                .toString(),
            scheduled.due,
        )
        session.rate("AGAIN", now.plusSeconds(30))
        assertNull(session.current)
        assertEquals(
            scheduled.fsrsJson,
            store
                .snapshot()
                .progress
                .getValue("one")
                .fsrsJson,
        )
        assertEquals(2, store.snapshot().reviews.size)
        assertTrue(
            store
                .snapshot()
                .reviews
                .last()
                .reinforcement,
        )
    }

    @Test fun `dangerous media path duplicate note and invalid highlights preserve existing content`() {
        val store = LocalStore(Files.createTempDirectory("kanalog").resolve("state.json").toFile())
        store.install(sample)
        val prior = store.snapshot()
        assertFailsWith<IllegalArgumentException> {
            store.install(sample.replace("\"meaning\":", "\"audio\":\"media/../secret.mp3\",\"meaning\":"))
        }
        assertEquals(prior, store.snapshot())
        assertFailsWith<IllegalArgumentException> {
            store.install(
                sample.replace(
                    "\"meaning\":",
                    "\"grammarFocus\":{\"title\":\"誤\",\"segments\":[{\"text\":\"誤\",\"highlighted\":true}]},\"meaning\":",
                ),
            )
        }
        assertEquals(prior, store.snapshot())
    }

    @Test fun `failed persistence retains card and in memory state`() {
        val folder = Files.createTempDirectory("kanalog").toFile()
        val file = java.io.File(folder, "state.json")
        val store = LocalStore(file)
        store.install(sample)
        val now = Instant.parse("2026-10-06T03:00:00Z")
        val session = StudySession(store, store.queue(StudyScope(setOf("vocabulary")), now))
        file.delete()
        java.io.File(folder, "state.json.tmp").mkdir()
        assertFails { session.rate("GOOD", now) }
        assertEquals(0, session.index)
        assertTrue(store.snapshot().reviews.isEmpty())
    }

    @Test fun `daily limit timezone exclusions and review order use local state`() {
        val store = LocalStore(Files.createTempDirectory("kanalog").resolve("state.json").toFile())
        store.install(sample)
        store.savePersonalNote("合成", "ごうせい", "합성")
        store.saveSettings(Settings(dailyNewLimit = 1))
        val now = Instant.parse("2026-10-06T03:00:00Z")
        assertEquals(1, store.queue(StudyScope(setOf("vocabulary")), now).size)
        store.review("one", "AGAIN", "first", 0, now)
        assertTrue(store.queue(StudyScope(setOf("vocabulary")), now).isEmpty())
        val tomorrow = now.plusSeconds(86400)
        assertEquals(
            "one",
            store
                .queue(StudyScope(setOf("vocabulary")), tomorrow)
                .first()
                .note.id,
        )
        store.setFlags("one", excluded = true)
        assertTrue(store.queue(StudyScope(setOf("vocabulary"), reviewOnly = true), tomorrow).isEmpty())
        assertEquals(2, store.search("").size)
    }

    @Test fun `multiple sessions reserve distinct new cards and direct review enforces daily limit`() {
        val store = LocalStore(Files.createTempDirectory("kanalog").resolve("state.json").toFile())
        store.install(sample)
        store.savePersonalNote("合成", "ごうせい", "합성")
        store.saveSettings(Settings(dailyNewLimit = 1))
        val now = Instant.parse("2026-10-06T03:00:00Z")
        val first = store.startSession(StudyScope(setOf("vocabulary")), now)
        val second = store.startSession(StudyScope(setOf("vocabulary")), now)
        assertEquals(1, first.cards.size)
        assertTrue(second.cards.isEmpty())
        first.close()
        val actual = store.startSession(StudyScope(setOf("vocabulary")), now)
        val selected = actual.current!!.note.id
        actual.rate("GOOD", now)
        val other =
            store
                .snapshot()
                .notes
                .first { it.id != selected }
                .id
        assertFailsWith<IllegalArgumentException> { store.review(other, "GOOD", "bypass", 0, now) }
    }

    @Test fun `idempotent receipt remains original after later ratings`() {
        val store = LocalStore(Files.createTempDirectory("kanalog").resolve("state.json").toFile())
        store.install(sample)
        val now = Instant.parse("2026-10-06T03:00:00Z")
        val original = store.review("one", "GOOD", "first", 0, now)
        store.review("one", "EASY", "second", 1, now.plusSeconds(86400))
        assertEquals(original, store.review("one", "GOOD", "first", 0, now))
    }
}
