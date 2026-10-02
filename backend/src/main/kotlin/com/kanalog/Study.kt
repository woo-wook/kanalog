package com.kanalog

import io.github.openspacedrepetition.Card
import io.github.openspacedrepetition.Rating
import io.github.openspacedrepetition.Scheduler
import jakarta.servlet.http.HttpServletRequest
import org.springframework.http.HttpStatus
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.bind.annotation.*
import java.time.*
import java.util.*

data class DeckView(val id: UUID, val title: String, val level: String?, val kind: String,
                    val totalCards: Int, val studiedCards: Int, val unseenCards: Int, val selected: Boolean)
data class ExampleView(val japanese: String, val reading: String?, val korean: String?, val audioId: UUID?)
data class CardView(val id: UUID, val version: Long, val kind: String, val front: String, val reading: String?,
                    val meaning: String?, val example: String?, val exampleMeaning: String?,
                    val explanation: String?, val partOfSpeech: String?, val hangulHint: String?, val audioId: UUID?, val exampleAudioId: UUID?,
                    val due: Instant?, val examples: List<ExampleView> = emptyList(), val lastRating:String? = null)
data class SessionRequest(val deckId: UUID? = null, val lessonId: UUID? = null, val kana: KanaMixRequest? = null, val practice:Boolean = false)
data class QueueInfo(val eligibleCards:Int, val unseenCards:Int, val newRemaining:Int, val nextDueAt:Instant?, val reason:String?)
data class SessionView(val id: UUID, val cards: List<CardView>, val answered: Int, val lessonId: UUID? = null, val lessonTitle: String? = null, val practice:Boolean = false, val queueInfo:QueueInfo? = null)
data class ReviewRequest(val sessionId: UUID, val cardId: UUID, val version: Long,
                         val rating: String, val idempotencyKey: String)
data class ReviewResult(val due: Instant?, val version: Long, val state: String)

@Service
class FsrsAdapter {
    // Pinned java-fsrs 1.0.0, deterministic scheduling for repeatable previews and tests.
    private val scheduler = Scheduler.builder().enableFuzzing(false).build()
    val version = "java-fsrs/1.0.0"
    val settingsJson: String = scheduler.toJson()
    fun review(json: String?, rating: String, now: Instant): Pair<String, Instant> {
        val enumRating = try { Rating.valueOf(rating) } catch (_: Exception) { fail("BAD_RATING","평가를 확인하세요") }
        val card = json?.let(Card::fromJson) ?: Card.builder().build()
        val next = scheduler.reviewCard(card, enumRating, now).card()
        return next.toJson() to next.due
    }
}

@Service
class StudyService(private val jdbc: JdbcTemplate, private val fsrs: FsrsAdapter, private val courses: CourseService, private val kanaMix: KanaMixService) {
    fun decks(userId: UUID): List<DeckView> = jdbc.query("""
        select d.id,d.title,d.level,d.kind,d.selected,count(c.id)::int total,
        count(s.first_seen_at)::int studied from deck d
        left join card c on c.deck_id=d.id and c.active=true
        left join user_card_state s on s.card_id=c.id and s.user_id=?
        where d.owner_id=? and d.import_status='READY'
        group by d.id order by d.level nulls last,d.source_path
    """, { rs, _ -> val total=rs.getInt("total"); val studied=rs.getInt("studied")
        DeckView(rs.getObject("id",UUID::class.java),rs.getString("title"),rs.getString("level"),
            rs.getString("kind"),total,studied,total-studied,rs.getBoolean("selected")) },userId,userId)

    @Transactional
    fun select(userId: UUID, deckId: UUID) {
        val exists = jdbc.queryForObject("select count(*) from deck where id=? and owner_id=? and import_status='READY'",
            Int::class.java,deckId,userId) ?: 0
        if (exists==0) fail("DECK_NOT_FOUND","덱을 찾을 수 없습니다",HttpStatus.NOT_FOUND)
        jdbc.update("update user_settings set active_lesson_id=null where user_id=?",userId)
        jdbc.update("update deck set selected=false where owner_id=?",userId)
        jdbc.update("update deck set selected=true where id=? and owner_id=?",deckId,userId)
    }

    @Transactional
    fun start(userId: UUID, deckId: UUID? = null, lessonId: UUID? = null, kana:KanaMixRequest? = null, practice:Boolean = false): SessionView {
        if(listOf(deckId,lessonId,kana).count { it!=null }!=1) fail("BAD_STUDY_SCOPE","코스 단계·덱·가나 연습 중 하나를 선택하세요")
        val lesson=lessonId?.let { courses.scope(userId,it) }
        val targetDeck=lesson?.deckId ?: deckId
        val mixed=kana?.let { kanaMix.cards(userId,it) }
        val isPractice=practice || kana!=null
        val scopeSql=when {
            mixed!=null -> if(mixed.isEmpty()) " and false" else " and c.id in (${mixed.joinToString(",") { "'$it'" }})"
            lessonId!=null -> " and exists(select 1 from lesson_card lc where lc.card_id=c.id and lc.lesson_id='$lessonId')"
            else -> ""
        }
        val deckSql=targetDeck?.let { " and c.deck_id='$it'" } ?: ""
        val newOrder=if(lessonId==null) "c.id" else "(select lc.position from lesson_card lc where lc.card_id=c.id and lc.lesson_id='$lessonId')"
        jdbc.queryForObject("select id from app_user where id=? for update",UUID::class.java,userId)
        if(targetDeck!=null) {
            val deck=jdbc.queryForObject("select count(*) from deck where id=? and owner_id=? and import_status='READY'",Int::class.java,targetDeck,userId) ?: 0
            if(deck==0) fail("DECK_NOT_FOUND","덱을 찾을 수 없습니다",HttpStatus.NOT_FOUND)
        }
        // A lesson is a fixed learning scope: free repetition includes its entire range.
        val size=if(kana!=null || (isPractice && lessonId!=null)) Int.MAX_VALUE else 50
        val zone=zone(userId);val today=LocalDate.now(zone)
        val start=today.atStartOfDay(zone).toInstant();val end=today.plusDays(1).atStartOfDay(zone).toInstant()
        val limit=jdbc.queryForObject("select daily_new_limit from user_settings where user_id=?",Int::class.java,userId) ?: 10
        val used=jdbc.queryForObject("select count(*) from user_card_state where user_id=? and first_seen_at>=? and first_seen_at<?",
            Int::class.java,userId,java.sql.Timestamp.from(start),java.sql.Timestamp.from(end)) ?: 0
        val dueIds=if(isPractice) emptyList() else jdbc.query("""select c.id from card c join user_card_state s on s.card_id=c.id and s.user_id=?
            where c.owner_id=? $deckSql and c.active=true and s.suspended=false
            and s.first_seen_at is not null and s.due_at<=now() $scopeSql order by s.due_at limit ?""",
            {rs,_->rs.getObject(1,UUID::class.java)},userId,userId,size)
        val remaining=limit-used
        val newIds=if(!isPractice && remaining>0) jdbc.query("""select c.id from card c left join user_card_state s on s.card_id=c.id and s.user_id=?
            where c.owner_id=? $deckSql and c.active=true and (s.id is null or (s.first_seen_at is null and s.suspended=false))
            $scopeSql order by $newOrder limit ?""",{rs,_->rs.getObject(1,UUID::class.java)},userId,userId,remaining) else emptyList()
        val practiceOrder=if(kana!=null) "case p.last_rating when 'AGAIN' then 0 when 'HARD' then 1 when 'GOOD' then 3 when 'EASY' then 4 else 2 end,random()" else "random()"
        val ids=if(isPractice) jdbc.query("""select c.id from card c left join user_card_state s on s.card_id=c.id and s.user_id=?
            left join kana_practice_state p on p.card_id=c.id and p.user_id=?
            where c.owner_id=? $deckSql and c.active=true and coalesce(s.suspended,false)=false $scopeSql order by $practiceOrder limit ?""",
            {rs,_->rs.getObject(1,UUID::class.java)},userId,userId,userId,size)
        else (dueIds+newIds).distinct()
        val availability=jdbc.query("""select count(*)::int total,
            count(*) filter(where s.first_seen_at is null)::int unseen,
            min(s.due_at) filter(where s.first_seen_at is not null and s.due_at>now()) next_due
            from card c left join user_card_state s on s.card_id=c.id and s.user_id=?
            where c.owner_id=? $deckSql and c.active=true and coalesce(s.suspended,false)=false $scopeSql""",
            {rs,_->Triple(rs.getInt("total"),rs.getInt("unseen"),rs.getTimestamp("next_due")?.toInstant())},userId,userId).single()
        val reason=when {
            ids.isNotEmpty() -> null
            availability.first==0 -> "NO_ELIGIBLE_CARDS"
            !isPractice && availability.second>0 && used>=limit -> "DAILY_LIMIT"
            else -> "NOT_DUE"
        }
        val queueInfo=QueueInfo(availability.first,availability.second,maxOf(0,limit-used),availability.third,reason)
        val sessionId=UUID.randomUUID()
        jdbc.update("insert into study_session(id,user_id,deck_id,lesson_id,session_title,practice,started_at) values(?,?,?,?,?,?,now())",sessionId,userId,targetDeck,lessonId,kana?.copy(practice=isPractice)?.title(),isPractice)
        ids.forEachIndexed { index,id ->
            jdbc.update("insert into session_card(session_id,card_id,position) values(?,?,?)",sessionId,id,index)
            if(!isPractice) jdbc.update("insert into user_card_state(id,user_id,card_id,version) values(?,?,?,0) on conflict(user_id,card_id) do nothing",UUID.randomUUID(),userId,id)
        }
        return SessionView(sessionId,ids.mapNotNull { card(userId,it) },0,lessonId,kana?.copy(practice=isPractice)?.title() ?: lesson?.title,isPractice,queueInfo)
    }

    fun session(userId: UUID, sessionId: UUID): SessionView {
        val metadata=jdbc.query("""select ss.lesson_id,coalesce(ss.session_title,l.title),ss.practice from study_session ss
            left join course_lesson l on l.id=ss.lesson_id where ss.id=? and ss.user_id=?""",
            {rs,_->Triple(rs.getObject(1,UUID::class.java),rs.getString(2),rs.getBoolean(3))},sessionId,userId).firstOrNull()
            ?: fail("SESSION_NOT_FOUND","학습 세션을 찾을 수 없습니다",HttpStatus.NOT_FOUND)
        val remaining=if(metadata.third) "not exists(select 1 from practice_answer p where p.session_id=sc.session_id and p.card_id=sc.card_id)"
            else "(s.first_seen_at is null or s.due_at<=now())"
        val ids=jdbc.query("""select sc.card_id from session_card sc join card c on c.id=sc.card_id
            left join user_card_state s on s.card_id=sc.card_id and s.user_id=?
            where sc.session_id=? and c.owner_id=? and c.active=true and coalesce(s.suspended,false)=false and $remaining
            order by sc.position""",{rs,_->rs.getObject(1,UUID::class.java)},userId,sessionId,userId)
        val table=if(metadata.third) "practice_answer" else "review_log"
        val answered=jdbc.queryForObject("select count(*) from $table where session_id=? and user_id=?",Int::class.java,sessionId,userId) ?: 0
        return SessionView(sessionId,ids.mapNotNull{card(userId,it)},answered,metadata.first,metadata.second,metadata.third)
    }

    fun card(userId: UUID, cardId: UUID): CardView? {
        val base = jdbc.query("""select c.id,n.kind,n.front,n.reading,n.meaning,n.example,n.example_meaning,
          n.explanation,n.part_of_speech,n.hangul_hint,c.word_audio_id,c.example_audio_id,s.version,s.due_at,p.last_rating
          from card c join study_note n on n.id=c.note_id
          left join user_card_state s on s.card_id=c.id and s.user_id=?
          left join kana_practice_state p on p.card_id=c.id and p.user_id=?
          where c.id=? and c.owner_id=?""",{rs,_ -> CardView(rs.getObject("id",UUID::class.java),rs.getLong("version"),
            rs.getString("kind"),rs.getString("front"),rs.getString("reading"),rs.getString("meaning"),
            rs.getString("example"),rs.getString("example_meaning"),rs.getString("explanation"),rs.getString("part_of_speech"),
            rs.getString("hangul_hint"),rs.getObject("word_audio_id",UUID::class.java),
            rs.getObject("example_audio_id",UUID::class.java),rs.getTimestamp("due_at")?.toInstant(),lastRating=rs.getString("last_rating"))},
            userId,userId,cardId,userId).firstOrNull() ?: return null
        val examples = jdbc.query("""select e.japanese,e.reading,e.korean,e.audio_id from note_example e
            join card c on c.note_id=e.note_id where c.id=? and c.owner_id=? and e.owner_id=?
            order by e.ordinal""", {rs,_ -> ExampleView(rs.getString(1),rs.getString(2),rs.getString(3),
            rs.getObject(4,UUID::class.java))},cardId,userId,userId)
        return base.copy(examples=examples)
    }

    @Transactional
    fun review(userId: UUID, req: ReviewRequest): ReviewResult {
        if(req.idempotencyKey.length !in 8..100) fail("BAD_KEY","요청 키를 확인하세요")
        val digest=sha256("${req.sessionId}|${req.cardId}|${req.version}|${req.rating}")
        // Serialize all of this user's first reviews. Locking only the card allows
        // two tabs to review different new cards past the daily limit.
        jdbc.queryForObject("select id from app_user where id=? for update",UUID::class.java,userId)
        val priorPractice=jdbc.query("select request_hash from practice_answer where user_id=? and idempotency_key=?",{rs,_->rs.getString(1)},userId,req.idempotencyKey).firstOrNull()
        if(priorPractice!=null) {
            if(priorPractice!=digest) fail("IDEMPOTENCY_CONFLICT","이미 다른 답변에 사용된 요청 키입니다",HttpStatus.CONFLICT)
            return ReviewResult(null,req.version,"PRACTICED")
        }
        val prior=jdbc.query("select request_hash,next_state,next_version from review_log where user_id=? and idempotency_key=?",
            {rs,_->Triple(rs.getString(1),rs.getString(2),rs.getLong(3))},userId,req.idempotencyKey).firstOrNull()
        if(prior!=null) {
            if(prior.first!=digest) fail("IDEMPOTENCY_CONFLICT","이미 다른 답변에 사용된 요청 키입니다",HttpStatus.CONFLICT)
            val due=Card.fromJson(prior.second).due
            return ReviewResult(due,prior.third,"SAVED")
        }
        val inSession=jdbc.queryForObject("""select count(*) from session_card sc join study_session ss on ss.id=sc.session_id
            where ss.id=? and ss.user_id=? and sc.card_id=?""",Int::class.java,req.sessionId,userId,req.cardId) ?: 0
        if(inSession==0) fail("CARD_NOT_IN_SESSION","세션 카드를 찾을 수 없습니다",HttpStatus.NOT_FOUND)
        if(jdbc.queryForObject("select practice from study_session where id=? and user_id=?",Boolean::class.java,req.sessionId,userId)==true)
            return practiceAnswer(userId,req,digest)
        val state=jdbc.query("""select id,fsrs_json,version,first_seen_at,due_at from user_card_state
            where user_id=? and card_id=? for update""",{rs,_->StateRow(rs.getObject(1,UUID::class.java),rs.getString(2),
                rs.getLong(3),rs.getTimestamp(4)?.toInstant(),rs.getTimestamp(5)?.toInstant())},userId,req.cardId).firstOrNull()
            ?: fail("CARD_STATE_MISSING","카드 상태를 다시 불러오세요",HttpStatus.CONFLICT)
        if(state.version!=req.version) fail("STALE_CARD","다른 기기에서 변경된 카드입니다. 새로 불러오세요",HttpStatus.CONFLICT)
        if(state.firstSeen!=null && (state.dueAt==null || state.dueAt.isAfter(Instant.now())))
            fail("CARD_NOT_DUE","아직 복습 시각이 되지 않았습니다",HttpStatus.CONFLICT)
        if(state.firstSeen==null) {
            val zone=zone(userId);val day=LocalDate.now(zone)
            val begin=day.atStartOfDay(zone).toInstant();val end=day.plusDays(1).atStartOfDay(zone).toInstant()
            val limit=jdbc.queryForObject("select daily_new_limit from user_settings where user_id=?",Int::class.java,userId)?:10
            val used=jdbc.queryForObject("select count(*) from user_card_state where user_id=? and first_seen_at>=? and first_seen_at<?",
                Int::class.java,userId,java.sql.Timestamp.from(begin),java.sql.Timestamp.from(end))?:0
            if(used>=limit) fail("NEW_LIMIT","오늘 새 카드 한도에 도달했습니다",HttpStatus.CONFLICT)
        }
        val now=Instant.now()
        val (nextJson,due)=fsrs.review(state.json,req.rating,now)
        jdbc.update("""update user_card_state set fsrs_json=?,due_at=?,last_reviewed_at=?,
             first_seen_at=coalesce(first_seen_at,?),version=version+1 where id=?""",
            nextJson,java.sql.Timestamp.from(due),java.sql.Timestamp.from(now),java.sql.Timestamp.from(now),state.id)
        jdbc.update("""insert into review_log(id,user_id,card_id,session_id,rating,reviewed_at,previous_state,next_state,
             previous_version,next_version,idempotency_key,request_hash,scheduler_version,scheduler_settings)
             values(?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            UUID.randomUUID(),userId,req.cardId,req.sessionId,req.rating,java.sql.Timestamp.from(now),
            state.json,nextJson,state.version,state.version+1,req.idempotencyKey,digest,fsrs.version,fsrs.settingsJson)
        saveKanaRating(userId,req)
        return ReviewResult(due,state.version+1,"SAVED")
    }
    private fun practiceAnswer(userId:UUID,req:ReviewRequest,digest:String):ReviewResult {
        if(req.rating !in setOf("AGAIN","HARD","GOOD","EASY")) fail("BAD_RATING","평가를 확인하세요")
        val eligible=jdbc.queryForObject("""select count(*) from card c left join user_card_state s on s.card_id=c.id and s.user_id=?
            where c.id=? and c.owner_id=? and c.active=true and coalesce(s.suspended,false)=false""",Int::class.java,userId,req.cardId,userId) ?: 0
        if(eligible==0) fail("CARD_NOT_AVAILABLE","연습할 수 없는 카드입니다",HttpStatus.CONFLICT)
        if((jdbc.queryForObject("select count(*) from practice_answer where session_id=? and card_id=?",Int::class.java,req.sessionId,req.cardId) ?: 0)>0)
            fail("PRACTICE_ALREADY_ANSWERED","이미 이 연습에서 답변한 카드입니다",HttpStatus.CONFLICT)
        jdbc.update("insert into practice_answer(id,user_id,session_id,card_id,rating,idempotency_key,request_hash) values(?,?,?,?,?,?,?)",
            UUID.randomUUID(),userId,req.sessionId,req.cardId,req.rating,req.idempotencyKey,digest)
        saveKanaRating(userId,req)
        return ReviewResult(null,req.version,"PRACTICED")
    }
    private fun saveKanaRating(userId:UUID,req:ReviewRequest) {
        jdbc.update("""insert into kana_practice_state(user_id,card_id,last_rating,answered_at,attempts)
            select ?,c.id,?,clock_timestamp(),1 from card c join study_note n on n.id=c.note_id
            where c.id=? and c.owner_id=? and n.kind in ('hiragana','katakana')
            on conflict(user_id,card_id) do update set last_rating=excluded.last_rating,
                answered_at=excluded.answered_at,attempts=kana_practice_state.attempts+1""",userId,req.rating,req.cardId,userId)
    }
    data class StateRow(val id: UUID,val json: String?,val version: Long,val firstSeen: Instant?,val dueAt: Instant?)
    fun zone(userId:UUID): ZoneId = try {
        ZoneId.of(jdbc.queryForObject("select timezone from app_user where id=?",String::class.java,userId) ?: "Asia/Seoul")
    } catch (_:Exception){ ZoneId.of("Asia/Seoul") }
}

@RestController
class StudyController(private val service: StudyService) {
    @GetMapping("/api/decks") fun decks(request:HttpServletRequest)=service.decks(request.user().id)
    @GetMapping("/api/decks/{id}") fun deck(@PathVariable id:UUID,request:HttpServletRequest)=
        service.decks(request.user().id).find{it.id==id} ?: fail("DECK_NOT_FOUND","덱을 찾을 수 없습니다",HttpStatus.NOT_FOUND)
    @PostMapping("/api/decks/{id}/select") fun select(@PathVariable id:UUID,request:HttpServletRequest)=service.select(request.user().id,id)
    @PostMapping("/api/study/sessions") fun start(@RequestBody body:SessionRequest,request:HttpServletRequest)=service.start(request.user().id,body.deckId,body.lessonId,body.kana,body.practice)
    @GetMapping("/api/study/sessions/{id}") fun session(@PathVariable id:UUID,request:HttpServletRequest)=service.session(request.user().id,id)
    @PostMapping("/api/study/reviews") fun review(@RequestBody body:ReviewRequest,request:HttpServletRequest)=service.review(request.user().id,body)
}
