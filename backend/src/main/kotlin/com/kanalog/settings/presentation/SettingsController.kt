package com.kanalog.settings.presentation
import com.kanalog.auth.presentation.user
import com.kanalog.settings.application.SettingsService
import com.kanalog.settings.application.model.SettingsPatch
import jakarta.servlet.http.HttpServletRequest
import jakarta.validation.Valid
import org.springframework.web.bind.annotation.*
@RestController
class SettingsController(private val service: SettingsService) {
    @GetMapping("/api/settings") fun settings(request: HttpServletRequest) = service.settings(request.user().id)
    @PatchMapping("/api/settings") fun patch(@Valid @RequestBody body: SettingsPatch, request: HttpServletRequest) = service.patch(request.user().id,body)
}
