package com.kanalog.curriculum.application

import com.kanalog.common.error.fail
import com.kanalog.course.application.CourseService
import com.kanalog.curriculum.domain.CurriculumBuilder
import com.kanalog.curriculum.domain.CurriculumLevelView
import com.kanalog.curriculum.domain.CurriculumView
import java.util.UUID
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service

@Service
class CurriculumService(private val courses:CourseService) {
    fun get(owner:UUID):CurriculumView = CurriculumBuilder().build(courses.list(owner))
    fun level(owner:UUID,key:String):CurriculumLevelView = get(owner).levels.firstOrNull { it.key==key }
        ?: fail("CURRICULUM_LEVEL_NOT_FOUND","학습 레벨을 찾을 수 없습니다",HttpStatus.NOT_FOUND)
}
