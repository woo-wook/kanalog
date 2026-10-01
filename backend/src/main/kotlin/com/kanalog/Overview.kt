package com.kanalog

import jakarta.servlet.http.HttpServletRequest
import jakarta.validation.Valid
import jakarta.validation.constraints.Max
import jakarta.validation.constraints.Min
import org.springframework.http.HttpStatus
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.bind.annotation.*
import java.sql.Timestamp
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.util.UUID

data class SettingsView(
    val dailyNewLimit: Int, val showReadingHint: Boolean, val showHangulHint: Boolean,
    val autoPlayAudio: Boolean, val allowAudioBeforeReveal: Boolean, val ttsFallback: Boolean,
    val playbackSpeed: Double, val timezone: String, val preferredVoice: String?,
    val audioEngine: String, val supertonicVoice: String
)
data class SettingsPatch(
    @field:Min(0) @field:Max(100) val dailyNewLimit: Int? = null,
    val showReadingHint: Boolean? = null, val showHangulHint: Boolean? = null,
    val autoPlayAudio: Boolean? = null, val allowAudioBeforeReveal: Boolean? = null,
    val ttsFallback: Boolean? = null, val playbackSpeed: Double? = null, val timezone: String? = null,
    val preferredVoice: String? = null, val audioEngine: String? = null, val supertonicVoice: String? = null
)
data class DashboardView(val dueCount: Int, val newRemaining: Int, val studiedCardsToday: Int,
                         val answersToday: Int, val streak: Int, val selectedDeckId: UUID?, val activeLessonId: UUID? = null, val activeLessonTitle: String? = null, val dailyNewRemaining: Int = 0)
data class DeckProgress(val deckId: UUID, val title: String, val totalCards: Int, val studiedCards: Int)
data class StatsView(val answers7Days: Int, val uniqueCards7Days: Int, val answers30Days: Int,
                     val uniqueCards30Days: Int, val learnedCards: Int, val unseenCards: Int,
                     val dueCount: Int, val streak: Int, val lastStudiedAt: Instant?, val decks: List<DeckProgress>)

fun localDayWindow(now: Instant, zone: ZoneId): Pair<Instant, Instant> {
    val day = now.atZone(zone).toLocalDate()
    return day.atStartOfDay(zone).toInstant() to day.plusDays(1).atStartOfDay(zone).toInstant()
}

@Service
class OverviewService(private val jdbc: JdbcTemplate, private val study: StudyService) {
    fun settings(user: UUID): SettingsView = jdbc.query("""select s.*,u.timezone from user_settings s
        join app_user u on u.id=s.user_id where s.user_id=?""", { rs, _ -> SettingsView(
        rs.getInt("daily_new_limit"),rs.getBoolean("show_reading_hint"),rs.getBoolean("show_hangul_hint"),
        rs.getBoolean("auto_play_audio"),rs.getBoolean("allow_audio_before_reveal"),
        rs.getBoolean("tts_fallback"),rs.getDouble("playback_speed"),rs.getString("timezone"),
        rs.getString("preferred_voice"),rs.getString("audio_engine"),rs.getString("supertonic_voice")) }, user).firstOrNull()
        ?: fail("SETTINGS_MISSING", "설정을 찾을 수 없습니다", HttpStatus.NOT_FOUND)

    @Transactional
    fun patch(user: UUID, patch: SettingsPatch): SettingsView {
        val old = settings(user)
        val speed = patch.playbackSpeed ?: old.playbackSpeed
        if (speed < 0.5 || speed > 2.0) fail("BAD_SETTING", "재생 속도는 0.5~2 사이여야 합니다")
        val audioEngine = patch.audioEngine ?: old.audioEngine
        if(audioEngine !in setOf("SUPERTONIC","ORIGINAL","DEVICE"))
            fail("BAD_AUDIO_ENGINE", "음성 재생 방식을 확인하세요")
        val supertonicVoice = patch.supertonicVoice ?: old.supertonicVoice
        if(supertonicVoice !in setOf("F1","F2","F3","F4","F5","M1","M2","M3","M4","M5"))
            fail("BAD_SUPERTONIC_VOICE", "Supertonic 음성을 확인하세요")
        val zone = patch.timezone ?: old.timezone
        try { ZoneId.of(zone) } catch (_: Exception) { fail("BAD_TIMEZONE", "시간대를 확인하세요") }
        jdbc.update("""update user_settings set daily_new_limit=?,show_reading_hint=?,show_hangul_hint=?,
            auto_play_audio=?,allow_audio_before_reveal=?,tts_fallback=?,playback_speed=?,preferred_voice=?,audio_engine=?,supertonic_voice=? where user_id=?""",
            patch.dailyNewLimit ?: old.dailyNewLimit, patch.showReadingHint ?: old.showReadingHint,
            patch.showHangulHint ?: old.showHangulHint, patch.autoPlayAudio ?: old.autoPlayAudio,
            patch.allowAudioBeforeReveal ?: old.allowAudioBeforeReveal, patch.ttsFallback ?: old.ttsFallback,
            speed, (if (patch.preferredVoice == null) old.preferredVoice else patch.preferredVoice.takeIf { it.isNotBlank() })?.take(200), audioEngine, supertonicVoice, user)
        jdbc.update("update app_user set timezone=? where id=?", zone, user)
        return settings(user)
    }

    fun dashboard(user: UUID): DashboardView {
        val zone = study.zone(user)
        val (dayStart,dayEnd)=localDayWindow(Instant.now(),zone)
        val start = Timestamp.from(dayStart)
        val end = Timestamp.from(dayEnd)
        val active=jdbc.query("select us.active_lesson_id,l.title from user_settings us left join course_lesson l on l.id=us.active_lesson_id where us.user_id=?",
            {rs,_->rs.getObject(1,UUID::class.java) to rs.getString(2)},user).firstOrNull()
        val scope=active?.first?.let { "exists(select 1 from lesson_card lc where lc.card_id=c.id and lc.lesson_id='$it')" } ?: "d.selected=true"
        val due = count("""select count(*) from user_card_state s join card c on c.id=s.card_id
            join deck d on d.id=c.deck_id where s.user_id=? and c.owner_id=? and $scope
            and d.import_status='READY' and c.active=true and s.suspended=false and s.first_seen_at is not null
            and s.due_at<=now()""", user,user)
        val used = count("select count(*) from user_card_state where user_id=? and first_seen_at>=? and first_seen_at<?",user,start,end)
        val limit = settings(user).dailyNewLimit
        val unseen = count("""select count(*) from card c join deck d on d.id=c.deck_id
            left join user_card_state s on s.card_id=c.id and s.user_id=?
            where c.owner_id=? and $scope and d.import_status='READY' and c.active=true
            and (s.id is null or (s.first_seen_at is null and s.suspended=false))""",user,user)
        val studied = count("select count(distinct card_id) from review_log where user_id=? and reviewed_at>=? and reviewed_at<?",user,start,end)
        val answers = count("select count(*) from review_log where user_id=? and reviewed_at>=? and reviewed_at<?",user,start,end)
        val selected = jdbc.query("select id from deck where owner_id=? and selected=true and import_status='READY' limit 1",
            { rs,_ -> rs.getObject(1,UUID::class.java) },user).firstOrNull()
        return DashboardView(due, minOf(unseen,maxOf(0,limit-used)),studied,answers,streak(user,zone),selected,active?.first,active?.second,maxOf(0,limit-used))
    }

    fun stats(user: UUID): StatsView {
        val zone = study.zone(user)
        val today = LocalDate.now(zone)
        fun since(days: Long) = Timestamp.from(today.minusDays(days-1).atStartOfDay(zone).toInstant())
        fun answers(start: Timestamp) = count("select count(*) from review_log where user_id=? and reviewed_at>=?",user,start)
        fun unique(start: Timestamp) = count("select count(distinct card_id) from review_log where user_id=? and reviewed_at>=?",user,start)
        val decks = study.decks(user).map { DeckProgress(it.id,it.title,it.totalCards,it.studiedCards) }
        val due = count("""select count(*) from user_card_state s join card c on c.id=s.card_id join deck d on d.id=c.deck_id
            where s.user_id=? and c.owner_id=? and d.import_status='READY' and c.active=true and s.suspended=false
            and s.first_seen_at is not null and s.due_at<=now()""",user,user)
        val last = jdbc.query("select max(reviewed_at) from review_log where user_id=?",
            {rs,_ -> rs.getTimestamp(1)?.toInstant()},user).firstOrNull()
        return StatsView(answers(since(7)),unique(since(7)),answers(since(30)),unique(since(30)),
            decks.sumOf { it.studiedCards },decks.sumOf { it.totalCards-it.studiedCards },due,streak(user,zone),last,decks)
    }

    private fun streak(user: UUID, zone: ZoneId): Int {
        val days = jdbc.query("select reviewed_at from review_log where user_id=? order by reviewed_at desc",
            {rs,_ -> rs.getTimestamp(1).toInstant().atZone(zone).toLocalDate()},user).toSet()
        var current = LocalDate.now(zone)
        if (current !in days) current = current.minusDays(1)
        var result = 0
        while (current in days) { result++; current = current.minusDays(1) }
        return result
    }
    private fun count(sql:String,vararg args:Any):Int = jdbc.queryForObject(sql,Int::class.java,*args) ?: 0
}

@RestController
class OverviewController(private val service: OverviewService) {
    @GetMapping("/api/settings") fun settings(request:HttpServletRequest)=service.settings(request.user().id)
    @PatchMapping("/api/settings") fun patch(@Valid @RequestBody body:SettingsPatch,request:HttpServletRequest)=service.patch(request.user().id,body)
    @GetMapping("/api/dashboard") fun dashboard(request:HttpServletRequest)=service.dashboard(request.user().id)
    @GetMapping("/api/stats") fun stats(request:HttpServletRequest)=service.stats(request.user().id)
}
