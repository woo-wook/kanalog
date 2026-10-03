package com.kanalog.auth.infrastructure

import com.kanalog.auth.application.port.out.PasswordHasher
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder
import org.springframework.stereotype.Component

@Component
class BCryptPasswordHasher : PasswordHasher {
    private val encoder = BCryptPasswordEncoder()

    override fun matches(
        password: String,
        hash: String,
    ) = encoder.matches(password, hash)

    override fun encode(password: String) = requireNotNull(encoder.encode(password))
}
