package com.kanalog.progress.infrastructure

import com.kanalog.progress.application.port.out.ActiveLesson
import com.kanalog.progress.application.port.out.ProgressQuery
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.stereotype.Repository
import java.sql.Timestamp
import java.time.Instant
import java.util.UUID

@Repository
class JdbcProgressQuery(
    private val jdbc: JdbcTemplate,
) : ProgressQuery {
    override fun activeLesson(owner: UUID) =
        jdbc
            .query(
                "select us.active_lesson_id,l.title from user_settings us left join course_lesson l on l.id=us.active_lesson_id where us.user_id=?",
                { rs, _ -> ActiveLesson(rs.getObject(1, UUID::class.java), rs.getString(2)) },
                owner,
            ).firstOrNull()

    private fun scope(lesson: UUID?) =
        lesson?.let { "exists(select 1 from lesson_card lc where lc.card_id=c.id and lc.lesson_id='$it')" } ?: "d.selected=true"

    override fun dueInScope(
        owner: UUID,
        lesson: UUID?,
    ) = count(
        """select count(*) from user_card_state s join card c on c.id=s.card_id join deck d on d.id=c.deck_id
        where s.user_id=? and c.owner_id=? and ${scope(
            lesson,
        )} and d.import_status='READY' and c.active=true and s.suspended=false and s.first_seen_at is not null and (s.due_at<=now() or exists(select 1 from review_followup f where f.user_id=s.user_id and f.card_id=c.id and f.due_at<=now()))""",
        owner,
        owner,
    )

    override fun newUsed(
        owner: UUID,
        start: Instant,
        end: Instant,
    ) = count(
        "select count(*) from user_card_state where user_id=? and first_seen_at>=? and first_seen_at<?",
        owner,
        Timestamp.from(start),
        Timestamp.from(end),
    )

    override fun unseenInScope(
        owner: UUID,
        lesson: UUID?,
    ) = count(
        """select count(*) from card c join deck d on d.id=c.deck_id left join user_card_state s on s.card_id=c.id and s.user_id=?
        where c.owner_id=? and ${scope(
            lesson,
        )} and d.import_status='READY' and c.active=true and (s.id is null or (s.first_seen_at is null and s.suspended=false))""",
        owner,
        owner,
    )

    override fun answers(
        owner: UUID,
        start: Instant,
        end: Instant?,
        unique: Boolean,
    ): Int {
        val count = if (unique) "count(distinct card_id)" else "count(*)"
        val args = mutableListOf<Any>(owner, Timestamp.from(start))
        val until =
            if (end != null) {
                args.add(Timestamp.from(end))
                " and reviewed_at<?"
            } else {
                ""
            }
        return count("select $count from review_log where user_id=? and reviewed_at>=?$until", *args.toTypedArray())
    }

    override fun selectedDeck(owner: UUID) =
        jdbc
            .query(
                "select id from deck where owner_id=? and selected=true and import_status='READY' limit 1",
                { rs, _ -> rs.getObject(1, UUID::class.java) },
                owner,
            ).firstOrNull()

    override fun due(owner: UUID) =
        count(
            """select count(*) from user_card_state s join card c on c.id=s.card_id join deck d on d.id=c.deck_id where s.user_id=? and c.owner_id=? and d.import_status='READY' and c.active=true and s.suspended=false and s.first_seen_at is not null and (s.due_at<=now() or exists(select 1 from review_followup f where f.user_id=s.user_id and f.card_id=c.id and f.due_at<=now()))""",
            owner,
            owner,
        )

    override fun lastStudied(owner: UUID) =
        jdbc
            .query(
                "select max(reviewed_at) from review_log where user_id=?",
                { rs, _ -> rs.getTimestamp(1)?.toInstant() },
                owner,
            ).firstOrNull()

    override fun reviewTimes(owner: UUID) =
        jdbc.query(
            "select reviewed_at from review_log where user_id=? order by reviewed_at desc",
            { rs, _ -> rs.getTimestamp(1).toInstant() },
            owner,
        )

    private fun count(
        sql: String,
        vararg args: Any,
    ) = jdbc.queryForObject(sql, Int::class.java, *args) ?: 0
}
