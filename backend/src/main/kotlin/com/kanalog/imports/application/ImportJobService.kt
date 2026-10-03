package com.kanalog.imports.application

import com.kanalog.common.error.FailureStatus
import com.kanalog.common.error.fail
import com.kanalog.imports.application.model.ImportResult
import com.kanalog.imports.application.port.out.ImportJobStore
import org.springframework.stereotype.Service
import java.util.UUID

@Service
class ImportJobService(
    private val jobs: ImportJobStore,
) {
    fun list(owner: UUID) = jobs.list(owner)

    fun get(
        owner: UUID,
        id: UUID,
    ) = jobs.find(owner, id)
        ?: fail("IMPORT_NOT_FOUND", "가져오기 기록을 찾을 수 없습니다", FailureStatus.NOT_FOUND)

    fun start(
        owner: UUID,
        fileName: String,
    ): UUID = UUID.randomUUID().also { jobs.start(owner, it, fileName) }

    fun succeed(
        owner: UUID,
        id: UUID,
        result: ImportResult,
    ) = jobs.succeed(owner, id, result)

    fun failed(
        owner: UUID,
        id: UUID,
        error: Exception,
    ) = jobs.fail(owner, id, error.message ?: error.javaClass.simpleName)
}
