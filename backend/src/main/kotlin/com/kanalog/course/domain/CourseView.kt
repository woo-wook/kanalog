package com.kanalog.course.domain

import java.util.UUID

data class CourseView(val id:UUID,val title:String,val description:String,val kind:String,val level:String?,
    val position:Int,val totalCards:Int,val studiedCards:Int,val completedCards:Int,val dueCount:Int,
    val lessons:List<LessonView>,val recommendedLessonId:UUID?)
