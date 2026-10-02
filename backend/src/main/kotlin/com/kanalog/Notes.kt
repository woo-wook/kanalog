package com.kanalog

import jakarta.servlet.http.HttpServletRequest
import jakarta.validation.Valid
import jakarta.validation.constraints.NotBlank
import org.springframework.http.HttpStatus
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.bind.annotation.*
import java.util.UUID
import tools.jackson.databind.ObjectMapper

data class NoteView(val id: UUID, val japanese: String, val front: String, val reading: String?,
    val meaning: String?, val example: String?, val exampleMeaning: String?, val explanation: String?,
    val memo: String?, val hangulHint: String?, val source: String, val bookmarked: Boolean,
    val excluded: Boolean, val audioId: UUID?, val kind:String, val level:String?, val grammarFocus:GrammarFocus?)
data class NotePage(val content: List<NoteView>, val totalElements: Int, val totalPages: Int, val number: Int)
data class NoteCreate(@field:NotBlank val japanese: String, @field:NotBlank val reading: String,
    @field:NotBlank val meaning: String, val example: String? = null, val exampleMeaning: String? = null,
    val memo: String? = null, val hangulHint: String? = null)
data class NotePatch(val japanese: String? = null, val reading: String? = null, val meaning: String? = null,
    val example: String? = null, val exampleMeaning: String? = null, val memo: String? = null,
    val hangulHint: String? = null, val bookmarked: Boolean? = null, val excluded: Boolean? = null)

@Service
class NoteService(private val jdbc: JdbcTemplate,private val mapper:ObjectMapper) {
    private val columns = """n.id,n.front,n.reading,n.meaning,n.example,n.example_meaning,n.explanation,
        n.personal_memo,n.hangul_hint,n.source_id,(b.note_id is not null) bookmarked,
        coalesce(s.suspended,false) excluded,c.word_audio_id,n.kind,n.raw_fields,d.level"""
    private val joins = """from study_note n left join bookmark b on b.note_id=n.id and b.user_id=?
        left join card c on c.id=(select c2.id from card c2 where c2.note_id=n.id and c2.owner_id=? order by c2.id limit 1)
        left join user_card_state s on s.card_id=c.id and s.user_id=?
        left join deck d on d.id=c.deck_id and d.owner_id=n.owner_id"""
    fun get(user: UUID, id: UUID): NoteView = jdbc.query("select $columns $joins where n.owner_id=? and n.id=?",
        ::map, user,user,user,user,id).firstOrNull()
        ?: fail("NOTE_NOT_FOUND", "단어를 찾을 수 없습니다", HttpStatus.NOT_FOUND)

    fun list(user: UUID, query: String, page: Int, size: Int, kind:String=""): NotePage {
        if (page < 0 || size !in 1..100) fail("BAD_PAGE", "페이지 범위를 확인하세요")
        val pattern = "%" + query.trim().take(100).replace("\\","\\\\").replace("%","\\%").replace("_","\\_") + "%"
        val kindClause=when(kind) {
            "" -> ""
            "vocabulary" -> " and n.kind='vocabulary'"
            "grammar" -> " and n.kind='grammar'"
            "kana" -> " and n.kind in ('hiragana','katakana')"
            else -> fail("BAD_NOTE_KIND","단어장 분류를 확인하세요")
        }
        val where = "n.owner_id=? and (n.front ilike ? escape '\\' or n.reading ilike ? escape '\\' or n.meaning ilike ? escape '\\')" + kindClause
        val total = jdbc.queryForObject("select count(*) from study_note n where $where",Int::class.java,user,pattern,pattern,pattern) ?: 0
        val rows = jdbc.query("select $columns $joins where $where order by n.updated_at desc,n.id limit ? offset ?",
            ::map,user,user,user,user,pattern,pattern,pattern,size,page*size)
        return NotePage(rows,total,(total+size-1)/size,page)
    }

    @Transactional
    fun create(user: UUID, body: NoteCreate): NoteView {
        jdbc.queryForObject("select id from app_user where id=? for update",UUID::class.java,user)
        val front=body.japanese.trim(); val reading=body.reading.trim(); val meaning=body.meaning.trim()
        if(front.isEmpty() || reading.isEmpty() || meaning.isEmpty()) fail("BAD_NOTE","표기·읽기·뜻을 입력하세요")
        val deck = jdbc.query("select id from deck where owner_id=? and source_id is null and source_path='PERSONAL'",
            {rs,_ -> rs.getObject(1,UUID::class.java)},user).firstOrNull() ?: UUID.randomUUID().also {
            jdbc.update("""insert into deck(id,owner_id,source_path,title,kind,selected)
                values(?,?,'PERSONAL','내 단어','vocabulary',false)""",it,user)
        }
        val id=UUID.randomUUID(); val card=UUID.randomUUID()
        jdbc.update("""insert into study_note(id,owner_id,kind,front,reading,meaning,example,example_meaning,
            personal_memo,hangul_hint) values(?,?,'vocabulary',?,?,?,?,?,?,?)""",
            id,user,front,reading,meaning,body.example,body.exampleMeaning,body.memo,body.hangulHint)
        jdbc.update("""insert into card(id,owner_id,deck_id,note_id,direction)
            values(?,?,?,?,'recognition')""",card,user,deck,id)
        return get(user,id)
    }

    @Transactional
    fun patch(user: UUID,id: UUID, body: NotePatch): NoteView {
        val old=get(user,id)
        val editingSource = listOf(body.japanese,body.reading,body.meaning,body.example,body.exampleMeaning).any { it != null }
        if(old.source!="PERSONAL" && editingSource) fail("READ_ONLY_SOURCE","가져온 원본은 수정할 수 없습니다",HttpStatus.FORBIDDEN)
        val front=(body.japanese ?: old.front).trim(); val reading=(body.reading ?: old.reading)?.trim()
        val meaning=(body.meaning ?: old.meaning)?.trim()
        if(old.source=="PERSONAL" && (front.isEmpty() || reading.isNullOrEmpty() || meaning.isNullOrEmpty()))
            fail("BAD_NOTE","표기·읽기·뜻을 입력하세요")
        jdbc.update("""update study_note set front=?,reading=?,meaning=?,example=?,example_meaning=?,
            personal_memo=?,hangul_hint=?,updated_at=now() where id=? and owner_id=?""",
            front,reading,meaning,body.example ?: old.example,body.exampleMeaning ?: old.exampleMeaning,
            body.memo ?: old.memo,body.hangulHint ?: old.hangulHint,id,user)
        body.bookmarked?.let { marked -> if(marked) jdbc.update("insert into bookmark(user_id,note_id) values(?,?) on conflict do nothing",user,id)
            else jdbc.update("delete from bookmark where user_id=? and note_id=?",user,id) }
        body.excluded?.let { excluded ->
            jdbc.update("""insert into user_card_state(id,user_id,card_id,suspended)
                select gen_random_uuid(),?,c.id,? from card c where c.note_id=? and c.owner_id=?
                on conflict(user_id,card_id) do update set suspended=excluded.suspended""",user,excluded,id,user)
        }
        return get(user,id)
    }

    private fun map(rs: java.sql.ResultSet, ignored: Int): NoteView {
        val front=rs.getString("front")
        return NoteView(rs.getObject("id",UUID::class.java),front,front,rs.getString("reading"),rs.getString("meaning"),
            rs.getString("example"),rs.getString("example_meaning"),rs.getString("explanation"),
            rs.getString("personal_memo"),rs.getString("hangul_hint"),if(rs.getObject("source_id")==null) "PERSONAL" else "JLPT MAX",
            rs.getBoolean("bookmarked"),rs.getBoolean("excluded"),rs.getObject("word_audio_id",UUID::class.java),rs.getString("kind"),rs.getString("level"),
            if(rs.getString("kind")=="grammar") rs.getString("raw_fields")?.let {convertedGrammarFocus(mapper.readTree(it),front)} else null)
    }
}

@RestController
class NoteController(private val service: NoteService) {
    @GetMapping("/api/notes") fun list(@RequestParam(defaultValue="") query:String,
        @RequestParam(defaultValue="0") page:Int,@RequestParam(defaultValue="20") size:Int,@RequestParam(defaultValue="") kind:String,request:HttpServletRequest)=
        service.list(request.user().id,query,page,size,kind)
    @GetMapping("/api/notes/{id}") fun get(@PathVariable id:UUID,request:HttpServletRequest)=service.get(request.user().id,id)
    @PostMapping("/api/notes") fun create(@Valid @RequestBody body:NoteCreate,request:HttpServletRequest)=service.create(request.user().id,body)
    @PatchMapping("/api/notes/{id}") fun patch(@PathVariable id:UUID,@RequestBody body:NotePatch,request:HttpServletRequest)=
        service.patch(request.user().id,id,body)
}
