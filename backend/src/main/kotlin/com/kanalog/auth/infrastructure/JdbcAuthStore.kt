package com.kanalog.auth.infrastructure

import com.kanalog.auth.application.port.out.AuthStore
import com.kanalog.auth.domain.Credentials
import com.kanalog.auth.domain.UserView
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.stereotype.Repository
import java.util.UUID

@Repository
class JdbcAuthStore(
    private val jdbc: JdbcTemplate,
) : AuthStore {
    override fun userByTokenHash(hash: String) =
        jdbc
            .query(
                """select u.id,u.email,s.csrf_token from auth_session s join app_user u on u.id=s.user_id
        where s.token_hash=? and s.expires_at>now()""",
                { rs, _ -> UserView(rs.getObject("id", UUID::class.java), rs.getString("email"), rs.getString("csrf_token")) },
                hash,
            ).firstOrNull()

    override fun blockedUntil(emailHash: String) =
        jdbc
            .query(
                "select blocked_until from login_attempt where email_hash=?",
                { rs, _ -> rs.getTimestamp(1)?.toInstant() },
                emailHash,
            ).firstOrNull()

    override fun credentials(email: String) =
        jdbc
            .query(
                "select id,email,password_hash from app_user where email=?",
                { rs, _ -> Credentials(rs.getObject("id", UUID::class.java), rs.getString("email"), rs.getString("password_hash")) },
                email,
            ).firstOrNull()

    override fun failedLogin(emailHash: String) {
        jdbc.update(
            """insert into login_attempt(email_hash,failures,blocked_until,updated_at)
               values(?,1,null,now()) on conflict(email_hash) do update set
               failures=case when login_attempt.updated_at < now()-interval '15 minutes'
                   or login_attempt.blocked_until<=now() then 1 else login_attempt.failures+1 end,
               blocked_until=case when login_attempt.updated_at < now()-interval '15 minutes'
                   or login_attempt.blocked_until<=now() then null
                   when login_attempt.failures>=4 then now()+interval '15 minutes' else null end,
               updated_at=now()""",
            emailHash,
        )
    }

    override fun clearLoginFailures(emailHash: String) {
        jdbc.update("delete from login_attempt where email_hash=?", emailHash)
    }

    override fun createSession(
        tokenHash: String,
        owner: UUID,
        csrf: String,
    ) {
        jdbc.update(
            "insert into auth_session(token_hash,user_id,csrf_token,expires_at) values(?,?,?,now()+interval '30 days')",
            tokenHash,
            owner,
            csrf,
        )
    }

    override fun revokeSession(tokenHash: String) {
        jdbc.update("delete from auth_session where token_hash=?", tokenHash)
    }
}
