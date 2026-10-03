package com.kanalog.common.error

import com.kanalog.common.error.FailureStatus

class ApiFailure(val code: String, override val message: String, val status: FailureStatus) : RuntimeException(message)
