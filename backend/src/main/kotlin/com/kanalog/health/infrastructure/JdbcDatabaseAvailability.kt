package com.kanalog.health.infrastructure

import com.kanalog.health.application.port.out.DatabaseAvailability
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.stereotype.Component

@Component
class JdbcDatabaseAvailability(private val jdbc: JdbcTemplate): DatabaseAvailability {
    override fun isAvailable(): Boolean = try {
        jdbc.queryForObject("select 1", Int::class.java) == 1
    } catch (_: Exception) { false }
}
