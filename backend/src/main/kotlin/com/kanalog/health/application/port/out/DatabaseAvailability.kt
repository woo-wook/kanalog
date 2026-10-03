package com.kanalog.health.application.port.out

interface DatabaseAvailability {
    fun isAvailable(): Boolean
}
