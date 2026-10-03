package com.kanalog.media.application.port.out

import java.io.OutputStream
import java.util.UUID

interface MediaContent {
    val mime: String
    val length: Long

    fun writeTo(
        output: OutputStream,
        start: Long,
        end: Long,
    )
}

interface MediaStore {
    fun find(
        owner: UUID,
        id: UUID,
    ): MediaContent?
}
