package com.kanalog.account.application

import com.kanalog.account.application.port.out.AccountStore
import com.kanalog.account.domain.AppUserEntity
import com.kanalog.course.application.CourseService
import java.util.UUID
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
class AccountAdminService(private val users:AccountStore,private val courses:CourseService) {
    @Transactional
    fun create(email:String,hash:String):Boolean {
        val existing=users.findByEmail(email)
        if(existing!=null) {
            users.ensureSettings(requireNotNull(existing.id))
            courses.synchronize(requireNotNull(existing.id))
            return false
        }
        val account=users.save(AppUserEntity(email=email,passwordHash=hash))
        users.ensureSettings(requireNotNull(account.id))
        courses.synchronize(requireNotNull(account.id))
        return true
    }
    @Transactional
    fun reset(email:String,hash:String) {
        val account=users.findByEmail(email) ?: error("Account does not exist")
        account.passwordHash=hash
        users.save(account)
        users.revokeSessions(requireNotNull(account.id))
    }
    fun idByEmail(email:String):UUID?=users.findByEmail(email)?.id
}
