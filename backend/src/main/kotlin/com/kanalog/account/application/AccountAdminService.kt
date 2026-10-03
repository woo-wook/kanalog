package com.kanalog.account.application

import com.kanalog.account.domain.AppUserEntity
import com.kanalog.account.infrastructure.AppUserRepository
import com.kanalog.course.application.CourseService
import java.util.UUID
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

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
