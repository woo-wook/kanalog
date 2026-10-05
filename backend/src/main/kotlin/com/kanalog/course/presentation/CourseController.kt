package com.kanalog.course.presentation

import com.kanalog.auth.presentation.user
import com.kanalog.course.application.CourseService
import jakarta.servlet.http.HttpServletRequest
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RestController
import java.util.UUID

@RestController
class CourseController(
    private val courses: CourseService,
) {
    @GetMapping("/api/kana/reference")
    fun reference() = courses.reference()

    @GetMapping("/api/courses")
    fun list(request: HttpServletRequest) = courses.list(request.user().id)

    @GetMapping("/api/courses/{id}")
    fun get(
        @PathVariable id: UUID,
        request: HttpServletRequest,
    ) = courses.get(request.user().id, id)

    @PostMapping("/api/courses/lessons/{id}/select")
    fun select(
        @PathVariable id: UUID,
        request: HttpServletRequest,
    ) = courses.select(request.user().id, id)
}
