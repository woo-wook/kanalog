package com.kanalog.common.error

import com.kanalog.common.error.FailureStatus

fun fail(
    code: String,
    message: String,
    status: FailureStatus = FailureStatus.BAD_REQUEST,
): Nothing = throw ApiFailure(code, message, status)
