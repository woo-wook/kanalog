package com.kanalog.study.application.model

import java.time.*
import java.util.*
import org.springframework.web.bind.annotation.*

data class ReviewRequest(val sessionId: UUID, val cardId: UUID, val version: Long,
                         val rating: String, val idempotencyKey: String)
