package com.kanalog.progress.presentation

import com.kanalog.auth.presentation.user
import com.kanalog.progress.application.ProgressService
import jakarta.servlet.http.HttpServletRequest
import org.springframework.web.bind.annotation.*

@RestController
class OverviewController(private val service: ProgressService) {
    @GetMapping("/api/dashboard") fun dashboard(request:HttpServletRequest)=service.dashboard(request.user().id)
    @GetMapping("/api/stats") fun stats(request:HttpServletRequest)=service.stats(request.user().id)
}
