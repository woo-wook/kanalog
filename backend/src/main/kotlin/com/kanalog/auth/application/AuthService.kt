package com.kanalog.auth.application

import com.kanalog.auth.application.port.out.AuthStore
import com.kanalog.auth.application.port.out.PasswordHasher
import com.kanalog.auth.domain.UserView
import com.kanalog.common.crypto.randomToken
import com.kanalog.common.crypto.sha256
import com.kanalog.common.error.FailureStatus
import com.kanalog.common.error.fail
import java.time.Instant
import java.util.Locale
import org.springframework.stereotype.Service

@Service
class AuthService(private val store: AuthStore, private val passwords: PasswordHasher) {
    fun userByToken(token: String): UserView? = store.userByTokenHash(sha256(token))
    fun login(email: String, password: String): Pair<String, UserView> {
        val normalized = email.trim().lowercase(Locale.ROOT)
        val key = sha256(normalized)
        if(store.blockedUntil(key)?.isAfter(Instant.now()) == true) fail("LOGIN_LIMIT", "잠시 후 다시 시도하세요", FailureStatus.TOO_MANY_REQUESTS)
        val match = store.credentials(normalized)
        if(match == null || !passwords.matches(password, match.passwordHash)) {
            store.failedLogin(key)
            fail("BAD_CREDENTIALS", "로그인 정보를 확인하세요", FailureStatus.UNAUTHORIZED)
        }
        store.clearLoginFailures(key)
        val token = randomToken()
        val csrf = randomToken()
        store.createSession(sha256(token), match.id, csrf)
        return token to UserView(match.id, match.email, csrf)
    }
    fun logout(token: String) = store.revokeSession(sha256(token))
}
