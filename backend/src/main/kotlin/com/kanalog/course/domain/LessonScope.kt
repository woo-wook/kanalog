package com.kanalog.course.domain

import java.util.UUID
import org.springframework.web.bind.annotation.*

data class LessonScope(val id:UUID,val deckId:UUID,val title:String)
