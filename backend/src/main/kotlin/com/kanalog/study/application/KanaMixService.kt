package com.kanalog.study.application

import com.kanalog.study.application.port.out.KanaCardQuery
import com.kanalog.study.domain.KanaMixRequest
import org.springframework.stereotype.Service
import java.util.UUID

@Service
class KanaMixService(
    private val query: KanaCardQuery,
) {
    fun cards(
        owner: UUID,
        input: KanaMixRequest,
    ): List<UUID> {
        input.validate()
        return query.cards(owner, input)
    }
}
