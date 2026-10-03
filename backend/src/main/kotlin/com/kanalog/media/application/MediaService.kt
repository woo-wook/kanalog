package com.kanalog.media.application

import com.kanalog.common.error.FailureStatus
import com.kanalog.common.error.fail
import com.kanalog.media.application.port.out.MediaStore
import org.springframework.stereotype.Service
import java.util.UUID

@Service
class MediaService(
    private val media: MediaStore,
) {
    fun get(
        owner: UUID,
        id: UUID,
    ) = media.find(owner, id)
        ?: fail("MEDIA_NOT_FOUND", "음성을 찾을 수 없습니다", FailureStatus.NOT_FOUND)
}
