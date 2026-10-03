package com.kanalog.settings.application

import com.kanalog.common.error.FailureStatus
import com.kanalog.common.error.fail
import com.kanalog.settings.application.model.SettingsPatch
import com.kanalog.settings.application.model.SettingsView
import com.kanalog.settings.application.port.out.SettingsStore
import com.kanalog.settings.domain.AudioPreferences
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

@Service
class SettingsService(
    private val store: SettingsStore,
) {
    fun settings(user: UUID) = store.find(user) ?: fail("SETTINGS_MISSING", "설정을 찾을 수 없습니다", FailureStatus.NOT_FOUND)

    @Transactional
    fun patch(
        user: UUID,
        patch: SettingsPatch,
    ): SettingsView {
        val old = settings(user)
        val audio =
            AudioPreferences(
                patch.playbackSpeed ?: old.playbackSpeed,
                patch.audioEngine ?: old.audioEngine,
                patch.supertonicVoice ?: old.supertonicVoice,
                patch.timezone ?: old.timezone,
            )
        val next =
            old.copy(
                dailyNewLimit = patch.dailyNewLimit ?: old.dailyNewLimit,
                showReadingHint = patch.showReadingHint ?: old.showReadingHint,
                showHangulHint = patch.showHangulHint ?: old.showHangulHint,
                autoPlayAudio = patch.autoPlayAudio ?: old.autoPlayAudio,
                allowAudioBeforeReveal =
                    patch.allowAudioBeforeReveal ?: old.allowAudioBeforeReveal,
                ttsFallback = patch.ttsFallback ?: old.ttsFallback,
                playbackSpeed = audio.speed,
                timezone = audio.timezone,
                preferredVoice =
                    (
                        if (patch.preferredVoice ==
                            null
                        ) {
                            old.preferredVoice
                        } else {
                            patch.preferredVoice.takeIf { it.isNotBlank() }
                        }
                    )?.take(200),
                audioEngine = audio.engine,
                supertonicVoice = audio.voice,
            )
        store.save(user, next)
        return settings(user)
    }
}
