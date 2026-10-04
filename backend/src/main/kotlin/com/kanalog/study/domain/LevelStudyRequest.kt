package com.kanalog.study.domain

import com.kanalog.common.error.fail

data class LevelStudyRequest(
    val level: String? = "N5",
    val kind: String? = null,
    val reviewOnly: Boolean = false,
) {
    init {
        if (level != null && level !in setOf("N5", "N4", "N3", "N2", "N1")) fail("BAD_LEVEL", "학습 레벨을 확인하세요")
        if (kind != null && kind !in setOf("vocabulary", "grammar")) fail("BAD_KIND", "단어 또는 문법을 선택하세요")
        if (level == null && !reviewOnly) fail("BAD_STUDY_SCOPE", "새 학습은 레벨을 선택하세요")
    }

    fun title(): String =
        "${level ?: "모든 레벨"} · ${when (kind) {
            "vocabulary" -> "단어"
            "grammar" -> "문법"
            else -> "전체"
        }} ${if (reviewOnly) "복습" else "연습"}"
}
