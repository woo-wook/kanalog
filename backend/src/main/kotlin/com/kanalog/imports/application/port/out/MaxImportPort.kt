package com.kanalog.imports.application.port.out

import com.kanalog.imports.application.model.ImportResult
import java.nio.file.Path
import java.util.UUID

interface MaxImportPort {
    fun importData(
        owner: UUID,
        dir: Path,
    ): ImportResult

    fun refreshGrammarFocus(
        owner: UUID,
        dir: Path,
    ): Int
}
