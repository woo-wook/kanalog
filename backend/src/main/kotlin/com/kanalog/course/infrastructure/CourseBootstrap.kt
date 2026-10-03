package com.kanalog.course.infrastructure

import com.kanalog.course.application.CourseService
import java.util.UUID
import org.springframework.boot.ApplicationArguments
import org.springframework.boot.ApplicationRunner
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.stereotype.Component
import org.springframework.web.bind.annotation.*

@Component
class CourseBootstrap(private val jdbc:JdbcTemplate,private val courses:CourseService):ApplicationRunner {
    override fun run(args:ApplicationArguments) {
        jdbc.query("select id from app_user",{rs,_->rs.getObject(1,UUID::class.java)}).forEach(courses::synchronize)
    }
}
