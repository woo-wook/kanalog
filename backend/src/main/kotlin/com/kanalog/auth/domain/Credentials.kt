package com.kanalog.auth.domain

import java.util.UUID

data class Credentials(val id: UUID, val email: String, val passwordHash: String)
