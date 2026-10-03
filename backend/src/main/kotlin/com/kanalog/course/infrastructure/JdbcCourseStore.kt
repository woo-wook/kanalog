package com.kanalog.course.infrastructure

import com.kanalog.course.application.port.out.CourseStore
import com.kanalog.course.domain.CoursePlan
import com.kanalog.course.domain.CourseView
import com.kanalog.course.domain.ImportedDeck
import com.kanalog.course.domain.KanaCourse
import com.kanalog.course.domain.LessonScope
import com.kanalog.course.domain.LessonView
import java.util.UUID
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.stereotype.Repository

@Repository
class JdbcCourseStore(private val jdbc:JdbcTemplate) : CourseStore {
    override fun list(owner:UUID):List<CourseView> = jdbc.query("select * from learning_course where owner_id=? order by position,course_key",{rs,_->
        val id=rs.getObject("id",UUID::class.java)
        val kana=rs.getString("kind") in listOf("hiragana","katakana")
        val lessons=jdbc.query("""select l.*,count(c.id) filter(where coalesce(s.suspended,false)=false)::int total,
            count(c.id) filter(where coalesce(s.suspended,false)=false and (s.first_seen_at is not null or p.card_id is not null))::int studied,
            count(c.id) filter(where coalesce(s.suspended,false)=false and (exists(select 1 from review_log r where r.user_id=? and r.card_id=c.id and r.rating in ('GOOD','EASY')) or p.card_id is not null and exists(select 1 from practice_answer a where a.user_id=p.user_id and a.card_id=c.id and a.rating in ('GOOD','EASY'))))::int practiced,
            count(c.id) filter(where coalesce(s.suspended,false)=false and ${if(kana) "p.last_rating in ('AGAIN','HARD')" else "s.first_seen_at is not null and s.due_at<=now()"})::int due,
            (us.active_lesson_id=l.id) selected
            from course_lesson l left join lesson_card lc on lc.lesson_id=l.id
            left join card c on c.id=lc.card_id and c.active=true
            left join user_card_state s on s.card_id=c.id and s.user_id=?
            left join kana_practice_state p on p.card_id=c.id and p.user_id=?
            join user_settings us on us.user_id=? where l.course_id=? group by l.id,us.active_lesson_id order by l.position""",{row,_->
                val total=row.getInt("total");val practiced=row.getInt("practiced")
                LessonView(row.getObject("id",UUID::class.java),row.getString("title"),row.getInt("position"),row.getBoolean("optional"),
                    total,row.getInt("studied"),practiced,row.getInt("due"),row.getBoolean("selected"),total>0 && practiced==total)
            },owner,owner,owner,owner,id)
        CourseView(id,rs.getString("title"),rs.getString("description"),rs.getString("kind"),rs.getString("level"),rs.getInt("position"),
            lessons.sumOf{it.totalCards},lessons.sumOf{it.studiedCards},lessons.sumOf{it.completedCards},lessons.sumOf{it.dueCount},lessons,
            lessons.firstOrNull{it.totalCards>0 && !it.optional && !it.completed}?.id ?: lessons.firstOrNull{it.totalCards>0 && !it.completed}?.id)
    },owner)

    override fun scope(owner:UUID,id:UUID):LessonScope? = jdbc.query("""select l.id,l.deck_id,l.title from course_lesson l
        join learning_course c on c.id=l.course_id where l.id=? and c.owner_id=?""",{rs,_->
        LessonScope(rs.getObject(1,UUID::class.java),rs.getObject(2,UUID::class.java),rs.getString(3))},id,owner).firstOrNull()
    override fun importedDecks(owner: UUID): List<ImportedDeck> = jdbc.query("""select d.id,d.kind,d.level from deck d join content_source s on s.id=d.source_id
        where d.owner_id=? and d.import_status='READY' and s.source_key='jlpt-max' and d.kind in ('vocabulary','grammar')
        order by d.level desc,d.kind desc,d.source_path""", {rs,_->
        val deck = rs.getObject(1,UUID::class.java)
        val cards = jdbc.query("""select c.id from card c join study_note n on n.id=c.note_id where c.deck_id=? and c.owner_id=? and c.active=true
            order by case when n.source_note_id ~ '^[0-9]+$' then n.source_note_id::numeric end nulls last,n.source_note_id,c.source_card_id,c.id""",
            {row,_->row.getObject(1,UUID::class.java)},deck,owner)
        ImportedDeck(deck, rs.getString(2), rs.getString(3), cards)
    }, owner)

    override fun synchronize(owner: UUID, plan: CoursePlan) {
        plan.kana.forEach { seedKana(owner, it) }
        plan.imported.forEach { item ->
            val course = course(owner, item.key, item.title,
                "JLPT MAX 개인 데이터로 연습합니다. 완료 표시는 첫 연습을 마쳤다는 뜻이며 암기 완료를 뜻하지 않습니다.",
                item.kind, item.level, item.position)
            item.lessons.forEach { unit ->
                mapCards(lesson(course, unit.key, unit.title, unit.position, false, item.deckId), unit.cards)
            }
        }
        jdbc.update("""update user_settings set active_lesson_id=(select l.id from course_lesson l join learning_course c on c.id=l.course_id
            where c.owner_id=? order by c.position,l.position limit 1) where user_id=? and active_lesson_id is null""",owner,owner)
    }
    private fun course(owner:UUID,key:String,title:String,description:String,kind:String,level:String?,position:Int):UUID {
        val id=UUID.randomUUID()
        jdbc.update("""insert into learning_course(id,owner_id,course_key,title,description,kind,level,position) values(?,?,?,?,?,?,?,?)
            on conflict(owner_id,course_key) do update set title=excluded.title,description=excluded.description,position=excluded.position""",
            id,owner,key,title,description,kind,level,position)
        return jdbc.queryForObject("select id from learning_course where owner_id=? and course_key=?",UUID::class.java,owner,key)!!
    }
    private fun lesson(course:UUID,key:String,title:String,position:Int,optional:Boolean,deck:UUID):UUID {
        jdbc.update("""insert into course_lesson(id,course_id,lesson_key,title,position,optional,deck_id) values(?,?,?,?,?,?,?)
            on conflict(course_id,lesson_key) do update set title=excluded.title,position=excluded.position""",UUID.randomUUID(),course,key,title,position,optional,deck)
        return jdbc.queryForObject("select id from course_lesson where course_id=? and lesson_key=?",UUID::class.java,course,key)!!
    }
    private fun mapCards(lesson:UUID,cards:List<UUID>) {
        val existing=jdbc.query("select card_id from lesson_card where lesson_id=? order by position",{rs,_->rs.getObject(1,UUID::class.java)},lesson)
        if(existing==cards) return
        jdbc.update("delete from lesson_card where lesson_id=?",lesson)
        jdbc.batchUpdate("insert into lesson_card(lesson_id,card_id,position) values(?,?,?)",
            cards.mapIndexed { position,card -> arrayOf<Any>(lesson,card,position) })
    }
    private fun seedKana(owner:UUID, definition: KanaCourse) {
        val kind = definition.kind
        val title = definition.title
        val position = definition.position
        val course=course(owner,"kana:$kind",title,"행 구분 없이 선택한 문자 전체를 연습합니다. 다시·어려움으로 평가한 문자가 다음 연습에서 먼저 나옵니다.",kind,null,position)
        val source=UUID.randomUUID()
        jdbc.update("""insert into content_source(id,owner_id,source_key,source_version,notice) values(?,?,'kanalog-kana','1','App-authored canonical kana character inventory; not JLPT MAX content') on conflict do nothing""",source,owner)
        val sourceId=jdbc.queryForObject("select id from content_source where owner_id=? and source_key='kanalog-kana'",UUID::class.java,owner)!!
        jdbc.update("""insert into deck(id,owner_id,source_id,source_path,title,kind) values(?,?,?,?,?,?) on conflict(owner_id,source_id,source_path) do nothing""",
            UUID.randomUUID(),owner,sourceId,"kana:$kind",title,kind)
        val deck=jdbc.queryForObject("select id from deck where owner_id=? and source_id=? and source_path=?",UUID::class.java,owner,sourceId,"kana:$kind")!!
        definition.lessons.forEach { unit ->
            val lesson=lesson(course,unit.key,unit.title,unit.position,unit.optional,deck)
            val ids=unit.characters.map { character ->
                val glyph=character.glyph
                val guid=character.sourceGuid
                jdbc.update("""insert into study_note(id,owner_id,source_id,source_guid,kind,front,reading,meaning,hangul_hint,explanation)
                    values(?,?,?,?,?,?,?,?,?,?) on conflict(owner_id,source_id,source_guid) do nothing""",UUID.randomUUID(),owner,sourceId,guid,kind,glyph,character.romaji,character.hangul,character.hangul,
                    "한글 표기는 일본어 소리를 익히기 위한 근사 보조 표기입니다. 실제 음성을 함께 들어 주세요. 로마자는 읽기 안내입니다.")
                val note=jdbc.queryForObject("select id from study_note where owner_id=? and source_id=? and source_guid=?",UUID::class.java,owner,sourceId,guid)!!
                jdbc.update("""insert into card(id,owner_id,deck_id,note_id,direction) values(?,?,?,?,'kana-recognition') on conflict do nothing""",UUID.randomUUID(),owner,deck,note)
                jdbc.queryForObject("select id from card where owner_id=? and deck_id=? and note_id=?",UUID::class.java,owner,deck,note)!!
            }
            mapCards(lesson,ids)
        }
        // Reuse only exact single-character readings, never arbitrary word recordings.
        jdbc.update("""update card c set word_audio_id=(select v.word_audio_id from card v join study_note n on n.id=v.note_id
            join content_source src on src.id=n.source_id where v.owner_id=? and src.source_key='jlpt-max' and n.kind='vocabulary'
            and n.reading=(select case when sn.kind='katakana' then translate(sn.front,'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン','あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん') else sn.front end from study_note sn where sn.id=c.note_id)
            and char_length(n.reading)=1 and v.word_audio_id is not null order by n.source_note_id limit 1)
            where c.deck_id=? and c.owner_id=?""",owner,deck,owner)
    }
    override fun lockUser(owner: UUID) { jdbc.queryForObject("select id from app_user where id=? for update",UUID::class.java,owner) }
    override fun select(owner: UUID, lesson: UUID, deck: UUID) {
        jdbc.update("update user_settings set active_lesson_id=? where user_id=?",lesson,owner)
        jdbc.update("update deck set selected=(id=?) where owner_id=?",deck,owner)
    }
    override fun owners() = jdbc.query("select id from app_user", {rs,_->rs.getObject(1,UUID::class.java)})
}
