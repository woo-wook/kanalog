package com.kanalog.progress.application.port.out

import java.time.Instant
import java.util.UUID

data class ActiveLesson(
    val id: UUID?,
    val title: String?,
)

interface ProgressQuery {
    fun activeLesson(owner: UUID): ActiveLesson?

    fun dueInScope(
        owner: UUID,
        lesson: UUID?,
    ): Int

    fun newUsed(
        owner: UUID,
        start: Instant,
        end: Instant,
    ): Int

    fun unseenInScope(
        owner: UUID,
        lesson: UUID?,
    ): Int

    fun answers(
        owner: UUID,
        start: Instant,
        end: Instant? = null,
        unique: Boolean = false,
    ): Int

    fun selectedDeck(owner: UUID): UUID?

    fun due(owner: UUID): Int

    fun lastStudied(owner: UUID): Instant?

    fun reviewTimes(owner: UUID): List<Instant>
}
