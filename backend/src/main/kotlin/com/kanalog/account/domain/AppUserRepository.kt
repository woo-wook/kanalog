package com.kanalog.account.domain

interface AppUserRepository {
    fun findByEmail(email: String): AppUserEntity?
    fun save(account: AppUserEntity): AppUserEntity
}
