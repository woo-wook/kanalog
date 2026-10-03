package com.kanalog.common.error

import java.util.*
import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.*

class ApiFailure(val code: String, override val message: String, val status: HttpStatus) : RuntimeException(message)
