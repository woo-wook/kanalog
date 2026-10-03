package com.kanalog.content.application.model


data class NotePage(val content: List<NoteView>, val totalElements: Int, val totalPages: Int, val number: Int)
