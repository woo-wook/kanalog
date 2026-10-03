package com.kanalog.study.application.model

import com.kanalog.study.domain.KanaMixRequest
import java.time.*
import java.util.*
import org.springframework.web.bind.annotation.*

data class SessionRequest(val deckId: UUID? = null, val lessonId: UUID? = null, val kana: KanaMixRequest? = null, val practice:Boolean = false)
