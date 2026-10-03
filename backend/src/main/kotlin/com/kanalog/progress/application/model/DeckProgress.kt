package com.kanalog.progress.application.model

import java.util.UUID
import org.springframework.web.bind.annotation.*

data class DeckProgress(val deckId: UUID, val title: String, val totalCards: Int, val studiedCards: Int)
