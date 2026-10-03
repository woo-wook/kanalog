package com.kanalog.content.presentation

import com.kanalog.auth.presentation.user
import com.kanalog.content.application.NoteService
import com.kanalog.content.application.model.NoteCreate
import com.kanalog.content.application.model.NotePatch
import jakarta.servlet.http.HttpServletRequest
import jakarta.validation.Valid
import java.util.UUID
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PatchMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController

@RestController
class NoteController(private val service: NoteService) {
    @GetMapping("/api/notes") fun list(@RequestParam(defaultValue="") query:String,
        @RequestParam(defaultValue="0") page:Int,@RequestParam(defaultValue="20") size:Int,@RequestParam(defaultValue="") kind:String,request:HttpServletRequest)=
        service.list(request.user().id,query,page,size,kind)
    @GetMapping("/api/notes/{id}") fun get(@PathVariable id:UUID,request:HttpServletRequest)=service.get(request.user().id,id)
    @PostMapping("/api/notes") fun create(@Valid @RequestBody body:NoteCreate,request:HttpServletRequest)=service.create(request.user().id,body)
    @PatchMapping("/api/notes/{id}") fun patch(@PathVariable id:UUID,@RequestBody body:NotePatch,request:HttpServletRequest)=
        service.patch(request.user().id,id,body)
}
