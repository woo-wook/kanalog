package com.kanalog.auth.presentation

import com.kanalog.auth.domain.UserView
import com.kanalog.common.error.FailureStatus
import com.kanalog.common.error.fail
import jakarta.servlet.http.HttpServletRequest

fun HttpServletRequest.user(): UserView = getAttribute("user") as? UserView
    ?: fail("UNAUTHORIZED","로그인이 필요합니다",FailureStatus.UNAUTHORIZED)
