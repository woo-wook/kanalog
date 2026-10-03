package com.kanalog.health.presentation

import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RestController

@RestController
class HealthController(private val jdbc: JdbcTemplate) {
    @GetMapping("/api/health/live") fun live() = mapOf("status" to "UP")
    @GetMapping("/api/health/ready") fun ready(): ResponseEntity<Map<String,String>> = try {
        jdbc.queryForObject("select 1",Int::class.java)
        ResponseEntity.ok(mapOf("status" to "UP"))
    } catch (_:Exception) {
        ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(mapOf("status" to "DOWN"))
    }
}
