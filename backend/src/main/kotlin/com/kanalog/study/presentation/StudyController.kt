package com.kanalog.study.presentation

import com.kanalog.auth.presentation.user
import com.kanalog.common.error.fail
import com.kanalog.study.application.StudyService
import com.kanalog.study.application.model.ReviewRequest
import com.kanalog.study.application.model.SessionRequest
import jakarta.servlet.http.HttpServletRequest
import java.time.*
import java.util.*
import com.kanalog.common.error.FailureStatus
import org.springframework.web.bind.annotation.*

@RestController
class StudyController(private val service: StudyService) {
    @GetMapping("/api/decks") fun decks(request:HttpServletRequest)=service.decks(request.user().id)
    @GetMapping("/api/decks/{id}") fun deck(@PathVariable id:UUID,request:HttpServletRequest)=
        service.decks(request.user().id).find{it.id==id} ?: fail("DECK_NOT_FOUND","덱을 찾을 수 없습니다",FailureStatus.NOT_FOUND)
    @PostMapping("/api/decks/{id}/select") fun select(@PathVariable id:UUID,request:HttpServletRequest)=service.select(request.user().id,id)
    @PostMapping("/api/study/sessions") fun start(@RequestBody body:SessionRequest,request:HttpServletRequest)=service.start(request.user().id,body.deckId,body.lessonId,body.kana,body.practice)
    @GetMapping("/api/study/sessions/{id}") fun session(@PathVariable id:UUID,request:HttpServletRequest)=service.session(request.user().id,id)
    @PostMapping("/api/study/reviews") fun review(@RequestBody body:ReviewRequest,request:HttpServletRequest)=service.review(request.user().id,body)
}
