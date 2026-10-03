package com.kanalog.study.infrastructure
import com.kanalog.study.application.port.out.KanaCardQuery
import com.kanalog.study.domain.KanaMixRequest
import java.util.UUID
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.stereotype.Repository
@Repository
class JdbcKanaCardQuery(private val jdbc: JdbcTemplate) : KanaCardQuery {
    override fun cards(owner: UUID, input: KanaMixRequest): List<UUID> {
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
