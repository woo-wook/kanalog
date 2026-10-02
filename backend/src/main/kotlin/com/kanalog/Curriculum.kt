package com.kanalog

import jakarta.servlet.http.HttpServletRequest
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.RestController
import java.util.UUID

data class CurriculumView(val version:String,val levels:List<CurriculumLevelView>,
    val recommendedLevelKey:String?,val recommendedLessonId:UUID?)
data class CurriculumLevelView(val key:String,val title:String,val subtitle:String,val jlptLevel:String?,val position:Int,
    val goal:String,val outcomes:List<String>,val units:List<CurriculumUnitView>,val totalCards:Int,val studiedCards:Int,
    val completedCards:Int,val totalLessons:Int,val completedLessons:Int,val dueCount:Int,val available:Boolean,val completed:Boolean)
data class CurriculumUnitView(val key:String,val title:String,val goal:String,val position:Int,val optional:Boolean,
    val lessons:List<CurriculumLessonView>,val totalCards:Int,val studiedCards:Int,val completedCards:Int,
    val completedLessons:Int,val completed:Boolean)
data class CurriculumLessonView(val id:UUID,val title:String,val position:Int,val optional:Boolean,val totalCards:Int,
    val studiedCards:Int,val completedCards:Int,val dueCount:Int,val selected:Boolean,val completed:Boolean,
    val courseId:UUID,val kind:String)

class CurriculumBuilder {
    private data class Level(val key:String,val title:String,val subtitle:String,val jlpt:String?,val goal:String,val outcomes:List<String>)
    private val definitions=listOf(
        Level("starter","왕초보","일본어 문자부터",null,"히라가나와 가타카나 기본 46자를 각각 읽는 첫 연습을 마칩니다.",
            listOf("히라가나 기본 문자와 읽기를 연결합니다.","가타카나 기본 문자와 읽기를 연결합니다.","탁음·반탁음·요음은 선택해서 더 연습합니다.")),
        Level("n5","입문","N5 · 기초 단어와 문장","N5","N5 어휘의 읽기와 한국어 뜻, 확보된 문법 설명과 예문을 연습합니다.",
            listOf("N5 단어를 보고 읽기와 뜻을 떠올립니다.","덱에 있는 기초 문법의 설명과 예문을 확인합니다.")),
        Level("n4","초급","N4 · 단어와 문장 넓히기","N4","N4 어휘와 문법을 단위별로 나누어 반복 연습합니다.",
            listOf("N4 단어의 읽기와 뜻을 떠올립니다.","확보된 N4 문법과 예문을 회상합니다.")),
        Level("n3","중급","N3 · 읽기와 표현 확장","N3","N3 어휘의 읽기와 의미, 문법 설명을 단계적으로 회상합니다.",
            listOf("N3 어휘의 읽기와 여러 의미를 확인합니다.","덱에 있는 N3 문법과 예문을 반복합니다.")),
        Level("n2","중고급","N2 · 어휘와 문법 심화","N2","N2 어휘와 문법을 복습 가능한 작은 단위로 연습합니다.",
            listOf("N2 어휘의 읽기와 한국어 뜻을 회상합니다.","확보된 N2 문법 설명과 예문을 확인합니다.")),
        Level("n1","고급","N1 · 고급 어휘와 문법","N1","N1 어휘와 문법의 첫 연습을 마치고 FSRS 복습을 이어갑니다.",
            listOf("N1 어휘의 읽기와 의미를 반복 연습합니다.","덱에 있는 N1 문법과 예문을 회상합니다."))
    )

    fun build(courses:List<CourseView>):CurriculumView {
        val levels=definitions.mapIndexed { index,level ->
            val units=if(level.key=="starter") kanaUnits(courses) else maxUnits(courses.filter { it.level==level.jlpt },level)
            val core=units.filter { !it.optional }.flatMap { it.lessons }.filter { it.totalCards>0 }
            CurriculumLevelView(level.key,level.title,level.subtitle,level.jlpt,index,level.goal,level.outcomes,units,
                core.sumOf { it.totalCards },core.sumOf { it.studiedCards },core.sumOf { it.completedCards },
                core.size,core.count { it.completed },units.flatMap { it.lessons }.sumOf { it.dueCount },
                units.any { it.totalCards>0 },core.isNotEmpty() && core.all { it.completed })
        }
        val all=levels.flatMap { level -> level.units.flatMap { unit ->
            unit.lessons.map { lesson -> Triple(level.key,unit.optional,lesson) }
        } }.filter { it.third.totalCards>0 }
        val recommended=all.firstOrNull { (_,_,lesson) -> lesson.selected && (!lesson.completed || lesson.dueCount>0) }
            ?: all.firstOrNull { (_,optional,lesson) -> !optional && !lesson.completed }
            ?: all.firstOrNull { (_,_,lesson) -> !lesson.completed }
            ?: all.firstOrNull { (_,_,lesson) -> lesson.dueCount>0 }
        return CurriculumView("2",levels,recommended?.first,recommended?.third?.id)
    }

    private fun kanaUnits(courses:List<CourseView>):List<CurriculumUnitView> {
        val core=mutableListOf<CurriculumUnitView>()
        val optional=mutableListOf<CurriculumUnitView>()
        for(kind in listOf("hiragana","katakana")) {
            val title=if(kind=="katakana") "가타카나" else "히라가나"
            val lessons=lessons(courses.filter { it.kind==kind })
            fun combined(rows:List<CurriculumLessonView>,label:String):List<CurriculumLessonView> {
                val active=rows.filter {it.totalCards>0}
                val first=active.firstOrNull() ?: rows.firstOrNull() ?: return emptyList()
                return listOf(first.copy(title=label,totalCards=active.sumOf{it.totalCards},
                    studiedCards=active.sumOf{it.studiedCards},completedCards=active.sumOf{it.completedCards},
                    dueCount=active.sumOf{it.dueCount},selected=active.any{it.selected},
                    completed=active.isNotEmpty() && active.all{it.completed}))
            }
            val basic=combined(lessons.filter { !it.optional },title)
            if(basic.isNotEmpty()) core+=unit("$kind-basic",title,"행 구분 없이 전체 문자를 연습합니다.",false,basic)
            val extra=combined(lessons.filter { it.optional },"$title 확장")
            if(extra.isNotEmpty()) optional+=unit("$kind-extra","$title 확장", "탁음·반탁음·요음을 선택해 함께 연습합니다.",true,extra)
        }
        return (core+optional).mapIndexed { index,unit -> unit.copy(position=index) }
    }
    private fun maxUnits(courses:List<CourseView>,level:Level):List<CurriculumUnitView> {
        val vocabulary=lessons(courses.filter { it.kind=="vocabulary" })
        val grammar=lessons(courses.filter { it.kind=="grammar" })
        val count=maxOf((vocabulary.size+3)/4,(grammar.size+1)/2)
        return (0 until count).map { index ->
            val words=vocabulary.subList(index*vocabulary.size/count,(index+1)*vocabulary.size/count)
            val patterns=grammar.subList(index*grammar.size/count,(index+1)*grammar.size/count)
            val ordered=listOfNotNull(words.getOrNull(0),words.getOrNull(1),patterns.getOrNull(0),
                words.getOrNull(2),words.getOrNull(3),patterns.getOrNull(1))
            unit("${level.key}-unit-${index+1}","${level.title} 단어와 문장 ${(index+1).toString().padStart(2,'0')}",
                "${level.jlpt} 단어 ${words.size}개 레슨 · 문법 ${patterns.size}개 레슨으로 읽기·뜻과 예문을 회상합니다.",false,ordered).copy(position=index)
        }
    }
    private fun lessons(courses:List<CourseView>):List<CurriculumLessonView> = courses.sortedWith(compareBy({it.position},{it.id})).flatMap { course ->
        course.lessons.sortedBy { it.position }.map { lesson -> CurriculumLessonView(lesson.id,lesson.title,lesson.position,
            lesson.optional,lesson.totalCards,lesson.studiedCards,lesson.completedCards,lesson.dueCount,lesson.selected,
            lesson.completed,course.id,course.kind) }
    }
    private fun unit(key:String,title:String,goal:String,optional:Boolean,lessons:List<CurriculumLessonView>):CurriculumUnitView {
        val active=lessons.filter { it.totalCards>0 }
        return CurriculumUnitView(key,title,goal,0,optional,lessons,active.sumOf { it.totalCards },active.sumOf { it.studiedCards },
            active.sumOf { it.completedCards },active.count { it.completed },active.isNotEmpty() && active.all { it.completed })
    }
}

@Service
class CurriculumService(private val courses:CourseService) {
    fun get(owner:UUID):CurriculumView = CurriculumBuilder().build(courses.list(owner))
    fun level(owner:UUID,key:String):CurriculumLevelView = get(owner).levels.firstOrNull { it.key==key }
        ?: fail("CURRICULUM_LEVEL_NOT_FOUND","학습 레벨을 찾을 수 없습니다",HttpStatus.NOT_FOUND)
}

@RestController
class CurriculumController(private val curriculum:CurriculumService) {
    @GetMapping("/api/curriculum") fun get(request:HttpServletRequest)=curriculum.get(request.user().id)
    @GetMapping("/api/curriculum/levels/{key}") fun level(@PathVariable key:String,request:HttpServletRequest)=curriculum.level(request.user().id,key)
}
