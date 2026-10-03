package com.kanalog.study.infrastructure

import com.kanalog.content.infrastructure.convertedGrammarFocus
import com.kanalog.study.application.model.CardView
import com.kanalog.study.application.model.DeckView
import com.kanalog.study.application.model.ExampleView
import com.kanalog.study.application.model.ReviewRequest
import com.kanalog.study.application.port.out.QueueAvailability
import com.kanalog.study.application.port.out.SavedReview
import com.kanalog.study.application.port.out.SessionMetadata
import com.kanalog.study.application.port.out.StudyScope
import com.kanalog.study.application.port.out.StudyStore
import com.kanalog.study.domain.ReviewState
import java.sql.Timestamp
import java.time.Instant
import java.util.UUID
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.stereotype.Repository
import tools.jackson.databind.ObjectMapper

@Repository
class JdbcStudyStore(private val jdbc: JdbcTemplate, private val mapper: ObjectMapper) : StudyStore {
    override fun decks(owner: UUID): List<DeckView> = jdbc.query("""
        select d.id,d.title,d.level,d.kind,d.selected,count(c.id)::int total,
        count(s.first_seen_at)::int studied from deck d
        left join card c on c.deck_id=d.id and c.active=true
        left join user_card_state s on s.card_id=c.id and s.user_id=?
        where d.owner_id=? and d.import_status='READY'
        group by d.id order by d.level nulls last,d.source_path
    """, { rs, _ -> val total=rs.getInt("total"); val studied=rs.getInt("studied")
        DeckView(rs.getObject("id",UUID::class.java),rs.getString("title"),rs.getString("level"),
            rs.getString("kind"),total,studied,total-studied,rs.getBoolean("selected")) },owner,owner)

    override fun card(owner: UUID, cardId: UUID): CardView? {
        val base = jdbc.query("""select c.id,n.kind,n.front,n.reading,n.meaning,n.example,n.example_meaning,
          n.explanation,n.part_of_speech,n.hangul_hint,n.raw_fields,c.word_audio_id,c.example_audio_id,s.version,s.due_at,p.last_rating
          from card c join study_note n on n.id=c.note_id
          left join user_card_state s on s.card_id=c.id and s.user_id=?
          left join kana_practice_state p on p.card_id=c.id and p.user_id=?
          where c.id=? and c.owner_id=?""",{rs,_ -> CardView(rs.getObject("id",UUID::class.java),rs.getLong("version"),
            rs.getString("kind"),rs.getString("front"),rs.getString("reading"),rs.getString("meaning"),
            rs.getString("example"),rs.getString("example_meaning"),rs.getString("explanation"),rs.getString("part_of_speech"),
            rs.getString("hangul_hint"),rs.getObject("word_audio_id",UUID::class.java),
            rs.getObject("example_audio_id",UUID::class.java),rs.getTimestamp("due_at")?.toInstant(),lastRating=rs.getString("last_rating"),
            grammarFocus=if(rs.getString("kind")=="grammar") rs.getString("raw_fields")?.let {convertedGrammarFocus(mapper.readTree(it),rs.getString("front"))} else null)},
            owner,owner,cardId,owner).firstOrNull() ?: return null
        val examples = jdbc.query("""select e.japanese,e.reading,e.korean,e.audio_id from note_example e
            join card c on c.note_id=e.note_id where c.id=? and c.owner_id=? and e.owner_id=?
            order by e.ordinal""", {rs,_ -> ExampleView(rs.getString(1),rs.getString(2),rs.getString(3),
            rs.getObject(4,UUID::class.java))},cardId,owner,owner)
        return base.copy(examples=examples)
    }


    override fun lockUser(owner: UUID) { jdbc.queryForObject("select id from app_user where id=? for update", UUID::class.java, owner) }
    override fun deckExists(owner: UUID, deck: UUID) = (jdbc.queryForObject("select count(*) from deck where id=? and owner_id=? and import_status='READY'", Int::class.java, deck, owner) ?: 0) > 0
    override fun selectDeck(owner: UUID, deck: UUID) {
        jdbc.update("update user_settings set active_lesson_id=null where user_id=?", owner)
        jdbc.update("update deck set selected=false where owner_id=?", owner)
        jdbc.update("update deck set selected=true where id=? and owner_id=?", deck, owner)
    }
    override fun dailyNewLimit(owner: UUID) = jdbc.queryForObject("select daily_new_limit from user_settings where user_id=?", Int::class.java, owner) ?: 10
    override fun newCardsUsed(owner: UUID, start: Instant, end: Instant) = jdbc.queryForObject("select count(*) from user_card_state where user_id=? and first_seen_at>=? and first_seen_at<?", Int::class.java, owner, Timestamp.from(start), Timestamp.from(end)) ?: 0

    private fun deckSql(scope: StudyScope) = scope.deckId?.let { " and c.deck_id='$it'" } ?: ""
    private fun scopeSql(scope: StudyScope) = when {
        scope.mixedCards != null -> if (scope.mixedCards.isEmpty()) " and false" else " and c.id in (${scope.mixedCards.joinToString(",") { "'$it'" }})"
        scope.lessonId != null -> " and exists(select 1 from lesson_card lc where lc.card_id=c.id and lc.lesson_id='${scope.lessonId}')"
        else -> ""
    }
    override fun dueCards(owner: UUID, scope: StudyScope, size: Int) = jdbc.query("""select c.id from card c join user_card_state s on s.card_id=c.id and s.user_id=?
        where c.owner_id=? ${deckSql(scope)} and c.active=true and s.suspended=false
        and s.first_seen_at is not null and s.due_at<=now() ${scopeSql(scope)} order by s.due_at limit ?""", {rs,_->rs.getObject(1,UUID::class.java)},owner,owner,size)
    override fun unseenCards(owner: UUID, scope: StudyScope, size: Int): List<UUID> {
        val order = scope.lessonId?.let { "(select lc.position from lesson_card lc where lc.card_id=c.id and lc.lesson_id='$it')" } ?: "c.id"
        return jdbc.query("""select c.id from card c left join user_card_state s on s.card_id=c.id and s.user_id=?
            where c.owner_id=? ${deckSql(scope)} and c.active=true and (s.id is null or (s.first_seen_at is null and s.suspended=false))
            ${scopeSql(scope)} order by $order limit ?""", {rs,_->rs.getObject(1,UUID::class.java)},owner,owner,size)
    }
    override fun practiceCards(owner: UUID, scope: StudyScope, size: Int): List<UUID> {
        val order = if(scope.mixedCards != null) "case p.last_rating when 'AGAIN' then 0 when 'HARD' then 1 when 'GOOD' then 3 when 'EASY' then 4 else 2 end,random()" else "random()"
        return jdbc.query("""select c.id from card c left join user_card_state s on s.card_id=c.id and s.user_id=?
            left join kana_practice_state p on p.card_id=c.id and p.user_id=?
            where c.owner_id=? ${deckSql(scope)} and c.active=true and coalesce(s.suspended,false)=false ${scopeSql(scope)} order by $order limit ?""", {rs,_->rs.getObject(1,UUID::class.java)},owner,owner,owner,size)
    }
    override fun availability(owner: UUID, scope: StudyScope) = jdbc.query("""select count(*)::int total,
        count(*) filter(where s.first_seen_at is null)::int unseen,
        min(s.due_at) filter(where s.first_seen_at is not null and s.due_at>now()) next_due
        from card c left join user_card_state s on s.card_id=c.id and s.user_id=?
        where c.owner_id=? ${deckSql(scope)} and c.active=true and coalesce(s.suspended,false)=false ${scopeSql(scope)}""",
        {rs,_->QueueAvailability(rs.getInt("total"),rs.getInt("unseen"),rs.getTimestamp("next_due")?.toInstant())},owner,owner).single()
    override fun createSession(id: UUID, owner: UUID, scope: StudyScope, title: String?, practice: Boolean) {
        jdbc.update("insert into study_session(id,user_id,deck_id,lesson_id,session_title,practice,started_at) values(?,?,?,?,?,?,now())",id,owner,scope.deckId,scope.lessonId,title,practice)
    }
    override fun reserveCard(session: UUID, owner: UUID, card: UUID, position: Int, practice: Boolean) {
        jdbc.update("insert into session_card(session_id,card_id,position) values(?,?,?)",session,card,position)
        if(!practice) jdbc.update("insert into user_card_state(id,user_id,card_id,version) values(?,?,?,0) on conflict(user_id,card_id) do nothing",UUID.randomUUID(),owner,card)
    }
    override fun metadata(owner: UUID, session: UUID) = jdbc.query("""select ss.lesson_id,coalesce(ss.session_title,l.title),ss.practice from study_session ss
        left join course_lesson l on l.id=ss.lesson_id where ss.id=? and ss.user_id=?""",
        {rs,_->SessionMetadata(rs.getObject(1,UUID::class.java),rs.getString(2),rs.getBoolean(3))},session,owner).firstOrNull()
    override fun sessionCards(owner: UUID, session: UUID, practice: Boolean): List<UUID> {
        val remaining=if(practice) "not exists(select 1 from practice_answer p where p.session_id=sc.session_id and p.card_id=sc.card_id)" else "(s.first_seen_at is null or s.due_at<=now())"
        return jdbc.query("""select sc.card_id from session_card sc join card c on c.id=sc.card_id
            left join user_card_state s on s.card_id=sc.card_id and s.user_id=?
            where sc.session_id=? and c.owner_id=? and c.active=true and coalesce(s.suspended,false)=false and $remaining
            order by sc.position""",{rs,_->rs.getObject(1,UUID::class.java)},owner,session,owner)
    }
    override fun answerCount(owner: UUID, session: UUID, practice: Boolean): Int {
        val table=if(practice) "practice_answer" else "review_log"
        return jdbc.queryForObject("select count(*) from $table where session_id=? and user_id=?",Int::class.java,session,owner) ?: 0
    }
    override fun practiceRequestHash(owner: UUID, key: String) = jdbc.query("select request_hash from practice_answer where user_id=? and idempotency_key=?",{rs,_->rs.getString(1)},owner,key).firstOrNull()
    override fun savedReview(owner: UUID, key: String) = jdbc.query("select request_hash,next_state,next_version from review_log where user_id=? and idempotency_key=?",{rs,_->SavedReview(rs.getString(1),rs.getString(2),rs.getLong(3))},owner,key).firstOrNull()
    override fun sessionContains(owner: UUID, session: UUID, card: UUID) = (jdbc.queryForObject("""select count(*) from session_card sc join study_session ss on ss.id=sc.session_id
        where ss.id=? and ss.user_id=? and sc.card_id=?""",Int::class.java,session,owner,card) ?: 0) > 0
    override fun isPractice(owner: UUID, session: UUID) = jdbc.queryForObject("select practice from study_session where id=? and user_id=?",Boolean::class.java,session,owner) == true
    override fun lockState(owner: UUID, card: UUID) = jdbc.query("""select id,fsrs_json,version,first_seen_at,due_at from user_card_state
        where user_id=? and card_id=? for update""",{rs,_->ReviewState(rs.getObject(1,UUID::class.java),rs.getString(2),rs.getLong(3),rs.getTimestamp(4)?.toInstant(),rs.getTimestamp(5)?.toInstant())},owner,card).firstOrNull()
    override fun saveReview(owner: UUID, request: ReviewRequest, state: ReviewState, nextJson: String, due: Instant, now: Instant, digest: String, schedulerVersion: String, schedulerSettings: String) {
        jdbc.update("""update user_card_state set fsrs_json=?,due_at=?,last_reviewed_at=?,
            first_seen_at=coalesce(first_seen_at,?),version=version+1 where id=?""", nextJson,Timestamp.from(due),Timestamp.from(now),Timestamp.from(now),state.id)
        jdbc.update("""insert into review_log(id,user_id,card_id,session_id,rating,reviewed_at,previous_state,next_state,
            previous_version,next_version,idempotency_key,request_hash,scheduler_version,scheduler_settings) values(?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            UUID.randomUUID(),owner,request.cardId,request.sessionId,request.rating,Timestamp.from(now),state.json,nextJson,state.version,state.version+1,request.idempotencyKey,digest,schedulerVersion,schedulerSettings)
    }
    override fun practiceCardAvailable(owner: UUID, card: UUID) = (jdbc.queryForObject("""select count(*) from card c left join user_card_state s on s.card_id=c.id and s.user_id=?
        where c.id=? and c.owner_id=? and c.active=true and coalesce(s.suspended,false)=false""",Int::class.java,owner,card,owner) ?: 0) > 0
    override fun practiceAnswered(session: UUID, card: UUID) = (jdbc.queryForObject("select count(*) from practice_answer where session_id=? and card_id=?",Int::class.java,session,card) ?: 0) > 0
    override fun savePractice(owner: UUID, request: ReviewRequest, digest: String) { jdbc.update("insert into practice_answer(id,user_id,session_id,card_id,rating,idempotency_key,request_hash) values(?,?,?,?,?,?,?)",UUID.randomUUID(),owner,request.sessionId,request.cardId,request.rating,request.idempotencyKey,digest) }
    override fun saveKanaRating(owner:UUID,request:ReviewRequest) {
        jdbc.update("""insert into kana_practice_state(user_id,card_id,last_rating,answered_at,attempts)
            select ?,c.id,?,clock_timestamp(),1 from card c join study_note n on n.id=c.note_id
            where c.id=? and c.owner_id=? and n.kind in ('hiragana','katakana')
            on conflict(user_id,card_id) do update set last_rating=excluded.last_rating,
                answered_at=excluded.answered_at,attempts=kana_practice_state.attempts+1""",owner,request.rating,request.cardId,owner)
    }
    override fun timezone(owner: UUID) = jdbc.queryForObject("select timezone from app_user where id=?",String::class.java,owner)
}
