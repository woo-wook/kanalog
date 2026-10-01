package com.kanalog

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.Table
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Instant
import java.util.UUID

@Entity
@Table(name="app_user")
class AppUserEntity(
    @Id @GeneratedValue(strategy=GenerationType.UUID) var id:UUID? = null,
    @Column(nullable=false,unique=true,length=320) var email:String = "",
    @Column(name="password_hash",nullable=false,length=100) var passwordHash:String = "",
    @Column(nullable=false,length=80) var timezone:String = "Asia/Seoul",
    @Column(name="created_at",nullable=false) var createdAt:Instant = Instant.now()
)

interface AppUserRepository:JpaRepository<AppUserEntity,UUID> {
    fun findByEmail(email:String):AppUserEntity?
}

@Service
class AccountAdminService(private val users:AppUserRepository,private val jdbc:JdbcTemplate,private val courses:CourseService) {
    @Transactional
    fun create(email:String,hash:String):Boolean {
        val existing=users.findByEmail(email)
        if(existing!=null) {
            jdbc.update("insert into user_settings(user_id) values(?) on conflict do nothing",requireNotNull(existing.id))
            courses.synchronize(requireNotNull(existing.id))
            return false
        }
        val account=users.saveAndFlush(AppUserEntity(email=email,passwordHash=hash))
        jdbc.update("insert into user_settings(user_id) values(?) on conflict do nothing",requireNotNull(account.id))
        courses.synchronize(requireNotNull(account.id))
        return true
    }
    @Transactional
    fun reset(email:String,hash:String) {
        val account=users.findByEmail(email) ?: error("Account does not exist")
        account.passwordHash=hash
        users.saveAndFlush(account)
        jdbc.update("delete from auth_session where user_id=?",requireNotNull(account.id))
    }
    fun idByEmail(email:String):UUID?=users.findByEmail(email)?.id
}
