package com.kanalog.imports.application

import com.kanalog.course.application.CourseService
import com.kanalog.imports.application.model.ImportResult
import com.kanalog.imports.application.port.out.MaxImportPort
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.nio.file.Path
import java.util.UUID

@Service
class MaxImportService(
    private val importer: MaxImportPort,
    private val courses: CourseService,
) {
    @Transactional
    fun importData(
        owner: UUID,
        directory: Path,
    ): ImportResult {
        val result = importer.importData(owner, directory)
        courses.synchronize(owner)
        return result
    }

    @Transactional
    fun refreshGrammarFocus(
        owner: UUID,
        directory: Path,
    ): Int = importer.refreshGrammarFocus(owner, directory)

    @Transactional
    fun refreshReadings(
        owner: UUID,
        directory: Path,
    ): Int = importer.refreshReadings(owner, directory)
}
