package com.kanalog.progress.presentation

import com.kanalog.auth.presentation.user
import com.kanalog.progress.application.OverviewService
import com.kanalog.settings.application.model.SettingsPatch
import jakarta.servlet.http.HttpServletRequest
import jakarta.validation.Valid
import org.springframework.web.bind.annotation.*

@RestController
class OverviewController(private val service: OverviewService) {
    @GetMapping("/api/settings") fun settings(request:HttpServletRequest)=service.settings(request.user().id)
    @PatchMapping("/api/settings") fun patch(@Valid @RequestBody body:SettingsPatch,request:HttpServletRequest)=service.patch(request.user().id,body)
    @GetMapping("/api/dashboard") fun dashboard(request:HttpServletRequest)=service.dashboard(request.user().id)
    @GetMapping("/api/stats") fun stats(request:HttpServletRequest)=service.stats(request.user().id)
}
