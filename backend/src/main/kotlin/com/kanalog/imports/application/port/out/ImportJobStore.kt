package com.kanalog.imports.application.port.out

import com.kanalog.imports.application.model.ImportResult
import com.kanalog.imports.application.model.ImportView
import java.util.UUID

interface ImportJobStore {
    fun list(owner: UUID): List<ImportView>
    fun find(owner: UUID, id: UUID): ImportView?
    fun start(owner: UUID, id: UUID, fileName: String)
    fun succeed(owner: UUID, id: UUID, result: ImportResult)
    fun fail(owner: UUID, id: UUID, message: String)
}
