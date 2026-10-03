package com.kanalog.curriculum.domain



data class CurriculumLevelView(val key:String,val title:String,val subtitle:String,val jlptLevel:String?,val position:Int,
    val goal:String,val outcomes:List<String>,val units:List<CurriculumUnitView>,val totalCards:Int,val studiedCards:Int,
    val completedCards:Int,val totalLessons:Int,val completedLessons:Int,val dueCount:Int,val available:Boolean,val completed:Boolean)
