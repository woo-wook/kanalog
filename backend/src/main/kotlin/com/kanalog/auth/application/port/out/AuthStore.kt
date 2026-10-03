package com.kanalog.auth.application.port.out

import com.kanalog.auth.domain.Credentials
import com.kanalog.auth.domain.UserView
import java.time.Instant
import java.util.UUID

interface AuthStore {
    fun userByTokenHash(hash: String): UserView?
    fun blockedUntil(emailHash: String): Instant?
    fun credentials(email: String): Credentials?
    fun failedLogin(emailHash: String)
    fun clearLoginFailures(emailHash: String)
    fun createSession(tokenHash: String, owner: UUID, csrf: String)
    fun revokeSession(tokenHash: String)
}
