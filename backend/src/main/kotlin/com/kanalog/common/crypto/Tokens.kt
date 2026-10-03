package com.kanalog.common.crypto

import java.security.SecureRandom
import java.util.Base64

fun randomToken(): String = ByteArray(32).also { SecureRandom().nextBytes(it) }
    .let { Base64.getUrlEncoder().withoutPadding().encodeToString(it) }
