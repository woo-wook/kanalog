package com.kanalog.imports.presentation

import com.kanalog.auth.presentation.user
import com.kanalog.imports.application.ImportJobService
import jakarta.servlet.http.HttpServletRequest
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.RestController
import java.util.UUID

@RestController
class ImportsController(
    private val jobs: ImportJobService,
) {
    @GetMapping("/api/imports")
    fun list(request: HttpServletRequest) = jobs.list(request.user().id)

    @GetMapping("/api/imports/{id}")
    fun get(
        @PathVariable id: UUID,
        request: HttpServletRequest,
    ) = jobs.get(request.user().id, id)
}
