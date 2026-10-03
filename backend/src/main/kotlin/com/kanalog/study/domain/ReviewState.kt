package com.kanalog.study.domain

import com.kanalog.common.error.fail
import java.time.Instant
import java.util.UUID
import com.kanalog.common.error.FailureStatus

data class ReviewState(val id: UUID, val json: String?, val version: Long, val firstSeen: Instant?, val dueAt: Instant?) {
    fun requireReviewable(expectedVersion: Long, now: Instant) {
        if (version != expectedVersion) fail("STALE_CARD", "다른 기기에서 변경된 카드입니다. 새로 불러오세요", FailureStatus.CONFLICT)
        if (firstSeen != null && (dueAt == null || dueAt.isAfter(now)))
            fail("CARD_NOT_DUE", "아직 복습 시각이 되지 않았습니다", FailureStatus.CONFLICT)
    }
}
