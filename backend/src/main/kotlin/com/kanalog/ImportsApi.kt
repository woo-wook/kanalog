package com.kanalog

import jakarta.servlet.http.HttpServletRequest
import org.springframework.http.HttpStatus
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.RestController
import java.time.Instant
import java.util.UUID

data class ImportView(val id:UUID,val fileName:String,val status:String,val startedAt:Instant,
    val finishedAt:Instant?,val reportJson:String?,val errorMessage:String?)

@RestController
class ImportsController(private val jdbc:JdbcTemplate) {
    @GetMapping("/api/imports") fun list(request:HttpServletRequest):List<ImportView> = jdbc.query("""
        select id,file_name,status,started_at,finished_at,report_json,error_message from import_job
        where owner_id=? order by started_at desc limit 100""",::map,request.user().id)
    @GetMapping("/api/imports/{id}") fun get(@PathVariable id:UUID,request:HttpServletRequest):ImportView = jdbc.query("""
        select id,file_name,status,started_at,finished_at,report_json,error_message from import_job
        where owner_id=? and id=?""",::map,request.user().id,id).firstOrNull()
        ?: fail("IMPORT_NOT_FOUND","가져오기 기록을 찾을 수 없습니다",HttpStatus.NOT_FOUND)
    private fun map(rs:java.sql.ResultSet,ignored:Int)=ImportView(rs.getObject("id",UUID::class.java),
        rs.getString("file_name"),rs.getString("status"),rs.getTimestamp("started_at").toInstant(),
        rs.getTimestamp("finished_at")?.toInstant(),rs.getString("report_json"),rs.getString("error_message"))
}
