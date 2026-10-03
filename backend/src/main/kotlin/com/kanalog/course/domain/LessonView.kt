package com.kanalog.course.domain

import java.util.UUID
import org.springframework.web.bind.annotation.*

data class LessonView(val id:UUID,val title:String,val position:Int,val optional:Boolean,val totalCards:Int,
    val studiedCards:Int,val completedCards:Int,val dueCount:Int,val selected:Boolean,val completed:Boolean)
