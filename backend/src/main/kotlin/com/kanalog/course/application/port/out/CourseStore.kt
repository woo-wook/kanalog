package com.kanalog.course.application.port.out

import com.kanalog.course.domain.CoursePlan
import com.kanalog.course.domain.CourseView
import com.kanalog.course.domain.ImportedDeck
import com.kanalog.course.domain.LessonScope
import java.util.UUID

interface CourseStore {
    fun list(owner: UUID): List<CourseView>
    fun scope(owner: UUID, id: UUID): LessonScope?
    fun lockUser(owner: UUID)
    fun select(owner: UUID, lesson: UUID, deck: UUID)
    fun importedDecks(owner: UUID): List<ImportedDeck>
    fun synchronize(owner: UUID, plan: CoursePlan)
    fun owners(): List<UUID>
}
