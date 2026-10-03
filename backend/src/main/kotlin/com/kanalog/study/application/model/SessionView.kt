package com.kanalog.study.application.model

import java.time.*
import java.util.*
import org.springframework.web.bind.annotation.*

data class SessionView(val id: UUID, val cards: List<CardView>, val answered: Int, val lessonId: UUID? = null, val lessonTitle: String? = null, val practice:Boolean = false, val queueInfo:QueueInfo? = null)
