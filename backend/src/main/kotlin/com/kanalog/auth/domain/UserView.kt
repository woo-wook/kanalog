package com.kanalog.auth.domain

import java.util.UUID

data class UserView(
    val id: UUID,
    val email: String,
    val csrfToken: String,
)
