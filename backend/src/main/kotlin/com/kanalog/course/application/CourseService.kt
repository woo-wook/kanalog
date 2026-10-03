package com.kanalog.course.application

import com.kanalog.common.error.FailureStatus
import com.kanalog.common.error.fail
import com.kanalog.course.application.port.out.CourseStore
import com.kanalog.course.domain.CoursePlan
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

@Service
class CourseService(
    private val store: CourseStore,
) {
    fun list(owner: UUID) = store.list(owner)

    fun get(
        owner: UUID,
        id: UUID,
    ) = list(owner).find { it.id == id } ?: fail("COURSE_NOT_FOUND", "코스를 찾을 수 없습니다", FailureStatus.NOT_FOUND)

    fun scope(
        owner: UUID,
        id: UUID,
    ) = store.scope(owner, id) ?: fail("LESSON_NOT_FOUND", "학습 단계를 찾을 수 없습니다", FailureStatus.NOT_FOUND)

    @Transactional
    fun select(
        owner: UUID,
        lesson: UUID,
    ) {
        val scope = scope(owner, lesson)
        store.lockUser(owner)
        store.select(owner, lesson, scope.deckId)
    }

    @Transactional
    fun synchronize(owner: UUID) {
        store.lockUser(owner)
        store.synchronize(owner, CoursePlan.build(store.importedDecks(owner)))
    }
}
