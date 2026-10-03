package com.kanalog.study.application.model

import com.kanalog.study.domain.KanaMixRequest
import java.time.*
import java.util.*

data class SessionRequest(val deckId: UUID? = null, val lessonId: UUID? = null, val kana: KanaMixRequest? = null, val practice:Boolean = false)
