package com.kanalog.media.presentation

import com.kanalog.auth.presentation.user
import com.kanalog.media.application.MediaService
import com.kanalog.media.domain.ByteRanges
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.RestController
import java.util.UUID

@RestController
class MediaController(
    private val media: MediaService,
) {
    @GetMapping("/api/media/{id}")
    fun media(
        @PathVariable id: UUID,
        request: HttpServletRequest,
        response: HttpServletResponse,
    ) {
        val item = media.get(request.user().id, id)
        val length = item.length
        val range = request.getHeader("Range")
        val parsed = if (range == null) null else ByteRanges.parse(range, length)
        if (range != null && parsed == null) {
            response.status = 416
            response.setHeader("Cache-Control", "private, no-store")
            response.setHeader("Content-Range", "bytes */$length")
            return
        }
        val start = parsed?.first ?: 0L
        val end = parsed?.second ?: length - 1
        response.status = if (parsed == null) 200 else 206
        response.contentType = item.mime
        response.setHeader("Accept-Ranges", "bytes")
        response.setHeader("Cache-Control", "private, no-store")
        response.setHeader("Content-Length", (end - start + 1).toString())
        if (parsed != null) response.setHeader("Content-Range", "bytes $start-$end/$length")
        item.writeTo(response.outputStream, start, end)
    }
}
