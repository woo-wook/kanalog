package com.kanalog.settings.infrastructure

import com.kanalog.settings.application.model.SettingsView
import com.kanalog.settings.application.port.out.SettingsStore
import java.util.UUID
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.stereotype.Repository

@Repository
class JdbcSettingsStore(private val jdbc: JdbcTemplate) : SettingsStore {
    override fun find(owner: UUID) = jdbc.query("""select s.*,u.timezone from user_settings s join app_user u on u.id=s.user_id where s.user_id=?""", {rs,_->SettingsView(
        rs.getInt("daily_new_limit"),rs.getBoolean("show_reading_hint"),rs.getBoolean("show_hangul_hint"),rs.getBoolean("auto_play_audio"),rs.getBoolean("allow_audio_before_reveal"),rs.getBoolean("tts_fallback"),rs.getDouble("playback_speed"),rs.getString("timezone"),rs.getString("preferred_voice"),rs.getString("audio_engine"),rs.getString("supertonic_voice"))},owner).firstOrNull()
    override fun save(owner: UUID, settings: SettingsView) {
        jdbc.update("""update user_settings set daily_new_limit=?,show_reading_hint=?,show_hangul_hint=?,auto_play_audio=?,allow_audio_before_reveal=?,tts_fallback=?,playback_speed=?,preferred_voice=?,audio_engine=?,supertonic_voice=? where user_id=?""",
            settings.dailyNewLimit,settings.showReadingHint,settings.showHangulHint,settings.autoPlayAudio,settings.allowAudioBeforeReveal,settings.ttsFallback,settings.playbackSpeed,settings.preferredVoice,settings.audioEngine,settings.supertonicVoice,owner)
        jdbc.update("update app_user set timezone=? where id=?",settings.timezone,owner)
    }
}
