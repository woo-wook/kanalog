package com.kanalog.account.application.port.out

import com.kanalog.account.domain.AppUserRepository
import java.util.UUID

interface AccountStore: AppUserRepository {
    fun ensureSettings(owner: UUID)
    fun revokeSessions(owner: UUID)
}
