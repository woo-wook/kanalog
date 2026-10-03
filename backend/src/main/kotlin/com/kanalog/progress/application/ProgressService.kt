package com.kanalog.progress.application
import com.kanalog.common.time.localDayWindow
import com.kanalog.progress.application.model.*
import com.kanalog.progress.application.port.out.ProgressQuery
import com.kanalog.progress.domain.LearningStreak
import com.kanalog.settings.application.SettingsService
import com.kanalog.study.application.StudyService
import java.time.*
import java.util.UUID
import org.springframework.stereotype.Service
@Service
class ProgressService(private val query: ProgressQuery, private val study: StudyService, private val settings: SettingsService) {
    fun dashboard(user: UUID): DashboardView {
        val zone = study.zone(user)
        val (begin, end) = localDayWindow(Instant.now(),zone)
        val active = query.activeLesson(user)
        val used = query.newUsed(user,begin,end)
        val remaining = maxOf(0,settings.settings(user).dailyNewLimit-used)
        return DashboardView(query.dueInScope(user,active?.id), minOf(query.unseenInScope(user,active?.id),remaining), query.answers(user,begin,end,true), query.answers(user,begin,end), streak(user,zone), query.selectedDeck(user), active?.id, active?.title, remaining)
    }
    fun stats(user: UUID): StatsView {
        val zone = study.zone(user)
        val today = LocalDate.now(zone)
        fun since(days: Long) = today.minusDays(days-1).atStartOfDay(zone).toInstant()
        val decks = study.decks(user).map { DeckProgress(it.id,it.title,it.totalCards,it.studiedCards) }
        return StatsView(query.answers(user,since(7)),query.answers(user,since(7),unique=true),query.answers(user,since(30)),query.answers(user,since(30),unique=true),decks.sumOf {it.studiedCards},decks.sumOf {it.totalCards-it.studiedCards},query.due(user),streak(user,zone),query.lastStudied(user),decks)
    }
    private fun streak(user: UUID, zone: ZoneId) = LearningStreak.count(query.reviewTimes(user).map { it.atZone(zone).toLocalDate() }.toSet(),LocalDate.now(zone))
}
