package com.kanalog.auth.domain

import java.util.*
import org.springframework.web.bind.annotation.*

data class UserView(val id: UUID, val email: String, val csrfToken: String)
