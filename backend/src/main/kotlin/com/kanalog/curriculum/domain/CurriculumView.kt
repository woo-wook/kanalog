package com.kanalog.curriculum.domain

import java.util.UUID

data class CurriculumView(val version:String,val levels:List<CurriculumLevelView>,
    val recommendedLevelKey:String?,val recommendedLessonId:UUID?)
