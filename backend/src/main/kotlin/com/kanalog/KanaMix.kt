package com.kanalog

import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.stereotype.Service
import java.util.UUID

data class KanaMixRequest(
    val scripts:List<String> = listOf("hiragana"),
    val groups:List<String> = listOf("basic"),
    val size:Int = 10,
    val practice:Boolean = false
) {
    fun validate() {
        if(scripts.isEmpty() || scripts.size>2 || scripts.distinct().size!=scripts.size ||
            scripts.any { it !in setOf("hiragana","katakana") } ||
            groups.isEmpty() || groups.size>4 || groups.distinct().size!=groups.size ||
            groups.any { it !in setOf("basic","voiced","semiVoiced","yoon") } || size !in 1..208)
            fail("BAD_KANA_SCOPE","문자 종류·연습 범위·장수를 확인하세요")
    }
    fun title():String = "${if(scripts.size==2) "가나" else if(scripts.first()=="hiragana") "히라가나" else "가타카나"} ${if(practice) "자유 연습" else "섞어 학습"}"
}

@Service
class KanaMixService(private val jdbc:JdbcTemplate) {
    fun cards(owner:UUID,input:KanaMixRequest):List<UUID> {
        input.validate()
        val rows=input.groups.flatMap { when(it) {
            "basic" -> (0..9).toList(); "voiced" -> (10..13).toList(); "semiVoiced" -> listOf(14); else -> listOf(15)
        } }.joinToString(",")
        val scripts=input.scripts.joinToString(",") { "'$it'" }
        return jdbc.query("""select distinct c.id from card c join lesson_card lc on lc.card_id=c.id
            join course_lesson l on l.id=lc.lesson_id join learning_course co on co.id=l.course_id
            join deck d on d.id=c.deck_id join study_note n on n.id=c.note_id
            where co.owner_id=? and c.owner_id=? and d.owner_id=? and n.owner_id=?
            and co.course_key in ('kana:hiragana','kana:katakana') and n.kind in ($scripts)
            and l.position in ($rows) and c.active=true and d.import_status='READY'""",
            {rs,_->rs.getObject(1,UUID::class.java)},owner,owner,owner,owner)
    }
}
