package com.kanalog.common.error

import java.util.*
import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.*

fun fail(code: String, message: String, status: HttpStatus = HttpStatus.BAD_REQUEST): Nothing =
    throw ApiFailure(code, message, status)
