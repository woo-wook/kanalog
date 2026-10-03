package com.kanalog.auth.application.port.out
interface PasswordHasher {
    fun matches(password: String, hash: String): Boolean
    fun encode(password: String): String
}
