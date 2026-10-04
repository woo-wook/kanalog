package com.kanalog.study.application.model

import com.kanalog.study.domain.KanaMixRequest
import com.kanalog.study.domain.LevelStudyRequest
import java.util.UUID

data class SessionRequest(
    val deckId: UUID? = null,
    val lessonId: UUID? = null,
    val kana: KanaMixRequest? = null,
    val practice: Boolean = false,
    val levelScope: LevelStudyRequest? = null,
)
