package com.kanalog

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertThrows
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.test.context.DynamicPropertyRegistry
import org.springframework.test.context.DynamicPropertySource
import org.testcontainers.junit.jupiter.Container
import org.testcontainers.junit.jupiter.Testcontainers
import org.testcontainers.postgresql.PostgreSQLContainer
import java.nio.file.Files
import java.util.UUID

@Testcontainers
@SpringBootTest(webEnvironment=SpringBootTest.WebEnvironment.NONE)
class PersistenceFlowTest @Autowired constructor(
    private val jdbc:JdbcTemplate,private val notes:NoteService,private val study:StudyService,
    private val importer:MaxImportService,private val auth:AuthService,private val courses:CourseService,private val overview:OverviewService,private val curriculum:CurriculumService
) {
    companion object {
        @Container @JvmField val postgres=PostgreSQLContainer("postgres:16-alpine")
        private val mediaRoot=Files.createTempDirectory("kanalog-test-media-")
        @DynamicPropertySource @JvmStatic fun properties(registry:DynamicPropertyRegistry) {
            registry.add("spring.datasource.url") { postgres.jdbcUrl }
            registry.add("spring.datasource.username") { postgres.username }
            registry.add("spring.datasource.password") { postgres.password }
            registry.add("app.media-root") { mediaRoot.toString() }
        }
    }

    private fun user():UUID {
        val id=UUID.randomUUID()
        jdbc.update("insert into app_user(id,email,password_hash) values(?,?,?)",id,"$id@example.test","test-hash")
        jdbc.update("insert into user_settings(user_id) values(?)",id)
        return id
    }

    @Test fun `V8 backfills latest kana rating from both histories and rejects foreign or vocabulary history`() {
        val schema="kana_migration_"+UUID.randomUUID().toString().replace("-","")
        val owner=UUID.randomUUID();val other=UUID.randomUUID();val kana=UUID.randomUUID();val word=UUID.randomUUID()
        jdbc.dataSource!!.connection.use { connection ->
            connection.createStatement().use { sql ->
                sql.execute("create schema $schema")
                try {
                    sql.execute("set search_path to $schema")
                    sql.execute("create table app_user(id uuid primary key); create table study_note(id uuid primary key,kind text); create table card(id uuid primary key,owner_id uuid,note_id uuid); create table practice_answer(id uuid,user_id uuid,card_id uuid,rating text,answered_at timestamptz); create table review_log(id uuid,user_id uuid,card_id uuid,rating text,reviewed_at timestamptz)")
                    sql.execute("insert into app_user values('$owner'),('$other'); insert into study_note values('$kana','hiragana'),('$word','vocabulary'); insert into card values('$kana','$owner','$kana'),('$word','$owner','$word')")
                    sql.execute("insert into review_log values('${UUID.randomUUID()}','$owner','$kana','GOOD','2026-10-01T00:00:00Z'); insert into practice_answer values('${UUID.randomUUID()}','$owner','$kana','AGAIN','2026-10-02T00:00:00Z'),('${UUID.randomUUID()}','$owner','$word','HARD','2026-10-02T00:00:00Z'),('${UUID.randomUUID()}','$other','$kana','EASY','2026-10-03T00:00:00Z')")
                    val migration=org.springframework.core.io.ClassPathResource("db/migration/V8__kana_practice_priority.sql").inputStream.bufferedReader().use{it.readText()}
                    sql.execute(migration)
                    sql.executeQuery("select user_id,card_id,last_rating,attempts from kana_practice_state").use { rows ->
                        assertTrue(rows.next());assertEquals(owner,rows.getObject(1,UUID::class.java));assertEquals(kana,rows.getObject(2,UUID::class.java))
                        assertEquals("AGAIN",rows.getString(3));assertEquals(2,rows.getInt(4));assertTrue(!rows.next())
                    }
                } finally {
                    sql.execute("set search_path to public");sql.execute("drop schema $schema cascade")
                }
            }
        }
    }

    @Test fun `last kana rating prioritizes retry and hard across mixed and single script sessions`() {
        val owner=user();val other=user();courses.synchronize(owner);courses.synchronize(other)
        val input=KanaMixRequest(listOf("hiragana","katakana"),listOf("semiVoiced"))
        val session=study.start(owner,kana=input)
        val a=session.cards.first {it.kind=="hiragana"};val b=session.cards.first {it.kind=="katakana"}
        val req=ReviewRequest(session.id,a.id,a.version,"AGAIN",UUID.randomUUID().toString())
        study.review(owner,req);study.review(owner,req)
        study.review(owner,ReviewRequest(session.id,b.id,b.version,"HARD",UUID.randomUUID().toString()))
        val next=study.start(owner,kana=input)
        assertEquals(listOf(a.id,b.id),next.cards.take(2).map {it.id})
        assertEquals(a.id,study.start(owner,kana=KanaMixRequest(groups=listOf("semiVoiced"))).cards.first().id)
        assertEquals(1,jdbc.queryForObject("select attempts from kana_practice_state where user_id=? and card_id=?",Int::class.java,owner,a.id))
        study.review(owner,ReviewRequest(next.id,a.id,a.version,"EASY",UUID.randomUUID().toString()))
        val changed=study.start(owner,kana=input)
        assertEquals(b.id,changed.cards.first().id);assertEquals(a.id,changed.cards.last().id)
        assertEquals(0,jdbc.queryForObject("select count(*) from kana_practice_state where user_id=?",Int::class.java,other))
        assertEquals(0,jdbc.queryForObject("select count(*) from user_card_state where user_id=?",Int::class.java,owner))
        assertEquals(0,jdbc.queryForObject("select count(*) from review_log where user_id=?",Int::class.java,owner))
    }

    @Test fun `kana practice updates course progress and retry counts without FSRS reviews`() {
        val owner=user();courses.synchronize(owner)
        val first=study.start(owner,kana=KanaMixRequest(groups=listOf("semiVoiced")))
        first.cards.forEachIndexed { i,c -> study.review(owner,ReviewRequest(first.id,c.id,c.version,
            listOf("AGAIN","HARD","GOOD","EASY","AGAIN")[i],UUID.randomUUID().toString())) }
        val course=courses.list(owner).first {it.kind=="hiragana"}
        assertEquals(5,course.studiedCards);assertEquals(2,course.completedCards);assertEquals(3,course.dueCount)
        val next=study.start(owner,kana=KanaMixRequest(groups=listOf("semiVoiced")))
        next.cards.forEach {c -> study.review(owner,ReviewRequest(next.id,c.id,c.version,"GOOD",UUID.randomUUID().toString()))}
        val after=courses.list(owner).first {it.kind=="hiragana"}
        assertEquals(5,after.studiedCards);assertEquals(5,after.completedCards);assertEquals(0,after.dueCount)
        assertEquals(0,jdbc.queryForObject("select count(*) from review_log where user_id=?",Int::class.java,owner))
    }

    @Test fun `kana always practices whole category even when old client sends size and scheduled mode`() {
        val owner=user();courses.synchronize(owner)
        val regular=study.start(owner,lessonId=courses.list(owner).first().lessons.first().id)
        val learned=regular.cards.first()
        study.review(owner,ReviewRequest(regular.id,learned.id,learned.version,"GOOD",UUID.randomUUID().toString()))
        val before=study.card(owner,learned.id)
        jdbc.update("update user_settings set daily_new_limit=1 where user_id=?",owner)
        val basic=study.start(owner,kana=KanaMixRequest())
        assertTrue(basic.practice);assertEquals(46,basic.cards.size)
        val all=study.start(owner,kana=KanaMixRequest(listOf("hiragana","katakana"),listOf("basic","voiced","semiVoiced","yoon"),4,false))
        assertTrue(all.practice);assertEquals(208,all.cards.size)
        assertEquals(208,all.cards.map {it.id}.toSet().size)
        assertTrue(all.cards.any {it.id==learned.id})
        assertEquals(before,study.card(owner,learned.id))
    }

    @Test fun `curriculum read model scopes progress and existing lesson ids to the authenticated owner`() {
        val owner=user(); val other=user()
        courses.synchronize(owner); courses.synchronize(other)
        val before=curriculum.get(owner)
        val lesson=before.levels.first().units.first().lessons.first()
        assertEquals(lesson.id,before.recommendedLessonId)
        assertEquals(92,before.levels.first().totalCards)
        val session=study.start(owner,lessonId=lesson.id)
        val card=session.cards.first()
        study.review(owner,ReviewRequest(session.id,card.id,card.version,"GOOD",UUID.randomUUID().toString()))
        val changed=curriculum.level(owner,"starter")
        assertEquals(1,changed.completedCards)
        assertEquals(1,changed.studiedCards)
        val otherModel=curriculum.get(other)
        assertEquals(0,otherModel.levels.first().completedCards)
        val ownerIds=changed.units.flatMap { it.lessons }.map { it.id }.toSet()
        assertTrue(otherModel.levels.flatMap { it.units }.flatMap { it.lessons }.none { it.id in ownerIds })
        assertEquals("CURRICULUM_LEVEL_NOT_FOUND",assertThrows(ApiFailure::class.java) { curriculum.level(owner,"missing") }.code)
        assertEquals(lesson.id,curriculum.get(owner).levels.first().units.first().lessons.first().id)
        assertEquals(1,jdbc.queryForObject("select count(*) from review_log where user_id=?",Int::class.java,owner))
    }

    @Test fun `mixed kana spans all selected scripts and groups while preserving owner scope`() {
        val owner=user();val other=user()
        courses.synchronize(owner);courses.synchronize(other)
        val mixed=study.start(owner,kana=KanaMixRequest(listOf("hiragana","katakana"),listOf("voiced","semiVoiced"),50))
        assertEquals(50,mixed.cards.size)
        assertTrue(mixed.practice)
        assertTrue(mixed.cards.all { it.kind in listOf("hiragana","katakana") })
        assertTrue(mixed.cards.all { it.front in "が ぎ ぐ げ ご ざ じ ず ぜ ぞ だ ぢ づ で ど ば び ぶ べ ぼ ぱ ぴ ぷ ぺ ぽ ガ ギ グ ゲ ゴ ザ ジ ズ ゼ ゾ ダ ヂ ヅ デ ド バ ビ ブ ベ ボ パ ピ プ ペ ポ".split(' ') })
        assertTrue(mixed.cards.all { study.card(other,it.id)==null })
        assertEquals(mixed.cards.map { it.id },study.session(owner,mixed.id).cards.map { it.id })
        assertEquals("SESSION_NOT_FOUND",assertThrows(ApiFailure::class.java) { study.session(other,mixed.id) }.code)
        val selected=study.start(owner,kana=KanaMixRequest(listOf("hiragana"),listOf("semiVoiced"),5))
        assertEquals(setOf("ぱ","ぴ","ぷ","ぺ","ぽ"),selected.cards.map { it.front }.toSet())
        assertEquals(5,selected.cards.size)
        assertEquals("BAD_KANA_SCOPE",assertThrows(ApiFailure::class.java) { study.start(owner,kana=KanaMixRequest(listOf("vocabulary"),listOf("basic"),10)) }.code)
        assertEquals("BAD_STUDY_SCOPE",assertThrows(ApiFailure::class.java) { study.start(owner,lessonId=courses.list(owner).first().lessons.first().id,kana=KanaMixRequest()) }.code)
        assertThrows(ApiFailure::class.java) { study.start(owner,kana=KanaMixRequest(groups=emptyList())) }
        assertEquals(46,study.start(owner,kana=KanaMixRequest(size=209)).cards.size)
    }

    @Test fun `free kana practice includes future cards stores answers idempotently without changing FSRS or limits`() {
        val owner=user();courses.synchronize(owner)
        val initial=study.start(owner,lessonId=courses.list(owner).first().lessons.single { it.position==14 }.id)
        val learned=initial.cards.first()
        study.review(owner,ReviewRequest(initial.id,learned.id,learned.version,"GOOD",UUID.randomUUID().toString()))
        val before=study.card(owner,learned.id)!!
        jdbc.update("update user_settings set daily_new_limit=1 where user_id=?",owner)
        val mix=KanaMixRequest(groups=listOf("semiVoiced"),size=5,practice=true)
        val free=study.start(owner,kana=mix)
        assertTrue(free.practice)
        assertEquals(5,free.cards.size)
        assertTrue(free.cards.any { it.id==learned.id })
        val req=ReviewRequest(free.id,learned.id,before.version,"EASY",UUID.randomUUID().toString())
        val answer=study.review(owner,req)
        assertEquals("PRACTICED",answer.state)
        assertEquals(null,answer.due)
        assertEquals(answer,study.review(owner,req))
        assertEquals("IDEMPOTENCY_CONFLICT",assertThrows(ApiFailure::class.java) { study.review(owner,req.copy(sessionId=initial.id)) }.code)
        assertEquals("IDEMPOTENCY_CONFLICT",assertThrows(ApiFailure::class.java) { study.review(owner,req.copy(rating="HARD")) }.code)
        assertEquals("PRACTICE_ALREADY_ANSWERED",assertThrows(ApiFailure::class.java) { study.review(owner,req.copy(idempotencyKey=UUID.randomUUID().toString())) }.code)
        val after=study.card(owner,learned.id)!!
        assertEquals("EASY",after.lastRating)
        assertEquals(before,after.copy(lastRating=before.lastRating))
        assertEquals(1,jdbc.queryForObject("select count(*) from review_log where user_id=?",Int::class.java,owner))
        assertEquals(1,jdbc.queryForObject("select count(*) from practice_answer where user_id=?",Int::class.java,owner))
        val remaining=study.session(owner,free.id)
        assertEquals(4,remaining.cards.size)
        assertEquals(1,remaining.answered)
        assertTrue(remaining.practice)
        assertEquals(free.lessonTitle,remaining.lessonTitle)
        assertEquals(5,study.start(owner,kana=KanaMixRequest(groups=listOf("semiVoiced"))).cards.size)
        val excluded=free.cards.last { it.id!=learned.id }
        jdbc.update("insert into user_card_state(id,user_id,card_id,suspended) values(?,?,?,true) on conflict(user_id,card_id) do update set suspended=true",UUID.randomUUID(),owner,excluded.id)
        assertTrue(study.start(owner,kana=mix).cards.none { it.id==excluded.id })
        assertEquals(0,overview.dashboard(owner).dailyNewRemaining)
    }

    @Test fun `scheduled lessons enforce new limit while whole kana practice stays owner scoped`() {
        val owner=user();val other=user();courses.synchronize(owner);courses.synchronize(other)
        jdbc.update("update user_settings set daily_new_limit=1 where user_id=?",owner)
        val first=study.start(owner,lessonId=courses.list(owner).first().lessons.single { it.position==14 }.id)
        val second=study.start(owner,lessonId=courses.list(owner).first().lessons.single { it.position==10 }.id)
        assertEquals(1,first.cards.size);assertEquals(1,second.cards.size)
        val a=first.cards.single();val b=second.cards.single()
        study.review(owner,ReviewRequest(first.id,a.id,a.version,"GOOD",UUID.randomUUID().toString()))
        assertEquals("NEW_LIMIT",assertThrows(ApiFailure::class.java) { study.review(owner,ReviewRequest(second.id,b.id,b.version,"GOOD",UUID.randomUUID().toString())) }.code)
        val free=study.start(owner,kana=KanaMixRequest(groups=listOf("voiced"),size=5,practice=true))
        val card=free.cards.first()
        assertEquals("CARD_NOT_IN_SESSION",assertThrows(ApiFailure::class.java) { study.review(other,ReviewRequest(free.id,card.id,card.version,"EASY",UUID.randomUUID().toString())) }.code)
        assertEquals("BAD_RATING",assertThrows(ApiFailure::class.java) { study.review(owner,ReviewRequest(free.id,card.id,card.version,"WRONG",UUID.randomUUID().toString())) }.code)
        assertEquals(0,jdbc.queryForObject("select count(*) from practice_answer where user_id=?",Int::class.java,owner))
        val groups=listOf("basic","voiced","semiVoiced","yoon")
        val all=study.start(owner,kana=KanaMixRequest(listOf("hiragana","katakana"),groups,208,true))
        assertEquals(208,all.cards.size)
        assertEquals(setOf("hiragana","katakana"),all.cards.map { it.kind }.toSet())
        assertEquals(208,all.cards.map { it.id }.toSet().size)
    }

    @Test fun `empty scheduled lesson reports limit and supports scoped repeat without changing progress`() {
        val owner=user(); val other=user(); courses.synchronize(owner); courses.synchronize(other)
        jdbc.update("update user_settings set daily_new_limit=1 where user_id=?",owner)
        val lessons=courses.list(owner).first().lessons
        val first=study.start(owner,lessonId=lessons.first().id)
        val card=first.cards.single()
        study.review(owner,ReviewRequest(first.id,card.id,card.version,"GOOD",UUID.randomUUID().toString()))
        val empty=study.start(owner,lessonId=lessons.first().id)
        assertTrue(empty.cards.isEmpty())
        assertEquals("DAILY_LIMIT",empty.queueInfo!!.reason)
        assertEquals(4,empty.queueInfo.unseenCards)
        assertEquals(0,empty.queueInfo.newRemaining)
        assertTrue(empty.queueInfo.nextDueAt!=null)
        val repeat=study.start(owner,lessonId=lessons.first().id,practice=true)
        assertEquals(5,repeat.cards.size);assertTrue(repeat.practice)
        assertEquals(first.lessonId,repeat.lessonId)
        for(c in repeat.cards) study.review(owner,ReviewRequest(repeat.id,c.id,c.version,"GOOD",UUID.randomUUID().toString()))
        assertEquals(5,study.session(owner,repeat.id).answered)
        assertEquals(card.version+1,study.card(owner,card.id)!!.version)
        assertEquals(1,jdbc.queryForObject("select count(*) from review_log where user_id=?",Int::class.java,owner))
        assertEquals("LESSON_NOT_FOUND",assertThrows(ApiFailure::class.java) { study.start(other,lessonId=lessons.first().id,practice=true) }.code)
    }

    @Test fun `finished and excluded lessons explain empty scope without claiming completion`() {
        val owner=user();courses.synchronize(owner)
        val lesson=courses.list(owner).first().lessons.first()
        val first=study.start(owner,lessonId=lesson.id)
        for(c in first.cards) study.review(owner,ReviewRequest(first.id,c.id,c.version,"GOOD",UUID.randomUUID().toString()))
        val future=study.start(owner,lessonId=lesson.id)
        assertTrue(future.cards.isEmpty());assertEquals("NOT_DUE",future.queueInfo!!.reason)
        assertEquals(0,future.queueInfo.unseenCards);assertEquals(5,future.queueInfo.eligibleCards)
        jdbc.update("update user_card_state set suspended=true where user_id=?",owner)
        val excluded=study.start(owner,lessonId=lesson.id,practice=true)
        assertTrue(excluded.cards.isEmpty());assertEquals("NO_ELIGIBLE_CARDS",excluded.queueInfo!!.reason)
        assertEquals(0,excluded.queueInfo.eligibleCards)
    }

    @Test fun `audio engine and Supertonic voice settings persist per user and reject invalid choices`() {
        val owner=user();val other=user()
        assertEquals("SUPERTONIC",overview.settings(owner).audioEngine)
        assertEquals("F1",overview.settings(owner).supertonicVoice)
        overview.patch(owner,SettingsPatch(audioEngine="ORIGINAL",supertonicVoice="M5",preferredVoice="device-ja-JP"))
        assertEquals("ORIGINAL",overview.settings(owner).audioEngine)
        assertEquals("M5",overview.settings(owner).supertonicVoice)
        assertEquals("device-ja-JP",overview.settings(owner).preferredVoice)
        assertEquals("SUPERTONIC",overview.settings(other).audioEngine)
        assertEquals("BAD_AUDIO_ENGINE",assertThrows(ApiFailure::class.java) {
            overview.patch(owner,SettingsPatch(audioEngine="UNKNOWN"))
        }.code)
        assertEquals("BAD_SUPERTONIC_VOICE",assertThrows(ApiFailure::class.java) {
            overview.patch(owner,SettingsPatch(supertonicVoice="F6"))
        }.code)
        assertEquals("ORIGINAL",overview.settings(owner).audioEngine)
        assertEquals("M5",overview.settings(owner).supertonicVoice)
        overview.patch(owner,SettingsPatch(audioEngine="DEVICE"))
        assertEquals("DEVICE",overview.settings(owner).audioEngine)
        assertEquals("device-ja-JP",overview.settings(owner).preferredVoice)
    }

    @Test fun `kana courses start with ordered hiragana and preserve practice on synchronization`() {
        val owner=user(); val other=user()
        courses.synchronize(owner)
        val all=courses.list(owner)
        assertEquals(listOf("hiragana","katakana"),all.map { it.kind })
        assertEquals(46,all.first().lessons.filter { !it.optional }.sumOf { it.totalCards })
        val lesson=all.first().lessons.first()
        assertEquals(5,lesson.totalCards)
        courses.select(owner,lesson.id)
        assertEquals(lesson.id,overview.dashboard(owner).activeLessonId)
        assertEquals(5,overview.dashboard(owner).newRemaining)
        assertEquals(10,overview.dashboard(owner).dailyNewRemaining)
        val session=study.start(owner,lessonId=lesson.id)
        assertEquals(listOf("あ","い","う","え","お"),session.cards.map { it.front })
        val card=session.cards.first()
        val request=ReviewRequest(session.id,card.id,card.version,"GOOD",UUID.randomUUID().toString())
        study.review(owner,request)
        assertEquals(9,overview.dashboard(owner).dailyNewRemaining)
        courses.synchronize(owner)
        study.review(owner,request)
        assertEquals(1,courses.list(owner).first().lessons.first().completedCards)
        assertEquals(1,jdbc.queryForObject("select count(*) from review_log where user_id=?",Int::class.java,owner))
        assertEquals("LESSON_NOT_FOUND",assertThrows(ApiFailure::class.java) {
            study.start(other,lessonId=lesson.id)
        }.code)
        assertEquals("LESSON_NOT_FOUND",assertThrows(ApiFailure::class.java) { courses.select(other,lesson.id) }.code)
        val excluded=session.cards.last()
        jdbc.update("update user_card_state set suspended=true where user_id=? and card_id=?",owner,excluded.id)
        assertEquals(4,courses.get(owner,all.first().id).lessons.first().totalCards)
        session.cards.drop(1).dropLast(1).forEach { remaining ->
            study.review(owner,ReviewRequest(session.id,remaining.id,remaining.version,"GOOD",UUID.randomUUID().toString()))
        }
        assertTrue(courses.get(owner,all.first().id).lessons.first().completed)
        assertEquals(all.first().lessons[1].id,courses.get(owner,all.first().id).recommendedLessonId)
        jdbc.update("""insert into user_card_state(id,user_id,card_id,suspended)
            select gen_random_uuid(),?,lc.card_id,true from lesson_card lc join course_lesson l on l.id=lc.lesson_id
            where l.course_id=? on conflict(user_id,card_id) do update set suspended=true""",owner,all.first().id)
        val suspended=courses.get(owner,all.first().id)
        assertEquals(0,suspended.totalCards)
        assertEquals(0,suspended.studiedCards)
        assertEquals(0,suspended.completedCards)
        assertEquals(null,suspended.recommendedLessonId)
        assertTrue(study.start(owner,lessonId=lesson.id).cards.isEmpty())
    }

    @Test fun `MAX courses chunk source note order while preserving existing reviews on import retry`() {
        val owner=user()
        val dir=Files.createTempDirectory("kanalog-course-import-")
        Files.createDirectory(dir.resolve("media"));Files.writeString(dir.resolve("media.jsonl"),"")
        Files.writeString(dir.resolve("report.json"),"""{"version":"2.1.2","sha256":"c0898a086a7d440e4081c8a68fcd0c63e678bb345012888d1fc8e5270d762532","convertedCards":22,"mediaExtracted":0}""")
        Files.writeString(dir.resolve("notes.jsonl"),(22 downTo 1).joinToString("\n") { i ->
            """{"schemaVersion":1,"sourceVersion":"2.1.2","sourceNoteId":$i,"sourceGuid":"fixture-$i","sourceCardId":$i,"cardDirection":"recognition","deckPath":"MAX::N5","kind":"vocabulary","level":"N5","front":"単語$i","reading":"たんご","meaning":"단어","tags":[]}"""
        })
        importer.importData(owner,dir)
        val course=courses.list(owner).first { it.kind=="vocabulary" }
        assertEquals(listOf(20,2),course.lessons.map { it.totalCards })
        val lesson=course.lessons.first()
        val session=study.start(owner,lessonId=lesson.id)
        assertEquals((1..10).map { "単語$it" },session.cards.map { it.front })
        val card=session.cards.first()
        val req=ReviewRequest(session.id,card.id,card.version,"GOOD",UUID.randomUUID().toString())
        study.review(owner,req)
        importer.importData(owner,dir)
        assertEquals(lesson.id,courses.get(owner,course.id).lessons.first().id)
        assertEquals(1,courses.get(owner,course.id).completedCards)
        assertEquals(1L,study.card(owner,card.id)?.version)
        assertEquals(1,jdbc.queryForObject("select count(*) from review_log where user_id=?",Int::class.java,owner))
        assertEquals("BAD_STUDY_SCOPE",assertThrows(ApiFailure::class.java) {
            study.start(owner,session.cards.first().id,lesson.id)
        }.code)
    }

    @Test fun `expired login block starts a fresh failure window`() {
        val email="${UUID.randomUUID()}@example.test"
        val key=sha256(email)
        jdbc.update("""insert into login_attempt(email_hash,failures,blocked_until,updated_at)
            values(?,5,now()-interval '1 second',now()-interval '16 minutes')""",key)
        val failure=assertThrows(ApiFailure::class.java) { auth.login(email,"wrong-password") }
        assertEquals("BAD_CREDENTIALS",failure.code)
        assertEquals(1,jdbc.queryForObject("select failures from login_attempt where email_hash=?",Int::class.java,key))
        assertEquals(null,jdbc.query("select blocked_until from login_attempt where email_hash=?",
            {rs,_->rs.getTimestamp(1)},key).firstOrNull())
    }

    @Test fun `personal notes and imported notes remain owner scoped`() {
        val owner=user(); val other=user()
        val note=notes.create(owner,NoteCreate("日本語","にほんご","일본어"))
        val failure=assertThrows(ApiFailure::class.java) { notes.get(other,note.id) }
        assertEquals("NOTE_NOT_FOUND",failure.code)
        assertEquals(0,notes.list(other,"日本語",0,20).totalElements)
        val edited=notes.patch(owner,note.id,NotePatch(bookmarked=true,excluded=true))
        assertTrue(edited.bookmarked)
        assertTrue(edited.excluded)
        assertEquals(0,notes.list(other,"",0,20).totalElements)
    }

    @Test fun `review retry is idempotent and stale card is rejected`() {
        val owner=user(); val note=notes.create(owner,NoteCreate("猫","ねこ","고양이"))
        val deck=jdbc.queryForObject("select deck_id from card where note_id=?",UUID::class.java,note.id)!!
        val card=jdbc.queryForObject("select id from card where note_id=?",UUID::class.java,note.id)!!
        val session=study.start(owner,deck)
        val version=session.cards.single { it.id==card }.version
        val request=ReviewRequest(session.id,card,version,"GOOD",UUID.randomUUID().toString())
        val first=study.review(owner,request)
        val retry=study.review(owner,request)
        assertEquals(first.version,retry.version)
        assertEquals(first.due,retry.due)
        assertEquals(1,jdbc.queryForObject("select count(*) from review_log where user_id=?",Int::class.java,owner))
        val changed=assertThrows(ApiFailure::class.java) { study.review(owner,request.copy(rating="HARD")) }
        assertEquals("IDEMPOTENCY_CONFLICT",changed.code)
        val stale=assertThrows(ApiFailure::class.java) {
            study.review(owner,request.copy(idempotencyKey=UUID.randomUUID().toString()))
        }
        assertEquals("STALE_CARD",stale.code)
        val early=assertThrows(ApiFailure::class.java) {
            study.review(owner,request.copy(version=first.version,idempotencyKey=UUID.randomUUID().toString()))
        }
        assertEquals("CARD_NOT_DUE",early.code)
    }

    @Test fun `two sessions cannot exceed one new card per day`() {
        val owner=user()
        jdbc.update("update user_settings set daily_new_limit=1 where user_id=?",owner)
        val first=notes.create(owner,NoteCreate("山","やま","산"))
        val second=notes.create(owner,NoteCreate("川","かわ","강"))
        val firstDeck=jdbc.queryForObject("select deck_id from card where note_id=?",UUID::class.java,first.id)!!
        val secondDeck=UUID.randomUUID()
        jdbc.update("""insert into deck(id,owner_id,source_path,title,kind)
            values(?,?,'test:second','두 번째 덱','vocabulary')""",secondDeck,owner)
        jdbc.update("update card set deck_id=? where note_id=? and owner_id=?",secondDeck,second.id,owner)
        val one=study.start(owner,firstDeck)
        val two=study.start(owner,secondDeck)
        val oneCard=one.cards.single()
        val twoCard=two.cards.single()
        study.review(owner,ReviewRequest(one.id,oneCard.id,oneCard.version,"GOOD",UUID.randomUUID().toString()))
        val blocked=assertThrows(ApiFailure::class.java) {
            study.review(owner,ReviewRequest(two.id,twoCard.id,twoCard.version,"GOOD",UUID.randomUUID().toString()))
        }
        assertEquals("NEW_LIMIT",blocked.code)
        assertEquals(1,jdbc.queryForObject("select count(*) from review_log where user_id=?",Int::class.java,owner))
    }

    @Test fun `grammar focus survives owner scoped reimport without changing progress`() {
        val owner=user();val other=user();val dir=Files.createTempDirectory("kanalog-grammar-focus-")
        Files.createDirectory(dir.resolve("media"));Files.writeString(dir.resolve("media.jsonl"),"")
        Files.writeString(dir.resolve("report.json"),"""{"version":"2.1.2","sha256":"c0898a086a7d440e4081c8a68fcd0c63e678bb345012888d1fc8e5270d762532","convertedCards":1,"mediaExtracted":0}""")
        val raw="""{"schemaVersion":1,"sourceVersion":"2.1.2","sourceNoteId":72,"sourceGuid":"grammar-highlight-fixture","sourceCardId":73,"cardDirection":"recall","deckPath":"JLPT MAX::문법::N5","kind":"grammar","level":"N5","front":"この本はこの人のです。","answer":"Synthetic answer","tags":[],"grammarFocus":{"title":"この","segments":[{"text":"この本は","highlighted":false},{"text":"この","highlighted":true},{"text":"人のです。","highlighted":false}]}}"""
        Files.writeString(dir.resolve("notes.jsonl"),raw)
        importer.importData(owner,dir)
        val card=jdbc.queryForObject("select id from card where owner_id=? and direction='recall'",UUID::class.java,owner)!!
        jdbc.update("insert into user_card_state(id,user_id,card_id,first_seen_at,version) values(?,?,?,now(),3)",UUID.randomUUID(),owner,card)
        importer.importData(owner,dir)
        assertEquals(1,importer.refreshGrammarFocus(owner,dir))
        assertThrows(IllegalStateException::class.java) {importer.refreshGrammarFocus(other,dir)}
        assertEquals("この",study.card(owner,card)?.grammarFocus?.title)
        assertEquals(listOf(false,true,false),study.card(owner,card)?.grammarFocus?.segments?.map {it.highlighted})
        assertEquals(null,study.card(other,card))
        assertEquals(3L,study.card(owner,card)?.version)
        val noteId=jdbc.queryForObject("select note_id from card where id=?",UUID::class.java,card)!!
        assertEquals("grammar",notes.get(owner,noteId).kind)
        assertEquals("N5",notes.get(owner,noteId).level)
        assertEquals("この",notes.get(owner,noteId).grammarFocus?.title)
        notes.create(owner,NoteCreate("山","やま","산"))
        val grammarList=notes.list(owner,"",0,1,"grammar")
        assertEquals(1,grammarList.totalElements);assertEquals(noteId,grammarList.content.single().id)
        assertEquals(0,notes.list(other,"",0,1,"grammar").totalElements)
        assertThrows(ApiFailure::class.java) {notes.get(other,noteId)}
        assertThrows(ApiFailure::class.java) {notes.list(owner,"",0,20,"unknown")}
        Files.writeString(dir.resolve("notes.jsonl"),raw.replace("人のです。\",\"highlighted", "BROKEN\",\"highlighted"))
        assertThrows(IllegalStateException::class.java) {importer.importData(owner,dir)}
        assertEquals("この",study.card(owner,card)?.grammarFocus?.title)
    }

    @Test fun `reimport retains card id and review state`() {
        val owner=user()
        val dir=Files.createTempDirectory("kanalog-converted-")
        Files.createDirectory(dir.resolve("media"))
        Files.writeString(dir.resolve("media.jsonl"),"")
        Files.writeString(dir.resolve("report.json"),"""{"version":"2.1.2","sha256":"c0898a086a7d440e4081c8a68fcd0c63e678bb345012888d1fc8e5270d762532","convertedCards":1,"mediaExtracted":0}""")
        Files.writeString(dir.resolve("notes.jsonl"),"""{"schemaVersion":1,"sourceVersion":"2.1.2","sourceNoteId":42,"sourceGuid":"fixture-guid","sourceCardId":43,"cardDirection":"recognition","deckPath":"JLPT MAX::어휘::N5","kind":"vocabulary","level":"N5","front":"犬","reading":"いぬ","meaning":"개","partOfSpeech":"명사","examples":[{"japanese":"犬がいます","korean":"개가 있습니다"},{"japanese":"犬を見ます","korean":"개를 봅니다"}],"tags":[]}
""")
        importer.importData(owner,dir)
        val card=jdbc.queryForObject("select id from card where owner_id=? and direction='recognition'",UUID::class.java,owner)!!
        jdbc.update("insert into user_card_state(id,user_id,card_id,first_seen_at,version) values(?,?,?,now(),3)",
            UUID.randomUUID(),owner,card)
        importer.importData(owner,dir)
        assertEquals(card,jdbc.queryForObject("select id from card where owner_id=? and direction='recognition'",UUID::class.java,owner))
        assertEquals(3L,jdbc.queryForObject("select version from user_card_state where user_id=? and card_id=?",
            Long::class.java,owner,card))
        assertEquals(1,jdbc.queryForObject("select count(*) from card where owner_id=? and direction='recognition'",Int::class.java,owner))
        assertEquals(2,study.card(owner,card)?.examples?.size)
        assertEquals("명사",study.card(owner,card)?.partOfSpeech)
    }
}
