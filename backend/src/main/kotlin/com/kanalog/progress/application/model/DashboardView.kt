package com.kanalog.progress.application.model

import java.util.UUID
import org.springframework.web.bind.annotation.*

data class DashboardView(val dueCount: Int, val newRemaining: Int, val studiedCardsToday: Int,
                         val answersToday: Int, val streak: Int, val selectedDeckId: UUID?, val activeLessonId: UUID? = null, val activeLessonTitle: String? = null, val dailyNewRemaining: Int = 0)
