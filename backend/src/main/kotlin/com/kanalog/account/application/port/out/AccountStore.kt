package com.kanalog.account.application.port.out
import com.kanalog.account.domain.AppUserEntity
import java.util.UUID
interface AccountStore {
    fun findByEmail(email: String): AppUserEntity?
    fun save(account: AppUserEntity): AppUserEntity
    fun ensureSettings(owner: UUID)
    fun revokeSessions(owner: UUID)
}
