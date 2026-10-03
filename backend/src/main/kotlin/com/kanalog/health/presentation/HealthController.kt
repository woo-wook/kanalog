package com.kanalog.health.presentation

import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import com.kanalog.health.application.HealthService
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RestController

@RestController
class HealthController(private val health: HealthService) {
    @GetMapping("/api/health/live") fun live() = mapOf("status" to "UP")
    @GetMapping("/api/health/ready") fun ready(): ResponseEntity<Map<String,String>> = if(health.ready()) {
        ResponseEntity.ok(mapOf("status" to "UP"))
    } else {
        ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(mapOf("status" to "DOWN"))
    }
}
