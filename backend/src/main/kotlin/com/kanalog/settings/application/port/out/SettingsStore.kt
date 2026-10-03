package com.kanalog.settings.application.port.out

import com.kanalog.settings.application.model.SettingsView
import java.util.UUID

interface SettingsStore {
    fun find(owner: UUID): SettingsView?

    fun save(
        owner: UUID,
        settings: SettingsView,
    )
}
