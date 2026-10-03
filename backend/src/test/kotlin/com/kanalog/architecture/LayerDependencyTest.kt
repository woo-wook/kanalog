package com.kanalog.architecture

import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import java.nio.file.Files
import java.nio.file.Path

/** Source-level guard without another production or test dependency. */
class LayerDependencyTest {
    private val source = Path.of("src/main/kotlin/com/kanalog")

    private fun files(layer: String): List<Path> =
        Files.walk(source).use { paths ->
            paths.filter { it.toString().endsWith(".kt") && it.toString().contains("/$layer/") }.toList()
        }

    private fun imports(file: Path) = Files.readAllLines(file).filter { it.startsWith("import ") }.map { it.removePrefix("import ") }

    private fun assertAllowed(
        layer: String,
        rejected: (String) -> Boolean,
    ) {
        val violations = files(layer).flatMap { path -> imports(path).filter(rejected).map { "$path: $it" } }
        assertTrue(files(layer).isNotEmpty(), "The layer must exist")
        assertTrue(violations.isEmpty(), violations.joinToString("\n"))
    }

    @Test fun `domain depends only on domain and pure types with pragmatic JPA annotations`() {
        assertAllowed("domain") {
            it.contains(".application.") || it.contains(".infrastructure.") ||
                it.contains(".presentation.") || it.startsWith("org.springframework") ||
                it.startsWith("tools.jackson") || it.startsWith("jakarta.servlet") || it.startsWith("java.net") ||
                it.startsWith("java.nio.file")
        }
    }

    @Test fun `application orchestrates ports without persistence transport or file operations`() {
        assertAllowed("application") {
            it.contains(".infrastructure.") || it.contains(".presentation.") ||
                it.startsWith("org.springframework.jdbc") || it.startsWith("org.springframework.data") ||
                it.startsWith("org.springframework.http") || it.startsWith("jakarta.servlet") ||
                it.startsWith("java.net") || it.startsWith("java.io.RandomAccessFile") ||
                it.startsWith("java.nio.file.Files") || it.startsWith("tools.jackson") ||
                it.startsWith("io.github.openspacedrepetition")
        }
    }

    @Test fun `presentation cannot use persistence or external service implementations`() {
        assertAllowed("presentation") {
            it.contains(".infrastructure.") || it.startsWith("org.springframework.jdbc") ||
                it.startsWith("org.springframework.data") || it.startsWith("java.net.http") ||
                it.startsWith("java.nio.file.Files") || it.startsWith("java.io.RandomAccessFile")
        }
    }

    @Test fun `infrastructure cannot depend on presentation and transaction boundary is application`() {
        assertAllowed(
            "infrastructure",
        ) { it.contains(".presentation.") || it == "org.springframework.transaction.annotation.Transactional" }
    }

    @Test fun `root contains only the Spring Boot entry point`() {
        val rootFiles =
            Files.list(source).use { paths ->
                paths.filter { it.toString().endsWith(".kt") }.map { it.fileName.toString() }.toList()
            }
        assertTrue(rootFiles == listOf("App.kt"), rootFiles.toString())
    }
}
