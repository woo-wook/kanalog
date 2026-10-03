package com.kanalog.media.presentation

import com.kanalog.auth.presentation.user
import com.kanalog.common.error.fail
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import java.io.RandomAccessFile
import java.nio.file.Files
import java.nio.file.LinkOption
import java.nio.file.Path
import java.util.UUID
import org.springframework.beans.factory.annotation.Value
import org.springframework.http.HttpStatus
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.RestController

@RestController
class MediaController(private val jdbc: JdbcTemplate, @Value("\${app.media-root}") root: String) {
    private val mediaRoot = Path.of(root).toAbsolutePath().normalize()

    @GetMapping("/api/media/{id}")
    fun media(@PathVariable id: UUID, request: HttpServletRequest, response: HttpServletResponse) {
        val item = jdbc.query("""select storage_path,mime,size_bytes from media_asset
            where id=? and owner_id=?""", { rs, _ -> Triple(rs.getString(1), rs.getString(2), rs.getLong(3)) },
            id,request.user().id).firstOrNull()
            ?: fail("MEDIA_NOT_FOUND","음성을 찾을 수 없습니다",HttpStatus.NOT_FOUND)
        val path = mediaRoot.resolve(item.first).normalize()
        if (!path.startsWith(mediaRoot) || !Files.isRegularFile(path,LinkOption.NOFOLLOW_LINKS) ||
            !path.toRealPath().startsWith(mediaRoot.toRealPath()))
            fail("MEDIA_NOT_FOUND","음성을 찾을 수 없습니다",HttpStatus.NOT_FOUND)
        val length = Files.size(path)
        if (length != item.third || length <= 0L) fail("MEDIA_CORRUPT","음성 파일을 확인할 수 없습니다",HttpStatus.INTERNAL_SERVER_ERROR)
        val range = request.getHeader("Range")
        val parsed = if (range == null) null else parseRange(range,length)
        if (range != null && parsed == null) {
            response.status=416
            response.setHeader("Cache-Control","private, no-store")
            response.setHeader("Content-Range","bytes */$length")
            return
        }
        val start=parsed?.first ?: 0L
        val end=parsed?.second ?: length-1
        response.status=if(parsed==null) 200 else 206
        response.contentType=item.second
        response.setHeader("Accept-Ranges","bytes")
        response.setHeader("Cache-Control","private, no-store")
        response.setHeader("Content-Length",(end-start+1).toString())
        if(parsed!=null) response.setHeader("Content-Range","bytes $start-$end/$length")
        RandomAccessFile(path.toFile(),"r").use { file ->
            file.seek(start)
            var remaining=end-start+1
            val buffer=ByteArray(64*1024)
            while(remaining>0) {
                val n=file.read(buffer,0,minOf(buffer.size.toLong(),remaining).toInt())
                if(n<0) break
                response.outputStream.write(buffer,0,n)
                remaining-=n
            }
        }
    }
    private fun parseRange(value:String,length:Long):Pair<Long,Long>? {
        val match=Regex("^bytes=(\\d*)-(\\d*)$").matchEntire(value) ?: return null
        val left=match.groupValues[1]; val right=match.groupValues[2]
        if(left.isEmpty() && right.isEmpty()) return null
        return try {
            val start=if(left.isEmpty()) maxOf(0,length-right.toLong()) else left.toLong()
            val end=if(left.isEmpty()) length-1 else if(right.isEmpty()) length-1 else minOf(length-1,right.toLong())
            if(start<0 || start>=length || end<start) null else start to end
        } catch (_:NumberFormatException) { null }
    }
}
