package com.kanalog.speech.presentation

import com.kanalog.auth.presentation.user
import com.kanalog.speech.application.SpeechService
import com.kanalog.speech.application.model.SpeechRequest
import jakarta.servlet.http.HttpServletRequest
import jakarta.validation.Valid
import org.springframework.http.MediaType
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RestController

@RestController
class SpeechController(private val speech:SpeechService) {
    @PostMapping("/api/speech")
    fun generate(@Valid @RequestBody input:SpeechRequest, request:HttpServletRequest):ResponseEntity<ByteArray> {
        request.user()
        return ResponseEntity.ok().contentType(MediaType.parseMediaType("audio/wav"))
            .header("Cache-Control","private, no-store").body(speech.generate(input))
    }
}
