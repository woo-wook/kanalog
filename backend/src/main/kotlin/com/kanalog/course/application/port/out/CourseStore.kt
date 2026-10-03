package com.kanalog.course.application.port.out
import com.kanalog.course.domain.*
import java.util.UUID
interface CourseStore {
    fun list(owner: UUID): List<CourseView>
    fun scope(owner: UUID, id: UUID): LessonScope?
    fun lockUser(owner: UUID)
    fun select(owner: UUID, lesson: UUID, deck: UUID)
    fun synchronize(owner: UUID)
    fun owners(): List<UUID>
}
