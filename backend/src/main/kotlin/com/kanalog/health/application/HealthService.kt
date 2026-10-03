package com.kanalog.health.application

import com.kanalog.health.application.port.out.DatabaseAvailability
import org.springframework.stereotype.Service

@Service
class HealthService(private val database: DatabaseAvailability) {
    fun ready() = database.isAvailable()
}
