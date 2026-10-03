package com.kanalog.account.infrastructure

import com.kanalog.account.application.port.out.AccountStore
import com.kanalog.account.domain.AppUserEntity
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.stereotype.Repository
import java.util.UUID

@Repository
class AccountRepositoryAdapter(
    private val users: JpaAppUserRepository,
    private val jdbc: JdbcTemplate,
) : AccountStore {
    override fun findByEmail(email: String) = users.findByEmail(email)

    override fun save(account: AppUserEntity) = users.saveAndFlush(account)

    override fun ensureSettings(owner: UUID) {
        jdbc.update("insert into user_settings(user_id) values(?) on conflict do nothing", owner)
    }

    override fun revokeSessions(owner: UUID) {
        jdbc.update("delete from auth_session where user_id=?", owner)
    }
}
