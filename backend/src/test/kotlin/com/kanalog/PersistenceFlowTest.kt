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
    private val importer:MaxImportService,private val auth:AuthService
) {
    companion object {
        @Container @JvmField val postgres=PostgreSQLContainer("postgres:17-alpine")
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

    @Test fun `reimport retains card id and review state`() {
        val owner=user()
        val dir=Files.createTempDirectory("kanalog-converted-")
        Files.createDirectory(dir.resolve("media"))
        Files.writeString(dir.resolve("media.jsonl"),"")
        Files.writeString(dir.resolve("report.json"),"""{"version":"2.1.2","sha256":"c0898a086a7d440e4081c8a68fcd0c63e678bb345012888d1fc8e5270d762532","convertedCards":1,"mediaExtracted":0}""")
        Files.writeString(dir.resolve("notes.jsonl"),"""{"schemaVersion":1,"sourceVersion":"2.1.2","sourceNoteId":42,"sourceGuid":"fixture-guid","sourceCardId":43,"cardDirection":"recognition","deckPath":"JLPT MAX::어휘::N5","kind":"vocabulary","level":"N5","front":"犬","reading":"いぬ","meaning":"개","partOfSpeech":"명사","examples":[{"japanese":"犬がいます","korean":"개가 있습니다"},{"japanese":"犬を見ます","korean":"개를 봅니다"}],"tags":[]}
""")
        importer.importData(owner,dir)
        val card=jdbc.queryForObject("select id from card where owner_id=?",UUID::class.java,owner)!!
        jdbc.update("insert into user_card_state(id,user_id,card_id,first_seen_at,version) values(?,?,?,now(),3)",
            UUID.randomUUID(),owner,card)
        importer.importData(owner,dir)
        assertEquals(card,jdbc.queryForObject("select id from card where owner_id=?",UUID::class.java,owner))
        assertEquals(3L,jdbc.queryForObject("select version from user_card_state where user_id=? and card_id=?",
            Long::class.java,owner,card))
        assertEquals(1,jdbc.queryForObject("select count(*) from card where owner_id=?",Int::class.java,owner))
        assertEquals(2,study.card(owner,card)?.examples?.size)
        assertEquals("명사",study.card(owner,card)?.partOfSpeech)
    }
}
