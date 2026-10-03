package com.kanalog.content.application.model

import org.springframework.web.bind.annotation.*

data class NotePage(val content: List<NoteView>, val totalElements: Int, val totalPages: Int, val number: Int)
