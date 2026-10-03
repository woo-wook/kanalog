package com.kanalog.progress.application.model

import java.time.Instant
import org.springframework.web.bind.annotation.*

data class StatsView(val answers7Days: Int, val uniqueCards7Days: Int, val answers30Days: Int,
                     val uniqueCards30Days: Int, val learnedCards: Int, val unseenCards: Int,
                     val dueCount: Int, val streak: Int, val lastStudiedAt: Instant?, val decks: List<DeckProgress>)
