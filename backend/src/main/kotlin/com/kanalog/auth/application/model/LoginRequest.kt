package com.kanalog.auth.application.model

import jakarta.validation.constraints.Email
import jakarta.validation.constraints.NotBlank
import java.util.*
import org.springframework.web.bind.annotation.*

data class LoginRequest(@field:Email val email: String, @field:NotBlank val password: String)
