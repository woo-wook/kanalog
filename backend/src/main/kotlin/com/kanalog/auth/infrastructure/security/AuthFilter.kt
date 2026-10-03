package com.kanalog.auth.infrastructure.security

import com.kanalog.auth.application.AuthService
import com.kanalog.auth.presentation.user
import com.kanalog.common.presentation.requestId
import jakarta.servlet.FilterChain
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import java.net.URI
import java.util.*
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Component
import org.springframework.web.bind.annotation.*
import org.springframework.web.filter.OncePerRequestFilter

@Component
class AuthFilter(
    private val auth: AuthService,
    @Value("\${app.public-url}") private val publicUrl: String
) : OncePerRequestFilter() {
    override fun doFilterInternal(request: HttpServletRequest, response: HttpServletResponse, chain: FilterChain) {
        if (!request.requestURI.startsWith("/api") || request.requestURI.startsWith("/api/health")) {
            chain.doFilter(request,response); return
        }
        val isLogin = request.requestURI == "/api/auth/login" && request.method == "POST"
        val write = request.method !in listOf("GET","HEAD","OPTIONS")
        if (write) {
            val origin = request.getHeader("Origin")
            if (origin != null && origin != URI(publicUrl).let { "${it.scheme}://${it.authority}" }) {
                deny(response,403,"BAD_ORIGIN","허용되지 않은 요청 출처입니다",request); return
            }
        }
        if (isLogin) { chain.doFilter(request,response); return }
        val token = request.cookies?.firstOrNull { it.name == "kanalog_session" }?.value
        val user = token?.let { auth.userByToken(it) }
        if (user == null) { deny(response,401,"UNAUTHORIZED","로그인이 필요합니다",request); return }
        if (write && request.getHeader("X-CSRF-Token") != user.csrfToken) {
            deny(response,403,"CSRF_INVALID","요청 토큰을 확인하세요",request); return
        }
        request.setAttribute("user",user)
        request.setAttribute("token",token)
        chain.doFilter(request,response)
    }
    private fun deny(response:HttpServletResponse,status:Int,code:String,message:String,request:HttpServletRequest) {
        response.status=status
        response.contentType="application/json;charset=UTF-8"
        response.setHeader("Cache-Control","no-store")
        response.writer.write("""{"code":"$code","message":"$message","requestId":"${request.requestId()}"}""")
    }
}
