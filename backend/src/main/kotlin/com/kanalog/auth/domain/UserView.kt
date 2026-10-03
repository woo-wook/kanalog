package com.kanalog.auth.domain

import java.util.*

data class UserView(val id: UUID, val email: String, val csrfToken: String)
