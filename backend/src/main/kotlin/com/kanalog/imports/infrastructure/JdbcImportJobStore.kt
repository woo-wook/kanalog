package com.kanalog.imports.infrastructure

import com.kanalog.imports.application.model.ImportResult
import com.kanalog.imports.application.model.ImportView
import com.kanalog.imports.application.port.out.ImportJobStore
import java.util.UUID
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.stereotype.Repository

@Repository
class JdbcImportJobStore(private val jdbc: JdbcTemplate): ImportJobStore {
    override fun list(owner: UUID) = jdbc.query("""select id,file_name,status,started_at,finished_at,report_json,error_message
        from import_job where owner_id=? order by started_at desc limit 100""", ::map, owner)
    override fun find(owner: UUID, id: UUID) = jdbc.query("""select id,file_name,status,started_at,finished_at,report_json,error_message
        from import_job where owner_id=? and id=?""", ::map, owner, id).firstOrNull()
    override fun start(owner: UUID, id: UUID, fileName: String) {
        jdbc.update("insert into import_job(id,owner_id,file_name,status,started_at) values(?,?,?,'RUNNING',now())", id, owner, fileName)
    }
    override fun succeed(owner: UUID, id: UUID, result: ImportResult) {
        jdbc.update("update import_job set source_id=?,status='SUCCESS',finished_at=now(),report_json=? where id=? and owner_id=?",
            result.sourceId, result.report, id, owner)
    }
    override fun fail(owner: UUID, id: UUID, message: String) {
        jdbc.update("update import_job set status='FAILED',finished_at=now(),error_message=? where id=? and owner_id=?", message.take(500), id, owner)
    }
    private fun map(rs:java.sql.ResultSet,ignored:Int)=ImportView(rs.getObject("id",UUID::class.java),
        rs.getString("file_name"),rs.getString("status"),rs.getTimestamp("started_at").toInstant(),
        rs.getTimestamp("finished_at")?.toInstant(),rs.getString("report_json"),rs.getString("error_message"))
}
