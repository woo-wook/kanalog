package com.kanalog.media.infrastructure

import com.kanalog.common.error.FailureStatus
import com.kanalog.common.error.fail
import com.kanalog.media.application.port.out.MediaContent
import com.kanalog.media.application.port.out.MediaStore
import org.springframework.beans.factory.annotation.Value
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.stereotype.Repository
import java.io.OutputStream
import java.io.RandomAccessFile
import java.nio.file.Files
import java.nio.file.LinkOption
import java.nio.file.Path
import java.util.UUID

@Repository
class FileMediaStore(
    private val jdbc: JdbcTemplate,
    @Value("\${app.media-root}") root: String,
) : MediaStore {
    private val mediaRoot = Path.of(root).toAbsolutePath().normalize()

    override fun find(
        owner: UUID,
        id: UUID,
    ): MediaContent? {
        val item =
            jdbc
                .query(
                    """select storage_path,mime,size_bytes from media_asset
            where id=? and owner_id=?""",
                    { rs, _ -> Triple(rs.getString(1), rs.getString(2), rs.getLong(3)) },
                    id,
                    owner,
                ).firstOrNull() ?: return null
        val path = mediaRoot.resolve(item.first).normalize()
        if (!path.startsWith(mediaRoot) || !Files.isRegularFile(path, LinkOption.NOFOLLOW_LINKS) ||
            !path.toRealPath().startsWith(mediaRoot.toRealPath())
        ) {
            return null
        }
        val length = Files.size(path)
        if (length != item.third || length <= 0L) {
            fail("MEDIA_CORRUPT", "음성 파일을 확인할 수 없습니다", FailureStatus.INTERNAL_SERVER_ERROR)
        }
        return FileMediaContent(path, item.second, length)
    }
}

private class FileMediaContent(
    private val path: Path,
    override val mime: String,
    override val length: Long,
) : MediaContent {
    override fun writeTo(
        output: OutputStream,
        start: Long,
        end: Long,
    ) {
        RandomAccessFile(path.toFile(), "r").use { file ->
            file.seek(start)
            var remaining = end - start + 1
            val buffer = ByteArray(64 * 1024)
            while (remaining > 0) {
                val n = file.read(buffer, 0, minOf(buffer.size.toLong(), remaining).toInt())
                if (n < 0) break
                output.write(buffer, 0, n)
                remaining -= n
            }
        }
    }
}
