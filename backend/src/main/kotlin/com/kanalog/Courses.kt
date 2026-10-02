package com.kanalog

import jakarta.servlet.http.HttpServletRequest
import org.springframework.boot.ApplicationArguments
import org.springframework.boot.ApplicationRunner
import org.springframework.http.HttpStatus
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.stereotype.Component
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.bind.annotation.*
import java.util.UUID

data class LessonView(val id:UUID,val title:String,val position:Int,val optional:Boolean,val totalCards:Int,
    val studiedCards:Int,val completedCards:Int,val dueCount:Int,val selected:Boolean,val completed:Boolean)
data class CourseView(val id:UUID,val title:String,val description:String,val kind:String,val level:String?,
    val position:Int,val totalCards:Int,val studiedCards:Int,val completedCards:Int,val dueCount:Int,
    val lessons:List<LessonView>,val recommendedLessonId:UUID?)
data class LessonScope(val id:UUID,val deckId:UUID,val title:String)

@Service
class CourseService(private val jdbc:JdbcTemplate) {
    fun list(owner:UUID):List<CourseView> = jdbc.query("select * from learning_course where owner_id=? order by position,course_key",{rs,_->
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

    fun get(owner:UUID,id:UUID)=list(owner).find{it.id==id} ?: fail("COURSE_NOT_FOUND","코스를 찾을 수 없습니다",HttpStatus.NOT_FOUND)
    fun scope(owner:UUID,id:UUID):LessonScope = jdbc.query("""select l.id,l.deck_id,l.title from course_lesson l
        join learning_course c on c.id=l.course_id where l.id=? and c.owner_id=?""",{rs,_->
        LessonScope(rs.getObject(1,UUID::class.java),rs.getObject(2,UUID::class.java),rs.getString(3))},id,owner).firstOrNull()
        ?: fail("LESSON_NOT_FOUND","학습 단계를 찾을 수 없습니다",HttpStatus.NOT_FOUND)

    @Transactional fun select(owner:UUID,lesson:UUID) {
        val scope=scope(owner,lesson)
        jdbc.queryForObject("select id from app_user where id=? for update",UUID::class.java,owner)
        jdbc.update("update user_settings set active_lesson_id=? where user_id=?",lesson,owner)
        jdbc.update("update deck set selected=(id=?) where owner_id=?",scope.deckId,owner)
    }

    @Transactional fun synchronize(owner:UUID) {
        jdbc.queryForObject("select id from app_user where id=? for update",UUID::class.java,owner)
        for((kind,position) in listOf("hiragana" to 0,"katakana" to 1)) seedKana(owner,kind,position)
        val decks=jdbc.query("""select d.id,d.title,d.kind,d.level from deck d join content_source s on s.id=d.source_id
            where d.owner_id=? and d.import_status='READY' and s.source_key='jlpt-max' and d.kind in ('vocabulary','grammar')
            order by d.level desc,d.kind desc,d.source_path""",{rs,_->
            arrayOf(rs.getObject(1,UUID::class.java),rs.getString(2),rs.getString(3),rs.getString(4))},owner)
        decks.forEach { row ->
            val deck=row[0] as UUID;val kind=row[2] as String;val level=row[3] as String
            val rank=level.removePrefix("N").toIntOrNull() ?: 5
            val course=course(owner,"max:$deck","$level ${if(kind=="vocabulary") "단어" else "문법"}",
                "JLPT MAX 개인 데이터로 연습합니다. 완료 표시는 첫 연습을 마쳤다는 뜻이며 암기 완료를 뜻하지 않습니다.",kind,level,2+(5-rank)*2+if(kind=="grammar") 1 else 0)
            val cards=jdbc.query("""select c.id from card c join study_note n on n.id=c.note_id where c.deck_id=? and c.owner_id=? and c.active=true
                order by case when n.source_note_id ~ '^[0-9]+$' then n.source_note_id::numeric end nulls last,n.source_note_id,c.source_card_id,c.id""",
                {rs,_->rs.getObject(1,UUID::class.java)},deck,owner)
            cards.chunked(if(kind=="grammar") 5 else 20).forEachIndexed { index,chunk ->
                val id=lesson(course,"chunk:$index","${index+1}단계 · ${if(kind=="grammar") "문법" else "단어"} ${index*(if(kind=="grammar") 5 else 20)+1}–${index*(if(kind=="grammar") 5 else 20)+chunk.size}",index,false,deck)
                mapCards(id,chunk)
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
    private fun seedKana(owner:UUID,kind:String,position:Int) {
        val title=if(kind=="katakana") "가타카나" else "히라가나"
        val course=course(owner,"kana:$kind",title,"행 구분 없이 선택한 문자 전체를 연습합니다. 다시·어려움으로 평가한 문자가 다음 연습에서 먼저 나옵니다.",kind,null,position)
        val source=UUID.randomUUID()
        jdbc.update("""insert into content_source(id,owner_id,source_key,source_version,notice) values(?,?,'kanalog-kana','1','App-authored canonical kana character inventory; not JLPT MAX content') on conflict do nothing""",source,owner)
        val sourceId=jdbc.queryForObject("select id from content_source where owner_id=? and source_key='kanalog-kana'",UUID::class.java,owner)!!
        jdbc.update("""insert into deck(id,owner_id,source_id,source_path,title,kind) values(?,?,?,?,?,?) on conflict(owner_id,source_id,source_path) do nothing""",
            UUID.randomUUID(),owner,sourceId,"kana:$kind",title,kind)
        val deck=jdbc.queryForObject("select id from deck where owner_id=? and source_id=? and source_path=?",UUID::class.java,owner,sourceId,"kana:$kind")!!
        kanaRows.forEachIndexed { rowIndex,row ->
            val parts=row.split('|');val symbols=parts[1].split(' ');val romaji=parts[2].split(' ');val hangul=parts[3].split(' ')
            val lesson=lesson(course,"row:$rowIndex","${parts[0]} · ${if(rowIndex<10) "기본" else "확장"}",rowIndex,rowIndex>=10,deck)
            val ids=symbols.mapIndexed { index,hira ->
                val glyph=if(kind=="katakana") hira.map{if(it in 'ぁ'..'ゖ') (it.code+0x60).toChar() else it}.joinToString("") else hira
                val guid="$kind:$hira"
                jdbc.update("""insert into study_note(id,owner_id,source_id,source_guid,kind,front,reading,meaning,hangul_hint,explanation)
                    values(?,?,?,?,?,?,?,?,?,?) on conflict(owner_id,source_id,source_guid) do nothing""",UUID.randomUUID(),owner,sourceId,guid,kind,glyph,romaji[index],hangul[index],hangul[index],
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
    companion object {
        val kanaRows=listOf(
            "모음|あ い う え お|a i u e o|아 이 우 에 오",
            "카 행|か き く け こ|ka ki ku ke ko|카 키 쿠 케 코",
            "사 행|さ し す せ そ|sa shi su se so|사 시 스 세 소",
            "타 행|た ち つ て と|ta chi tsu te to|타 치 츠 테 토",
            "나 행|な に ぬ ね の|na ni nu ne no|나 니 누 네 노",
            "하 행|は ひ ふ へ ほ|ha hi fu he ho|하 히 후 헤 호",
            "마 행|ま み む め も|ma mi mu me mo|마 미 무 메 모",
            "야 행|や ゆ よ|ya yu yo|야 유 요",
            "라 행|ら り る れ ろ|ra ri ru re ro|라 리 루 레 로",
            "와 행·응|わ を ん|wa wo n|와 오 응",
            "탁음 가 행|が ぎ ぐ げ ご|ga gi gu ge go|가 기 구 게 고",
            "탁음 자 행|ざ じ ず ぜ ぞ|za ji zu ze zo|자 지 즈 제 조",
            "탁음 다 행|だ ぢ づ で ど|da ji zu de do|다 지 즈 데 도",
            "탁음 바 행|ば び ぶ べ ぼ|ba bi bu be bo|바 비 부 베 보",
            "반탁음 파 행|ぱ ぴ ぷ ぺ ぽ|pa pi pu pe po|파 피 푸 페 포",
            "요음|きゃ きゅ きょ しゃ しゅ しょ ちゃ ちゅ ちょ にゃ にゅ にょ ひゃ ひゅ ひょ みゃ みゅ みょ りゃ りゅ りょ ぎゃ ぎゅ ぎょ じゃ じゅ じょ びゃ びゅ びょ ぴゃ ぴゅ ぴょ|kya kyu kyo sha shu sho cha chu cho nya nyu nyo hya hyu hyo mya myu myo rya ryu ryo gya gyu gyo ja ju jo bya byu byo pya pyu pyo|캬 큐 쿄 샤 슈 쇼 차 추 초 냐 뉴 뇨 햐 휴 효 먀 뮤 묘 랴 류 료 갸 규 교 자 쥬 죠 뱌 뷰 뵤 퍄 퓨 표")
    }
}
@Component
class CourseBootstrap(private val jdbc:JdbcTemplate,private val courses:CourseService):ApplicationRunner {
    override fun run(args:ApplicationArguments) {
        jdbc.query("select id from app_user",{rs,_->rs.getObject(1,UUID::class.java)}).forEach(courses::synchronize)
    }
}
@RestController
class CourseController(private val courses:CourseService) {
    @GetMapping("/api/courses") fun list(request:HttpServletRequest)=courses.list(request.user().id)
    @GetMapping("/api/courses/{id}") fun get(@PathVariable id:UUID,request:HttpServletRequest)=courses.get(request.user().id,id)
    @PostMapping("/api/courses/lessons/{id}/select") fun select(@PathVariable id:UUID,request:HttpServletRequest)=courses.select(request.user().id,id)
}
