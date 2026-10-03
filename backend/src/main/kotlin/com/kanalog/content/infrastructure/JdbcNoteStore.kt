package com.kanalog.content.infrastructure

import com.kanalog.content.application.model.NoteCreate
import com.kanalog.content.application.model.NotePage
import com.kanalog.content.application.model.NotePatch
import com.kanalog.content.application.model.NoteView
import com.kanalog.content.application.port.out.NoteStore
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.stereotype.Repository
import tools.jackson.databind.ObjectMapper
import java.util.UUID

@Repository
class JdbcNoteStore(
    private val jdbc: JdbcTemplate,
    private val mapper: ObjectMapper,
) : NoteStore {
    private val columns = """n.id,n.front,n.reading,n.meaning,n.example,n.example_meaning,n.explanation,
        n.personal_memo,n.hangul_hint,n.source_id,(b.note_id is not null) bookmarked,
        coalesce(s.suspended,false) excluded,c.word_audio_id,n.kind,n.raw_fields,d.level"""
    private val joins = """from study_note n left join bookmark b on b.note_id=n.id and b.user_id=?
        left join card c on c.id=(select c2.id from card c2 where c2.note_id=n.id and c2.owner_id=? order by c2.id limit 1)
        left join user_card_state s on s.card_id=c.id and s.user_id=?
        left join deck d on d.id=c.deck_id and d.owner_id=n.owner_id"""

    override fun find(
        owner: UUID,
        id: UUID,
    ) = jdbc.query("select $columns $joins where n.owner_id=? and n.id=?", ::map, owner, owner, owner, owner, id).firstOrNull()

    override fun search(
        owner: UUID,
        query: String,
        page: Int,
        size: Int,
        kind: String,
    ): NotePage {
        val pattern =
            "%" +
                query
                    .trim()
                    .take(100)
                    .replace("\\", "\\\\")
                    .replace("%", "\\%")
                    .replace("_", "\\_") + "%"
        val kindClause =
            when (kind) {
                "vocabulary" -> " and n.kind='vocabulary'"
                "grammar" -> " and n.kind='grammar'"
                "kana" -> " and n.kind in ('hiragana','katakana')"
                else -> ""
            }
        val where =
            "n.owner_id=? and (n.front ilike ? escape '\\' or n.reading ilike ? escape '\\' or n.meaning ilike ? escape '\\')" + kindClause
        val total =
            jdbc.queryForObject(
                "select count(*) from study_note n where $where",
                Int::class.java,
                owner,
                pattern,
                pattern,
                pattern,
            ) ?: 0
        val rows =
            jdbc.query(
                "select $columns $joins where $where order by n.updated_at desc,n.id limit ? offset ?",
                ::map,
                owner,
                owner,
                owner,
                owner,
                pattern,
                pattern,
                pattern,
                size,
                page * size,
            )
        return NotePage(rows, total, (total + size - 1) / size, page)
    }

    override fun lockUser(owner: UUID) {
        jdbc.queryForObject("select id from app_user where id=? for update", UUID::class.java, owner)
    }

    override fun personalDeck(owner: UUID): UUID =
        jdbc
            .query(
                "select id from deck where owner_id=? and source_id is null and source_path='PERSONAL'",
                { rs, _ -> rs.getObject(1, UUID::class.java) },
                owner,
            ).firstOrNull()
            ?: UUID.randomUUID().also {
                jdbc.update(
                    "insert into deck(id,owner_id,source_path,title,kind,selected) values(?,?,'PERSONAL','내 단어','vocabulary',false)",
                    it,
                    owner,
                )
            }

    override fun create(
        owner: UUID,
        id: UUID,
        deck: UUID,
        body: NoteCreate,
    ) {
        jdbc.update(
            """insert into study_note(id,owner_id,kind,front,reading,meaning,example,example_meaning,personal_memo,hangul_hint)
            values(?,?,'vocabulary',?,?,?,?,?,?,?)""",
            id,
            owner,
            body.japanese,
            body.reading,
            body.meaning,
            body.example,
            body.exampleMeaning,
            body.memo,
            body.hangulHint,
        )
        jdbc.update(
            "insert into card(id,owner_id,deck_id,note_id,direction) values(?,?,?,?,'recognition')",
            UUID.randomUUID(),
            owner,
            deck,
            id,
        )
    }

    override fun update(
        owner: UUID,
        id: UUID,
        body: NotePatch,
    ) {
        jdbc.update(
            """update study_note set front=?,reading=?,meaning=?,example=?,example_meaning=?,personal_memo=?,hangul_hint=?,updated_at=now() where id=? and owner_id=?""",
            body.japanese,
            body.reading,
            body.meaning,
            body.example,
            body.exampleMeaning,
            body.memo,
            body.hangulHint,
            id,
            owner,
        )
    }

    override fun bookmark(
        owner: UUID,
        id: UUID,
        marked: Boolean,
    ) {
        if (marked) {
            jdbc.update("insert into bookmark(user_id,note_id) values(?,?) on conflict do nothing", owner, id)
        } else {
            jdbc.update("delete from bookmark where user_id=? and note_id=?", owner, id)
        }
    }

    override fun exclude(
        owner: UUID,
        id: UUID,
        excluded: Boolean,
    ) {
        jdbc.update(
            """insert into user_card_state(id,user_id,card_id,suspended)
            select gen_random_uuid(),?,c.id,? from card c where c.note_id=? and c.owner_id=?
            on conflict(user_id,card_id) do update set suspended=excluded.suspended""",
            owner,
            excluded,
            id,
            owner,
        )
    }

    private fun map(
        rs: java.sql.ResultSet,
        ignored: Int,
    ): NoteView {
        val front = rs.getString("front")
        return NoteView(
            rs.getObject("id", UUID::class.java),
            front,
            front,
            rs.getString("reading"),
            rs.getString("meaning"),
            rs.getString("example"),
            rs.getString("example_meaning"),
            rs.getString("explanation"),
            rs.getString("personal_memo"),
            rs.getString("hangul_hint"),
            if (rs.getObject("source_id") == null) "PERSONAL" else "JLPT MAX",
            rs.getBoolean("bookmarked"),
            rs.getBoolean("excluded"),
            rs.getObject("word_audio_id", UUID::class.java),
            rs.getString("kind"),
            rs.getString("level"),
            if (rs.getString("kind") ==
                "grammar"
            ) {
                rs.getString("raw_fields")?.let { convertedGrammarFocus(mapper.readTree(it), front) }
            } else {
                null
            },
        )
    }
}
