package com.kanalog.auth.application

import com.kanalog.auth.domain.UserView
import com.kanalog.common.crypto.randomToken
import com.kanalog.common.crypto.sha256
import com.kanalog.common.error.fail
import java.time.Instant
import java.util.*
import org.springframework.http.HttpStatus
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.stereotype.Service
import org.springframework.web.bind.annotation.*

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
