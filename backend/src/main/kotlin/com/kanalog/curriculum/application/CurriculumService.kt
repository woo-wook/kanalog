package com.kanalog.curriculum.application

import com.kanalog.common.error.FailureStatus
import com.kanalog.common.error.fail
import com.kanalog.course.application.CourseService
import com.kanalog.curriculum.domain.CurriculumBuilder
import com.kanalog.curriculum.domain.CurriculumLevelView
import com.kanalog.curriculum.domain.CurriculumView
import org.springframework.stereotype.Service
import java.util.UUID

@Service
class CurriculumService(
    private val courses: CourseService,
) {
    fun get(owner: UUID): CurriculumView = CurriculumBuilder().build(courses.list(owner))

    fun level(
        owner: UUID,
        key: String,
    ): CurriculumLevelView =
        get(owner).levels.firstOrNull { it.key == key }
            ?: fail("CURRICULUM_LEVEL_NOT_FOUND", "학습 레벨을 찾을 수 없습니다", FailureStatus.NOT_FOUND)
}
