package com.kanalog.curriculum.domain

data class CurriculumUnitView(
    val key: String,
    val title: String,
    val goal: String,
    val position: Int,
    val optional: Boolean,
    val lessons: List<CurriculumLessonView>,
    val totalCards: Int,
    val studiedCards: Int,
    val completedCards: Int,
    val completedLessons: Int,
    val completed: Boolean,
)
