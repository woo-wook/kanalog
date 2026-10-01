package com.kanalog

import jakarta.servlet.FilterChain
import jakarta.servlet.http.Cookie
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import jakarta.validation.Valid
import jakarta.validation.constraints.Email
import jakarta.validation.constraints.NotBlank
import org.springframework.beans.factory.annotation.Value
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.http.converter.HttpMessageNotReadableException
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.stereotype.Component
import org.springframework.stereotype.Service
import org.springframework.web.bind.MethodArgumentNotValidException
import org.springframework.web.bind.annotation.*
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException
import org.springframework.web.filter.OncePerRequestFilter
import java.net.URI
import java.security.MessageDigest
import java.security.SecureRandom
import java.time.Instant
import java.util.*

fun sha256(value: String): String = MessageDigest.getInstance("SHA-256").digest(value.toByteArray())
    .joinToString("") { "%02x".format(it) }
fun randomToken(): String = ByteArray(32).also { SecureRandom().nextBytes(it) }
    .let { Base64.getUrlEncoder().withoutPadding().encodeToString(it) }

class ApiFailure(val code: String, override val message: String, val status: HttpStatus) : RuntimeException(message)
fun fail(code: String, message: String, status: HttpStatus = HttpStatus.BAD_REQUEST): Nothing =
    throw ApiFailure(code, message, status)

data class LoginRequest(@field:Email val email: String, @field:NotBlank val password: String)
data class UserView(val id: UUID, val email: String, val csrfToken: String)

@Service
class AuthService(private val jdbc: JdbcTemplate) {
    private val encoder: PasswordEncoder = BCryptPasswordEncoder()
    fun userByToken(token: String): UserView? = jdbc.query(
        """select u.id,u.email,s.csrf_token from auth_session s join app_user u on u.id=s.user_id
           where s.token_hash=? and s.expires_at>now()""",
        { rs, _ -> UserView(rs.getObject("id", UUID::class.java), rs.getString("email"), rs.getString("csrf_token")) },
        sha256(token)
    ).firstOrNull()
    fun login(email: String, password: String): Pair<String, UserView> {
        val normalized = email.trim().lowercase(Locale.ROOT)
        val key = sha256(normalized)
        val blocked = jdbc.query("select blocked_until from login_attempt where email_hash=?",
            { rs, _ -> rs.getTimestamp(1)?.toInstant() }, key).firstOrNull()
        if (blocked != null && blocked.isAfter(Instant.now())) fail("LOGIN_LIMIT", "잠시 후 다시 시도하세요", HttpStatus.TOO_MANY_REQUESTS)
        val match = jdbc.query("select id,email,password_hash from app_user where email=?",
            { rs, _ -> Triple(rs.getObject("id", UUID::class.java), rs.getString("email"), rs.getString("password_hash")) }, normalized).firstOrNull()
        if (match == null || !encoder.matches(password, match.third)) {
            jdbc.update("""insert into login_attempt(email_hash,failures,blocked_until,updated_at)
               values(?,1,null,now()) on conflict(email_hash) do update set
               failures=case when login_attempt.updated_at < now()-interval '15 minutes'
                   or login_attempt.blocked_until<=now() then 1 else login_attempt.failures+1 end,
               blocked_until=case when login_attempt.updated_at < now()-interval '15 minutes'
                   or login_attempt.blocked_until<=now() then null
                   when login_attempt.failures>=4 then now()+interval '15 minutes' else null end,
               updated_at=now()""", key)
            fail("BAD_CREDENTIALS", "로그인 정보를 확인하세요", HttpStatus.UNAUTHORIZED)
        }
        jdbc.update("delete from login_attempt where email_hash=?", key)
        val token = randomToken()
        val csrf = randomToken()
        jdbc.update("insert into auth_session(token_hash,user_id,csrf_token,expires_at) values(?,?,?,now()+interval '30 days')",
            sha256(token), match.first, csrf)
        return token to UserView(match.first, match.second, csrf)
    }
    fun logout(token: String) { jdbc.update("delete from auth_session where token_hash=?", sha256(token)) }
}

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

@RestController
class AuthController(private val auth: AuthService, @Value("\${app.cookie-secure:false}") private val secure: Boolean) {
    @PostMapping("/api/auth/login")
    fun login(@Valid @RequestBody body: LoginRequest, response: HttpServletResponse): UserView {
        val (token,user) = auth.login(body.email,body.password)
        response.addHeader("Set-Cookie", "kanalog_session=$token; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000${if (secure) "; Secure" else ""}")
        return user
    }
    @PostMapping("/api/auth/logout")
    fun logout(request: HttpServletRequest, response: HttpServletResponse) {
        auth.logout(request.getAttribute("token") as String)
        response.addHeader("Set-Cookie", "kanalog_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${if (secure) "; Secure" else ""}")
    }
    @GetMapping("/api/me")
    fun me(request: HttpServletRequest) = request.user()
}

fun HttpServletRequest.user(): UserView = getAttribute("user") as? UserView
    ?: fail("UNAUTHORIZED","로그인이 필요합니다",HttpStatus.UNAUTHORIZED)

@RestControllerAdvice
class Errors {
    @ExceptionHandler(ApiFailure::class)
    fun api(e: ApiFailure, request: HttpServletRequest) =
        ResponseEntity.status(e.status).body(mapOf("code" to e.code,"message" to e.message,"requestId" to request.requestId()))
    @ExceptionHandler(MethodArgumentNotValidException::class)
    fun validation(e: MethodArgumentNotValidException, request: HttpServletRequest) =
        ResponseEntity.badRequest().body(mapOf("code" to "INVALID_INPUT", "message" to "입력값을 확인하세요",
            "fieldErrors" to e.bindingResult.fieldErrors.associate { it.field to (it.defaultMessage ?: "올바르지 않습니다") },
            "requestId" to request.requestId()))
    @ExceptionHandler(HttpMessageNotReadableException::class, MethodArgumentTypeMismatchException::class)
    fun malformed(e: Exception, request: HttpServletRequest) =
        ResponseEntity.badRequest().body(mapOf("code" to "INVALID_INPUT", "message" to "요청 형식을 확인하세요",
            "requestId" to request.requestId()))
    @ExceptionHandler(Exception::class)
    fun unexpected(e: Exception, request: HttpServletRequest) =
        ResponseEntity.status(500).body(mapOf("code" to "INTERNAL_ERROR","message" to "요청을 처리하지 못했습니다","requestId" to request.requestId()))
}
fun HttpServletRequest.requestId(): String = getHeader("X-Request-ID")?.takeIf { it.matches(Regex("[A-Za-z0-9._-]{1,100}")) }
    ?: UUID.randomUUID().toString()
