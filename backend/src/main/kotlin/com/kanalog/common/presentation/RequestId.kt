package com.kanalog.common.presentation

import jakarta.servlet.http.HttpServletRequest
import java.util.*
import org.springframework.web.bind.annotation.*

fun HttpServletRequest.requestId(): String = getHeader("X-Request-ID")?.takeIf { it.matches(Regex("[A-Za-z0-9._-]{1,100}")) }
    ?: UUID.randomUUID().toString()
