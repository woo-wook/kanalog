package com.kanalog.course.infrastructure

import com.kanalog.course.application.CourseService
import com.kanalog.course.application.port.out.CourseStore
import org.springframework.boot.ApplicationArguments
import org.springframework.boot.ApplicationRunner
import org.springframework.stereotype.Component

@Component
class CourseBootstrap(private val store:CourseStore,private val courses:CourseService):ApplicationRunner {
    override fun run(args:ApplicationArguments) {
        store.owners().forEach(courses::synchronize)
    }
}
