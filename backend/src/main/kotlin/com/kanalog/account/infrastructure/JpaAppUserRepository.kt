package com.kanalog.account.infrastructure

import com.kanalog.account.domain.AppUserEntity
import java.util.UUID
import org.springframework.data.jpa.repository.JpaRepository

interface JpaAppUserRepository:JpaRepository<AppUserEntity,UUID> {
    fun findByEmail(email:String):AppUserEntity?
}
