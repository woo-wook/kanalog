package com.kanalog.imports.domain

object MaxImportPolicy {
    const val VERSION = "2.1.2"
    const val CHECKSUM = "c0898a086a7d440e4081c8a68fcd0c63e678bb345012888d1fc8e5270d762532"

    fun requireSupportedSource(
        version: String,
        checksum: String,
    ) {
        check(version == VERSION && checksum == CHECKSUM) { "Unsupported MAX version or checksum" }
    }

    fun requireSupportedCard(
        kind: String,
        direction: String,
    ) {
        check(kind in setOf("vocabulary", "grammar") && direction in setOf("recognition", "recall")) {
            "Unsupported card kind or direction"
        }
    }
}
