package com.kanalog.imports.application.port.out

import com.kanalog.imports.application.model.ImportResult
import java.nio.file.Path
import java.util.UUID

interface MaxImportPort {
    fun importData(owner: UUID, directory: Path): ImportResult
    fun refreshGrammarFocus(owner: UUID, directory: Path): Int
}
