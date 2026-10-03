package com.kanalog.curriculum.domain

import java.util.UUID

data class CurriculumLessonView(val id:UUID,val title:String,val position:Int,val optional:Boolean,val totalCards:Int,
    val studiedCards:Int,val completedCards:Int,val dueCount:Int,val selected:Boolean,val completed:Boolean,
    val courseId:UUID,val kind:String)
