package com.kanalog.integration

import com.kanalog.account.application.AccountAdminService
import com.kanalog.auth.application.port.out.PasswordHasher
import com.kanalog.common.crypto.sha256
import com.kanalog.imports.application.ImportJobService
import org.junit.jupiter.api.Assertions.assertArrayEquals
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.core.env.Environment
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.test.context.DynamicPropertyRegistry
import org.springframework.test.context.DynamicPropertySource
import org.testcontainers.junit.jupiter.Container
import org.testcontainers.junit.jupiter.Testcontainers
import org.testcontainers.postgresql.PostgreSQLContainer
import tools.jackson.databind.JsonNode
import tools.jackson.databind.ObjectMapper
import java.net.URI
import java.net.http.HttpClient
import java.net.http.HttpRequest
import java.net.http.HttpResponse
import java.nio.file.Files
import java.time.Duration
import java.util.UUID

@Testcontainers
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class ApiContractTest
    @Autowired
    constructor(
        private val environment: Environment,
        private val mapper: ObjectMapper,
        private val accounts: AccountAdminService,
        private val passwords: PasswordHasher,
        private val jdbc: JdbcTemplate,
        private val imports: ImportJobService,
    ) {
        companion object {
            @Container @JvmField
            val postgres = PostgreSQLContainer("postgres:16-alpine")
            private val mediaRoot = Files.createTempDirectory("kanalog-api-media-")

            @DynamicPropertySource @JvmStatic
            fun properties(registry: DynamicPropertyRegistry) {
                registry.add("spring.datasource.url") { postgres.jdbcUrl }
                registry.add("spring.datasource.username") { postgres.username }
                registry.add("spring.datasource.password") { postgres.password }
                registry.add("app.media-root") { mediaRoot.toString() }
                registry.add("app.public-url") { "http://localhost:3200" }
                registry.add("app.cookie-secure") { "false" }
            }
        }

        private data class Login(
            val id: UUID,
            val cookie: String,
            val csrf: String,
        )

        private val client = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build()

        private fun request(
            method: String,
            path: String,
            body: String? = null,
            login: Login? = null,
            headers: Map<String, String> = emptyMap(),
        ): HttpResponse<ByteArray> {
            val port = environment.getRequiredProperty("local.server.port")
            val builder =
                HttpRequest
                    .newBuilder(URI("http://localhost:$port$path"))
                    .timeout(Duration.ofSeconds(15))
                    .header("Origin", "http://localhost:3200")
            login?.let { builder.header("Cookie", it.cookie).header("X-CSRF-Token", it.csrf) }
            headers.forEach { (name, value) -> builder.setHeader(name, value) }
            if (body != null) builder.header("Content-Type", "application/json")
            builder.method(method, body?.let(HttpRequest.BodyPublishers::ofString) ?: HttpRequest.BodyPublishers.noBody())
            return client.send(builder.build(), HttpResponse.BodyHandlers.ofByteArray())
        }

        private fun json(response: HttpResponse<ByteArray>): JsonNode = mapper.readTree(response.body())

        private fun login(): Login {
            val email = "${UUID.randomUUID()}@example.test"
            val password = "Synthetic-api-test-password"
            accounts.create(email, passwords.encode(password))
            val response = request("POST", "/api/auth/login", mapper.writeValueAsString(mapOf("email" to email, "password" to password)))
            assertEquals(200, response.statusCode())
            val cookie = response.headers().firstValue("Set-Cookie").orElseThrow()
            assertTrue(cookie.contains("HttpOnly") && cookie.contains("SameSite=Lax"))
            val payload = json(response)
            return Login(UUID.fromString(payload.path("id").asString()), cookie.substringBefore(';'), payload.path("csrfToken").asString())
        }

        private fun code(
            response: HttpResponse<ByteArray>,
            status: Int,
            code: String,
        ) {
            assertEquals(status, response.statusCode(), response.body().toString(Charsets.UTF_8))
            assertEquals(code, json(response).path("code").asString())
            assertTrue(json(response).path("requestId").asString().isNotBlank())
        }

        private fun newNote(owner: Login): UUID {
            val created = request("POST", "/api/notes", """{"japanese":"猫","reading":"ねこ","meaning":"고양이"}""", owner)
            assertEquals(200, created.statusCode())
            return UUID.fromString(json(created).path("id").asString())
        }

        private fun scheduled(
            owner: Login,
            note: UUID,
        ): JsonNode {
            val deck = jdbc.queryForObject("select deck_id from card where note_id=?", UUID::class.java, note)!!
            val response = request("POST", "/api/study/sessions", """{"deckId":"$deck"}""", owner)
            assertEquals(200, response.statusCode())
            return json(response)
        }

        private fun reviewPayload(
            session: JsonNode,
            key: String,
            rating: String = "GOOD",
            version: Long? = null,
        ): String {
            val card = session.path("cards").get(0)
            return mapper.writeValueAsString(
                mapOf(
                    "sessionId" to session.path("id").asString(),
                    "cardId" to card.path("id").asString(),
                    "version" to (version ?: card.path("version").asLong()),
                    "rating" to rating,
                    "idempotencyKey" to key,
                ),
            )
        }

        @Test fun `personal verb exposes the same automatic conjugation in notes and study without changing state`() {
            val owner = login()
            val created = request("POST", "/api/notes", """{"japanese":"食べる","reading":"たべる","meaning":"먹다"}""", owner)
            assertEquals(200, created.statusCode())
            val note = json(created)
            assertEquals("ICHIDAN", note.path("verbConjugation").path("verbClass").asString())
            val session = scheduled(owner, UUID.fromString(note.path("id").asString()))
            val table = session.path("cards").get(0).path("verbConjugation")
            assertEquals(note.path("verbConjugation"), table)
            assertEquals(21, table.path("forms").size())
            val te = table.path("forms").first { it.path("key").asString() == "te" }
            assertEquals("食べて", te.path("japanese").asString())
            assertEquals("たべて", te.path("reading").asString())
            assertEquals(0, jdbc.queryForObject("select count(*) from review_log where user_id=?", Int::class.java, owner.id))
            val nonVerb = newNote(owner)
            val cat =
                json(request("GET", "/api/notes?query=猫", login = owner)).path("content").first {
                    it.path("id").asString() ==
                        nonVerb.toString()
                }
            assertTrue(cat.path("verbConjugation").isNull || cat.path("verbConjugation").isMissingNode)
            val other = login()
            assertEquals(0, json(request("GET", "/api/notes?query=食べる", login = other)).path("totalElements").asInt())
        }

        @Test fun `kana reference is authenticated and uses the same 104 pairs without creating study state`() {
            code(request("GET", "/api/kana/reference"), 401, "UNAUTHORIZED")
            val owner = login()
            val response = request("GET", "/api/kana/reference", login = owner)
            assertEquals(200, response.statusCode())
            val payload = json(response)
            assertTrue(payload.isArray)
            val groups = (0 until payload.size()).map { payload.get(it) }
            assertEquals(listOf("basic", "voiced", "semiVoiced", "yoon"), groups.map { it.path("key").asString() })
            assertEquals(listOf(46, 20, 5, 33), groups.map { group -> group.path("rows").sumOf { it.path("characters").size() } })
            assertEquals(0, jdbc.queryForObject("select count(*) from user_card_state where user_id=?", Int::class.java, owner.id))
            val note = newNote(owner)
            val notes = json(request("GET", "/api/notes?query=猫", login = owner))
            assertEquals(
                "COMPLETE",
                notes
                    .path("content")
                    .get(0)
                    .path("readingGuide")
                    .path("hangulStatus")
                    .asString(),
            )
            assertEquals(
                "네코",
                notes
                    .path("content")
                    .get(0)
                    .path("readingGuide")
                    .path("hangul")
                    .asString(),
            )
            assertEquals(
                note.toString(),
                notes
                    .path("content")
                    .get(0)
                    .path("id")
                    .asString(),
            )
        }

        @Test fun `level practice and persisted reinforcement work through authenticated JSON APIs`() {
            val owner = login()
            val other = login()
            val note = newNote(owner)
            jdbc.update("update deck set level='N5' where id=(select deck_id from card where note_id=?)", note)
            val patched = request("PATCH", "/api/settings", """{"practiceLevel":"N4"}""", owner)
            assertEquals(200, patched.statusCode())
            assertEquals("N4", json(request("GET", "/api/settings", login = owner)).path("practiceLevel").asString())
            code(request("PATCH", "/api/settings", """{"practiceLevel":"N6"}""", owner), 400, "BAD_LEVEL")
            val options = json(request("GET", "/api/study/options", login = owner))
            assertEquals(1, options.size())
            assertEquals("N5", options.get(0).path("level").asString())
            assertEquals(0, json(request("GET", "/api/study/options", login = other)).size())
            code(request("GET", "/api/study/options"), 401, "UNAUTHORIZED")
            val started = request("POST", "/api/study/sessions", """{"levelScope":{"level":"N5","kind":"vocabulary"}}""", owner)
            assertEquals(200, started.statusCode())
            val session = json(started)
            val sessionId = session.path("id").asString()
            val key = UUID.randomUUID().toString()
            val body = reviewPayload(session, key, "AGAIN")
            val reviewed = request("POST", "/api/study/reviews", body, owner)
            assertEquals(200, reviewed.statusCode())
            assertTrue(json(reviewed).path("retryCard").path("reinforcement").asBoolean())
            val restored = json(request("GET", "/api/study/sessions/$sessionId", login = owner))
            assertTrue(
                restored
                    .path("cards")
                    .get(0)
                    .path("reinforcement")
                    .asBoolean(),
            )
            val card = restored.path("cards").get(0)
            val retry =
                mapper.writeValueAsString(
                    mapOf(
                        "sessionId" to sessionId,
                        "cardId" to card.path("id").asString(),
                        "version" to card.path("version").asLong(),
                        "rating" to "GOOD",
                        "idempotencyKey" to UUID.randomUUID().toString(),
                        "reinforcement" to true,
                        "retryVersion" to card.path("retryVersion").asLong(),
                    ),
                )
            code(request("POST", "/api/study/reviews", retry, other), 404, "CARD_NOT_IN_SESSION")
            val response = request("POST", "/api/study/reviews", retry, owner)
            assertEquals(200, response.statusCode())
            assertEquals(json(response), json(request("POST", "/api/study/reviews", retry, owner)))
            assertEquals(json(reviewed), json(request("POST", "/api/study/reviews", body, owner)))
            val complete = json(request("GET", "/api/study/sessions/$sessionId", login = owner))
            assertEquals(0, complete.path("cards").size())
            assertEquals(2, complete.path("answered").asInt())
            assertEquals(1, jdbc.queryForObject("select count(*) from review_log where user_id=?", Int::class.java, owner.id))
        }

        @Test fun `login settings health logout and error envelopes retain the HTTP contract`() {
            code(request("GET", "/api/me"), 401, "UNAUTHORIZED")
            val owner = login()
            assertEquals(owner.id.toString(), json(request("GET", "/api/me", login = owner)).path("id").asString())
            val decks = json(request("GET", "/api/decks", login = owner))
            assertTrue(decks.isArray && decks.size() == 2)
            code(request("PATCH", "/api/settings", "{}", owner, mapOf("X-CSRF-Token" to "wrong")), 403, "CSRF_INVALID")
            code(request("PATCH", "/api/settings", "{}", owner, mapOf("Origin" to "https://foreign.example")), 403, "BAD_ORIGIN")
            val settings = request("PATCH", "/api/settings", """{"dailyNewLimit":5,"showHangulHint":true,"timezone":"Asia/Tokyo"}""", owner)
            assertEquals(200, settings.statusCode())
            assertEquals(5, json(request("GET", "/api/settings", login = owner)).path("dailyNewLimit").asInt())
            assertTrue(json(settings).path("showHangulHint").asBoolean())
            code(request("POST", "/api/notes", "{}", owner), 400, "INVALID_INPUT")
            code(request("GET", "/api/notes/not-a-uuid", login = owner), 400, "INVALID_INPUT")
            assertEquals("UP", json(request("GET", "/api/health/ready")).path("status").asString())
            assertEquals(200, request("POST", "/api/auth/logout", login = owner).statusCode())
            code(request("GET", "/api/me", login = owner), 401, "UNAUTHORIZED")
        }

        @Test fun `owner scoped note and review endpoints remain idempotent and reject stale state`() {
            val owner = login()
            val other = login()
            val note = newNote(owner)
            code(request("GET", "/api/notes/$note", login = other), 404, "NOTE_NOT_FOUND")
            val session = scheduled(owner, note)
            val sessionId = session.path("id").asString()
            code(request("GET", "/api/study/sessions/$sessionId", login = other), 404, "SESSION_NOT_FOUND")
            val key = UUID.randomUUID().toString()
            val first = request("POST", "/api/study/reviews", reviewPayload(session, key), owner)
            assertEquals(200, first.statusCode())
            assertEquals("SAVED", json(first).path("state").asString())
            assertEquals(json(first), json(request("POST", "/api/study/reviews", reviewPayload(session, key), owner)))
            code(request("POST", "/api/study/reviews", reviewPayload(session, key, "HARD"), owner), 409, "IDEMPOTENCY_CONFLICT")
            code(request("POST", "/api/study/reviews", reviewPayload(session, UUID.randomUUID().toString()), owner), 409, "STALE_CARD")
            assertEquals(1, jdbc.queryForObject("select count(*) from review_log where user_id=?", Int::class.java, owner.id))
            assertEquals(200, request("GET", "/api/dashboard", login = owner).statusCode())
            assertEquals(200, request("GET", "/api/stats", login = owner).statusCode())
            assertEquals(200, request("GET", "/api/curriculum", login = owner).statusCode())
        }

        @Test fun `import reports and ranged media remain private and unsafe media is refused`() {
            val owner = login()
            val other = login()
            val job = imports.start(owner.id, "synthetic.jsonl")
            assertEquals("RUNNING", json(request("GET", "/api/imports/$job", login = owner)).path("status").asString())
            code(request("GET", "/api/imports/$job", login = other), 404, "IMPORT_NOT_FOUND")
            val source = UUID.randomUUID()
            val media = UUID.randomUUID()
            jdbc.update(
                "insert into content_source(id,owner_id,source_key,source_version) values(?,?,'synthetic-api','1')",
                source,
                owner.id,
            )
            val bytes = "synthetic audio range".toByteArray()
            val relative = "${owner.id}/$source/test-audio"
            val path = mediaRoot.resolve(relative)
            Files.createDirectories(path.parent)
            Files.write(path, bytes)
            jdbc.update(
                "insert into media_asset(id,owner_id,source_id,original_name,storage_path,sha256,mime,size_bytes) values(?,?,?,?,?,?,'audio/mpeg',?)",
                media,
                owner.id,
                source,
                "synthetic.mp3",
                relative,
                sha256(bytes.toString(Charsets.UTF_8)),
                bytes.size,
            )
            val partial = request("GET", "/api/media/$media", login = owner, headers = mapOf("Range" to "bytes=2-6"))
            assertEquals(206, partial.statusCode())
            assertArrayEquals(bytes.copyOfRange(2, 7), partial.body())
            assertEquals("bytes 2-6/${bytes.size}", partial.headers().firstValue("Content-Range").orElseThrow())
            assertEquals("private, no-store", partial.headers().firstValue("Cache-Control").orElseThrow())
            assertEquals(416, request("GET", "/api/media/$media", login = owner, headers = mapOf("Range" to "bytes=999-")).statusCode())
            code(request("GET", "/api/media/$media", login = other), 404, "MEDIA_NOT_FOUND")
            code(request("GET", "/api/media/$media"), 401, "UNAUTHORIZED")
            jdbc.update("update media_asset set storage_path='../outside' where id=?", media)
            code(request("GET", "/api/media/$media", login = owner), 404, "MEDIA_NOT_FOUND")
        }

        @Test fun `review log failure rolls back card update and the same request can safely retry`() {
            val owner = login()
            val note = newNote(owner)
            val session = scheduled(owner, note)
            val key = UUID.randomUUID().toString()
            val body = reviewPayload(session, key)
            val function = "reject_review_" + owner.id.toString().replace("-", "")
            jdbc.execute(
                """create function $function() returns trigger language plpgsql as 'begin if NEW.user_id=''${owner.id}''::uuid then raise exception ''synthetic persistence failure''; end if; return NEW; end';
            create trigger $function before insert on review_log for each row execute function $function()""",
            )
            try {
                code(request("POST", "/api/study/reviews", body, owner), 500, "INTERNAL_ERROR")
                assertEquals(0, jdbc.queryForObject("select count(*) from review_log where user_id=?", Int::class.java, owner.id))
                assertEquals(0L, jdbc.queryForObject("select version from user_card_state where user_id=?", Long::class.java, owner.id))
                assertEquals(
                    0,
                    jdbc.queryForObject(
                        "select count(*) from user_card_state where user_id=? and first_seen_at is not null",
                        Int::class.java,
                        owner.id,
                    ),
                )
            } finally {
                jdbc.execute("drop trigger $function on review_log; drop function $function()")
            }
            assertEquals(200, request("POST", "/api/study/reviews", body, owner).statusCode())
            assertEquals(1, jdbc.queryForObject("select count(*) from review_log where user_id=?", Int::class.java, owner.id))
        }
    }
