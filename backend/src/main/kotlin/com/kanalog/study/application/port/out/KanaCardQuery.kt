package com.kanalog.study.application.port.out

import com.kanalog.study.domain.KanaMixRequest
import java.util.UUID

interface KanaCardQuery { fun cards(owner: UUID, input: KanaMixRequest): List<UUID> }
