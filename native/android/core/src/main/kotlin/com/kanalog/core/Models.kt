package com.kanalog.core

import kotlinx.serialization.Serializable

@Serializable data class HighlightSegment(
    val text: String,
    val highlighted: Boolean,
)

@Serializable data class GrammarFocus(
    val title: String,
    val segments: List<HighlightSegment>,
)

@Serializable data class ReadingSegment(
    val text: String,
    val reading: String? = null,
)

@Serializable data class ReadingGuide(
    val segments: List<ReadingSegment> = emptyList(),
    val source: String? = null,
    val hangul: String? = null,
    val hangulSource: String? = null,
    val hangulStatus: String = "UNAVAILABLE",
)

@Serializable data class Example(
    val japanese: String,
    val reading: String? = null,
    val korean: String? = null,
    val readingGuide: ReadingGuide? = null,
    val audio: String? = null,
)

@Serializable data class Note(
    val id: String,
    val kind: String,
    val front: String,
    val level: String? = null,
    val group: String? = null,
    val reading: String? = null,
    val meaning: String? = null,
    val partOfSpeech: String? = null,
    val grammarFocus: GrammarFocus? = null,
    val readingGuide: ReadingGuide? = null,
    val examples: List<Example> = emptyList(),
    val audio: String? = null,
)

@Serializable data class ContentPackage(
    val schemaVersion: Int,
    val packageId: String,
    val version: String,
    val notes: List<Note>,
)

@Serializable data class ManifestFile(
    val path: String,
    val sha256: String,
    val bytes: Long,
)

@Serializable data class PackageManifest(
    val schemaVersion: Int,
    val packageId: String,
    val version: String,
    val files: List<ManifestFile>,
)

@Serializable data class Settings(
    val dailyNewLimit: Int = 10,
    val timeZone: String = "Asia/Seoul",
    val furigana: Boolean = true,
    val hintBeforeAnswer: Boolean = false,
    val hangul: Boolean = false,
    val autoAudio: Boolean = false,
)

@Serializable data class Progress(
    val fsrsJson: String? = null,
    val schedulerVersion: String = "java-fsrs/1.0.0",
    val due: String? = null,
    val nextDayReminder: String? = null,
    val version: Int = 0,
    val lastRating: String? = null,
    val firstSeen: String? = null,
    val bookmarked: Boolean = false,
    val excluded: Boolean = false,
    val memo: String = "",
)

@Serializable data class Review(
    val key: String,
    val noteId: String,
    val rating: String,
    val cardVersion: Int,
    val at: String,
    val reinforcement: Boolean = false,
    val receipt: Progress? = null,
)

@Serializable data class LocalState(
    val schemaVersion: Int = 1,
    val notes: List<Note> = emptyList(),
    val packages: Map<String, String> = emptyMap(),
    val notePackages: Map<String, String> = emptyMap(),
    val progress: Map<String, Progress> = emptyMap(),
    val reviews: List<Review> = emptyList(),
    val settings: Settings = Settings(),
)

data class StudyScope(
    val kinds: Set<String>,
    val groups: Set<String> = emptySet(),
    val level: String? = null,
    val reviewOnly: Boolean = false,
)

data class StudyCard(
    val note: Note,
    val version: Int,
    val reinforcement: Boolean = false,
)

data class InstallProgress(
    val phase: String,
    val completed: Int,
    val total: Int,
)
