package com.kanalog.auth.presentation

import com.kanalog.auth.application.AuthService
import com.kanalog.auth.application.model.LoginRequest
import com.kanalog.auth.domain.UserView
import jakarta.servlet.http.Cookie
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import jakarta.validation.Valid
import org.springframework.beans.factory.annotation.Value
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RestController

@RestController
class AuthController(
    private val auth: AuthService,
    @Value("\${app.cookie-secure:false}") private val secure: Boolean,
) {
    @PostMapping("/api/auth/login")
    fun login(
        @Valid @RequestBody body: LoginRequest,
        response: HttpServletResponse,
    ): UserView {
        val (token, user) = auth.login(body.email, body.password)
        response.addHeader(
            "Set-Cookie",
            "kanalog_session=$token; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000${if (secure) "; Secure" else ""}",
        )
        return user
    }

    @PostMapping("/api/auth/logout")
    fun logout(
        request: HttpServletRequest,
        response: HttpServletResponse,
    ) {
        auth.logout(request.getAttribute("token") as String)
        response.addHeader("Set-Cookie", "kanalog_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${if (secure) "; Secure" else ""}")
    }

    @GetMapping("/api/me")
    fun me(request: HttpServletRequest) = request.user()
}
