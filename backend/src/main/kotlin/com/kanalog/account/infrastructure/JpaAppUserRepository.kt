package com.kanalog.account.infrastructure

import com.kanalog.account.domain.AppUserEntity
import org.springframework.data.jpa.repository.JpaRepository
import java.util.UUID

interface JpaAppUserRepository : JpaRepository<AppUserEntity, UUID> {
    fun findByEmail(email: String): AppUserEntity?
}
