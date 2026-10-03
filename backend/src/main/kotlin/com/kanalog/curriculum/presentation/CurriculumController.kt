package com.kanalog.curriculum.presentation

import com.kanalog.auth.presentation.user
import com.kanalog.curriculum.application.CurriculumService
import jakarta.servlet.http.HttpServletRequest
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.RestController

@RestController
class CurriculumController(private val curriculum:CurriculumService) {
    @GetMapping("/api/curriculum") fun get(request:HttpServletRequest)=curriculum.get(request.user().id)
    @GetMapping("/api/curriculum/levels/{key}") fun level(@PathVariable key:String,request:HttpServletRequest)=curriculum.level(request.user().id,key)
}
