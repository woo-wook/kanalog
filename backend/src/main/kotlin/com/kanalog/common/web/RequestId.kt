package com.kanalog.common.web

import jakarta.servlet.http.HttpServletRequest
import java.util.UUID

fun HttpServletRequest.requestId(): String = getHeader("X-Request-ID")?.takeIf { it.matches(Regex("[A-Za-z0-9._-]{1,100}")) }
    ?: UUID.randomUUID().toString()
