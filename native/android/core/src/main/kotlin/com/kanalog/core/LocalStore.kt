package com.kanalog.core

import io.github.openspacedrepetition.Card
import io.github.openspacedrepetition.Rating
import io.github.openspacedrepetition.Scheduler
import kotlinx.serialization.json.Json
import java.io.File
import java.io.FileOutputStream
import java.nio.file.Files
import java.nio.file.StandardCopyOption
import java.time.Instant
import java.time.ZoneId
import java.util.UUID
import kotlin.random.Random

class LocalStore(
    private val file: File,
) {
    private val json =
        Json {
            coerceInputValues = true
            ignoreUnknownKeys = false
            encodeDefaults = true
        }
    private val scheduler = Scheduler.builder().enableFuzzing(false).build()
    private val reservations = mutableMapOf<String, Set<String>>()
    private var state =
        if (file.exists()) {
            require(file.length() <= MAX_STATE_BYTES) { "로컬 기록 파일이 너무 큽니다" }
            json.decodeFromString<LocalState>(file.readText()).also { require(it.schemaVersion == 1) { "지원하지 않는 기록 형식" } }
        } else {
            LocalState()
        }

    @Synchronized fun snapshot() = state

    @Synchronized fun hasInstalledManifest(text: String): Boolean {
        val manifest = json.decodeFromString<PackageManifest>(text)
        require(manifest.schemaVersion == 1)
        return state.packages[manifest.packageId] == manifest.version
    }

    private fun commit(next: LocalState) {
        file.parentFile?.mkdirs()
        val temp = File(file.parentFile, file.name + ".tmp")
        try {
            FileOutputStream(temp).use { out ->
                out.write(json.encodeToString(next).toByteArray(Charsets.UTF_8))
                out.fd.sync()
            }
            Files.move(temp.toPath(), file.toPath(), StandardCopyOption.ATOMIC_MOVE, StandardCopyOption.REPLACE_EXISTING)
            state = next
        } finally {
            temp.delete()
        }
    }

    @Synchronized fun install(text: String) {
        require(text.toByteArray(Charsets.UTF_8).size <= 64 * 1024 * 1024) { "콘텐츠가 너무 큽니다" }
        val content =
            try {
                json.decodeFromString<ContentPackage>(text)
            } catch (
                e: Exception,
            ) {
                throw IllegalArgumentException("손상된 콘텐츠 패키지", e)
            }
        require(content.schemaVersion == 1) { "지원하지 않는 콘텐츠 형식" }
        require(content.packageId.isNotBlank() && content.version.isNotBlank()) { "패키지 식별자가 없습니다" }
        require(
            content.notes.size <= 30_000 && content.notes
                .map { it.id }
                .distinct()
                .size == content.notes.size,
        ) { "중복되거나 너무 많은 카드" }
        content.notes.forEach(::validateNote)
        val incoming = content.notes.associateBy { it.id }
        val existing = state.notes.map { it.id }.toSet()
        val merged = state.notes.map { incoming[it.id] ?: it } + content.notes.filter { it.id !in existing }
        commit(state.copy(notes = merged, packages = state.packages + (content.packageId to content.version)))
    }

    @Synchronized fun installVerified(
        manifestText: String,
        saveMedia: ((String, ByteArray) -> Unit)? = null,
        progress: ((InstallProgress) -> Unit)? = null,
        readFile: (String) -> ByteArray,
    ) {
        require(manifestText.toByteArray().size <= 8 * 1024 * 1024)
        val manifest =
            try {
                json.decodeFromString<PackageManifest>(manifestText)
            } catch (
                e: Exception,
            ) {
                throw IllegalArgumentException("손상된 manifest", e)
            }
        require(manifest.schemaVersion == 1 && manifest.files.isNotEmpty())
        require(
            manifest.files.size <= 60_000 && manifest.files
                .map { it.path }
                .distinct()
                .size == manifest.files.size,
        )
        require(manifest.files.sumOf { it.bytes.coerceAtLeast(0) } <= 4L * 1024 * 1024 * 1024) { "패키지 총 크기 제한 초과" }
        require(
            manifest.files.all {
                (it.path in setOf("personal-content.json", "content.json") || validAudio(it.path)) &&
                    it.bytes in 0..64L * 1024 * 1024 &&
                    Regex("[a-fA-F0-9]{64}").matches(it.sha256)
            },
        ) { "안전하지 않은 manifest 경로" }
        require(manifest.files.count { !it.path.startsWith("media/") } == 1)
        val contentEntry = manifest.files.single { !it.path.startsWith("media/") }
        progress?.invoke(InstallProgress("CONTENT", 0, 1))

        fun verified(entry: ManifestFile): ByteArray {
            val bytes = readFile(entry.path)
            require(bytes.size.toLong() == entry.bytes) { "파일 크기 불일치: ${entry.path}" }
            val hash =
                java.security.MessageDigest
                    .getInstance("SHA-256")
                    .digest(bytes)
                    .joinToString("") { "%02x".format(it) }
            require(hash.equals(entry.sha256, ignoreCase = true)) { "파일 해시 불일치: ${entry.path}" }
            if (entry.path.startsWith(
                    "media/",
                )
            ) {
                require(
                    entry.path
                        .substringAfter("media/")
                        .substringBefore('.')
                        .equals(hash, ignoreCase = true),
                ) {
                    "음성 경로 해시 불일치"
                }
            }
            return bytes
        }
        val text =
            Charsets.UTF_8
                .newDecoder()
                .onMalformedInput(java.nio.charset.CodingErrorAction.REPORT)
                .decode(java.nio.ByteBuffer.wrap(verified(contentEntry)))
                .toString()
        val content = json.decodeFromString<ContentPackage>(text)
        require(content.packageId == manifest.packageId && content.version == manifest.version && content.schemaVersion == 1)
        require(
            content.notes.size <= 30_000 && content.notes
                .map { it.id }
                .distinct()
                .size == content.notes.size,
        )
        content.notes.forEach(::validateNote)
        val included = manifest.files.map { it.path }.toSet()
        content.notes
            .flatMap {
                listOfNotNull(it.audio) +
                    it.examples.mapNotNull { e ->
                        e.audio
                    }
            }.forEach { require(it in included) { "음성 파일 누락" } }
        val media = manifest.files.filter { it.path.startsWith("media/") }
        progress?.invoke(InstallProgress("MEDIA", 0, media.size))
        media.forEachIndexed { index, entry ->
            val bytes = verified(entry)
            saveMedia?.invoke(entry.path, bytes)
            if ((index + 1) % 64 == 0 || index == media.lastIndex) progress?.invoke(InstallProgress("MEDIA", index + 1, media.size))
        }
        progress?.invoke(InstallProgress("COMMIT", 0, 1))
        install(text)
        progress?.invoke(InstallProgress("DONE", 1, 1))
    }

    @Synchronized fun setFlags(
        id: String,
        bookmarked: Boolean? = null,
        excluded: Boolean? = null,
        memo: String? = null,
    ) {
        require(state.notes.any { it.id == id })
        val previous = state.progress[id] ?: Progress()
        val next =
            previous.copy(
                bookmarked = bookmarked ?: previous.bookmarked,
                excluded = excluded ?: previous.excluded,
                memo =
                    memo ?: previous.memo,
            )
        commit(state.copy(progress = state.progress + (id to next)))
    }

    @Synchronized fun saveSettings(settings: Settings) {
        require(settings.dailyNewLimit in 0..100)
        ZoneId.of(settings.timeZone)
        commit(state.copy(settings = settings))
    }

    @Synchronized fun savePersonalNote(
        front: String,
        reading: String,
        meaning: String,
        level: String = "N5",
        id: String? = null,
    ): String {
        val note =
            Note(
                id ?: "personal:${UUID.randomUUID()}",
                "vocabulary",
                front.trim(),
                level = level,
                reading =
                    reading.trim().ifBlank {
                        null
                    },
                meaning = meaning.trim(),
                readingGuide = PersonalReading.guide(front.trim(), reading),
            )
        validateNote(note)
        require(note.id.startsWith("personal:"))
        commit(state.copy(notes = state.notes.filterNot { it.id == note.id } + note))
        return note.id
    }

    @Synchronized fun review(
        id: String,
        rating: String,
        key: String,
        cardVersion: Int,
        now: Instant,
        reinforcement: Boolean = false,
    ): Progress {
        require(key.isNotBlank())
        val enumRating = Rating.valueOf(rating)
        state.reviews.firstOrNull { it.key == key }?.let {
            require(
                it.noteId == id && it.rating == rating && it.cardVersion == cardVersion && it.reinforcement == reinforcement,
            ) { "평가 요청 충돌" }
            return it.receipt ?: state.progress.getValue(id)
        }
        require(state.notes.any { it.id == id }) { "카드가 없습니다" }
        val prior = state.progress[id] ?: Progress()
        require(prior.version == cardVersion) { "카드가 변경되었습니다" }
        if (!reinforcement && prior.firstSeen == null && state.notes.first { it.id == id }.kind !in KANA_KINDS) {
            val zone = ZoneId.of(state.settings.timeZone)
            val today = now.atZone(zone).toLocalDate()
            val used =
                state.progress.entries.count { (noteId, p) ->
                    state.notes.firstOrNull { it.id == noteId }?.kind !in KANA_KINDS &&
                        p.firstSeen?.let { Instant.parse(it).atZone(zone).toLocalDate() == today } == true
                }
            require(used < state.settings.dailyNewLimit) { "오늘의 새 카드 한도를 모두 사용했습니다" }
        }
        val next =
            if (reinforcement) {
                prior.copy(version = prior.version + 1)
            } else {
                val card = prior.fsrsJson?.let(Card::fromJson) ?: Card.builder().build()
                val scheduled = scheduler.reviewCard(card, enumRating, now).card()
                val reminder =
                    if (enumRating ==
                        Rating.AGAIN
                    ) {
                        now
                            .atZone(
                                ZoneId.of(state.settings.timeZone),
                            ).toLocalDate()
                            .plusDays(1)
                            .atStartOfDay(ZoneId.of(state.settings.timeZone))
                            .toInstant()
                            .toString()
                    } else {
                        null
                    }
                prior.copy(
                    fsrsJson = scheduled.toJson(),
                    due = scheduled.due.toString(),
                    nextDayReminder = reminder,
                    version =
                        prior.version + 1,
                    lastRating = rating,
                    firstSeen = prior.firstSeen ?: now.toString(),
                )
            }
        commit(
            state.copy(
                progress = state.progress + (id to next),
                reviews =
                    state.reviews + Review(key, id, rating, cardVersion, now.toString(), reinforcement, next),
            ),
        )
        return next
    }

    @Synchronized fun queue(
        scope: StudyScope,
        now: Instant,
        random: Random = Random.Default,
    ): List<StudyCard> {
        val selected =
            state.notes.filter {
                it.kind in scope.kinds && (scope.groups.isEmpty() || it.group in scope.groups) &&
                    (scope.level == null || it.level == scope.level) &&
                    state.progress[it.id]?.excluded != true
            }
        if (scope.kinds.all { it in KANA_KINDS }) {
            val priorities = mapOf("AGAIN" to 0, "HARD" to 1, null to 2, "GOOD" to 3, "EASY" to 4)
            return selected.shuffled(random).sortedBy { priorities[state.progress[it.id]?.lastRating] ?: 2 }.map {
                StudyCard(
                    it,
                    state.progress[it.id]?.version ?: 0,
                )
            }
        }
        val zone = ZoneId.of(state.settings.timeZone)
        val today = now.atZone(zone).toLocalDate()
        val byId = state.notes.associateBy { it.id }
        val used =
            state.progress.entries.count { (id, p) ->
                byId[id]?.kind !in KANA_KINDS &&
                    p.firstSeen?.let { date -> Instant.parse(date).atZone(zone).toLocalDate() == today } == true
            }
        val reserved =
            reservations.values
                .flatten()
                .filter { state.progress[it]?.firstSeen == null }
                .toSet()
        val due =
            selected
                .filter {
                    state.progress[it.id]?.let { p ->
                        listOfNotNull(p.due, p.nextDayReminder).any { date -> !Instant.parse(date).isAfter(now) }
                    } ==
                        true
                }.sortedBy { state.progress[it.id]?.due }
        val new =
            if (scope.reviewOnly) {
                emptyList()
            } else {
                selected.filter { state.progress[it.id]?.fsrsJson == null && it.id !in reserved }.shuffled(random).take(
                    (
                        state.settings.dailyNewLimit -
                            used -
                            reserved.size
                    ).coerceAtLeast(0),
                )
            }
        return (due + new).map { StudyCard(it, state.progress[it.id]?.version ?: 0) }
    }

    @Synchronized fun startSession(
        scope: StudyScope,
        now: Instant,
        random: Random = Random.Default,
    ): StudySession {
        val cards = queue(scope, now, random)
        val sessionId = UUID.randomUUID().toString()
        if (!scope.kinds.all { it in KANA_KINDS }) {
            reservations[sessionId] =
                cards.filter { state.progress[it.note.id]?.firstSeen == null }.map { it.note.id }.toSet()
        }
        return StudySession(this, cards) { release(sessionId) }
    }

    @Synchronized private fun release(sessionId: String) {
        reservations.remove(sessionId)
    }

    @Synchronized fun search(
        query: String,
        bookmarkedOnly: Boolean = false,
        includeExcluded: Boolean = true,
    ): List<Note> =
        state.notes.filter {
            (!bookmarkedOnly || state.progress[it.id]?.bookmarked == true) &&
                (includeExcluded || state.progress[it.id]?.excluded != true) &&
                listOfNotNull(it.front, it.reading, it.meaning, it.grammarFocus?.title).any { text ->
                    text.contains(query, ignoreCase = true)
                }
        }

    companion object {
        private const val MAX_STATE_BYTES = 256L * 1024 * 1024
        val KANA_KINDS = setOf("hiragana", "katakana")

        fun validAudio(path: String): Boolean = Regex("media/[a-fA-F0-9]{64}\\.(mp3|wav|ogg|m4a|aac)").matches(path)

        fun validateNote(n: Note) {
            require(n.id.isNotBlank() && n.id.length <= 300 && n.front.isNotBlank() && n.front.length <= 50_000)
            require(n.kind in KANA_KINDS + setOf("vocabulary", "grammar"))
            require(n.level == null || n.level in setOf("N5", "N4", "N3", "N2", "N1"))
            require(n.group == null || n.group in setOf("basic", "voiced", "semiVoiced", "yoon"))
            n.audio?.let { require(validAudio(it)) { "안전하지 않은 음성 경로" } }
            n.examples.forEach { e ->
                e.audio?.let { require(validAudio(it)) }
                e.readingGuide?.let {
                    require(it.segments.joinToString("") { s -> s.text } == e.japanese)
                }
            }
            n.readingGuide?.let { require(it.segments.joinToString("") { s -> s.text } == n.front) { "후리가나 본문 불일치" } }
            n.grammarFocus?.let { focus ->
                require(focus.title.isNotBlank() && focus.segments.joinToString("") { it.text } == n.front) { "문법 강조 불일치" }
            }
        }
    }
}

class StudySession(
    private val store: LocalStore,
    val cards: List<StudyCard>,
    private val release: () -> Unit = {},
) {
    private val queue = cards.toMutableList()
    var index: Int = 0
        private set
    val current: StudyCard? get() = queue.getOrNull(index)
    val total: Int get() = queue.size
    private var requestKey = UUID.randomUUID().toString()

    fun close() = release()

    fun rate(
        rating: String,
        now: Instant,
    ) {
        val card = current ?: return
        val progress = store.review(card.note.id, rating, requestKey, card.version, now, card.reinforcement)
        if (rating == "AGAIN" && !card.reinforcement) queue += card.copy(version = progress.version, reinforcement = true)
        index++
        if (current == null) release()
        requestKey = UUID.randomUUID().toString()
    }
}
