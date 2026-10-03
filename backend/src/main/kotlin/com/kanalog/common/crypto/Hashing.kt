package com.kanalog.common.crypto

import java.security.MessageDigest
import java.util.*

fun sha256(value: String): String = MessageDigest.getInstance("SHA-256").digest(value.toByteArray())
    .joinToString("") { "%02x".format(it) }
