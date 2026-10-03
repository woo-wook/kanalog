package com.kanalog.imports.application

import com.kanalog.common.crypto.sha256
import com.kanalog.content.infrastructure.convertedGrammarFocus
import com.kanalog.course.application.CourseService
import com.kanalog.imports.application.model.ImportResult
import java.nio.file.Files
import java.nio.file.LinkOption
import java.nio.file.Path
import java.nio.file.StandardCopyOption
import java.security.MessageDigest
import java.util.UUID
import org.springframework.beans.factory.annotation.Value
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import tools.jackson.databind.JsonNode
import tools.jackson.databind.ObjectMapper

@Service
class MaxImportService(private val jdbc:JdbcTemplate,private val mapper:ObjectMapper,private val courses:CourseService,
    @Value("\${app.media-root}") root:String) {
    private val mediaRoot=Path.of(root).toAbsolutePath().normalize()
    private val sourceKey="jlpt-max"
    private val sourceUrl="https://github.com/truthyblue/jlpt-max-deck"

    @Transactional
    fun importData(owner:UUID,dir:Path):ImportResult {
        val notesFile=dir.resolve("notes.jsonl")
        val mediaFile=dir.resolve("media.jsonl")
        val reportFile=dir.resolve("report.json")
        if(!Files.isRegularFile(notesFile) || !Files.isRegularFile(mediaFile) || !Files.isRegularFile(reportFile))
            error("Complete notes.jsonl, media.jsonl and report.json are required")
        val reportText=Files.readString(reportFile)
        val report=mapper.readTree(reportText)
        val version=report.requireText("version")
        val sha=report.requireText("sha256")
        if(version!="2.1.2" || sha!="c0898a086a7d440e4081c8a68fcd0c63e678bb345012888d1fc8e5270d762532")
            error("Unsupported MAX version or checksum")
        if(report.path("missingMediaReferences").asInt(0)!=0)
            error("Converted MAX data has missing media references")
        val source=jdbc.query("select id from content_source where owner_id=? and source_key=? and source_version=?",
            {rs,_->rs.getObject(1,UUID::class.java)},owner,sourceKey,version).firstOrNull() ?: UUID.randomUUID().also {
            jdbc.update("""insert into content_source(id,owner_id,source_key,source_version,source_url,sha256,notice)
                values(?,?,?,?,?,?,?)""",it,owner,sourceKey,version,sourceUrl,sha,
                "Private personal import; commercial redistribution is unverified")
        }
        val media=readMedia(owner,source,dir,mediaFile)
        if(report.path("mediaExtracted").asInt(-1)!=media.size) error("Converted media count differs from report")
        val deckCache=mutableMapOf<String,UUID>()
        var cards=0
        Files.newBufferedReader(notesFile).useLines { lines -> lines.forEach { line ->
            if(line.isBlank()) return@forEach
            val row=mapper.readTree(line)
            if(row.path("schemaVersion").asInt()!=1 || row.requireText("sourceVersion")!=version)
                error("Unsupported converted note schema/version")
            val path=row.requireText("deckPath"); val guid=row.requireText("sourceGuid")
            val kind=row.requireText("kind"); val direction=row.requireText("cardDirection")
            val front=row.requireText("front")
            if(kind=="grammar") convertedGrammarFocus(row,front)
            if(kind !in setOf("vocabulary","grammar") || direction !in setOf("recognition","recall"))
                error("Unsupported card kind or direction")
            val deck=deckCache.getOrPut(path) { findOrCreateDeck(owner,source,path,row.path("level").asString(""),kind) }
            val note=jdbc.query("select id from study_note where owner_id=? and source_id=? and source_guid=?",
                {rs,_->rs.getObject(1,UUID::class.java)},owner,source,guid).firstOrNull() ?: UUID.randomUUID()
            val first=row.path("examples").takeIf { it.isArray && it.size()>0 }?.get(0)
            val example=first?.path("japanese")?.asString()?.takeIf { it.isNotBlank() }
            val exampleMeaning=first?.path("korean")?.asString()?.takeIf { it.isNotBlank() }
            val reading=row.optionalText("reading")
            val meaning=if(kind=="vocabulary") row.optionalText("meaning") else row.optionalText("answer")
            val explanation=if(kind=="grammar") row.optionalText("grammarKind") else null
            jdbc.update("""insert into study_note(id,owner_id,source_id,source_note_id,source_guid,kind,front,reading,
                meaning,example,example_meaning,explanation,part_of_speech,raw_fields,tags)
                values(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) on conflict(owner_id,source_id,source_guid)
                do update set source_note_id=excluded.source_note_id,kind=excluded.kind,front=excluded.front,
                reading=excluded.reading,meaning=excluded.meaning,example=excluded.example,
                example_meaning=excluded.example_meaning,explanation=excluded.explanation,
                part_of_speech=excluded.part_of_speech,
                raw_fields=excluded.raw_fields,tags=excluded.tags,updated_at=now()""",
                note,owner,source,row.requireText("sourceNoteId"),guid,kind,front,reading,meaning,example,exampleMeaning,
                explanation,row.optionalText("partOfSpeech"),line,row.path("tags").toString())
            val noteId=jdbc.queryForObject("select id from study_note where owner_id=? and source_id=? and source_guid=?",
                UUID::class.java,owner,source,guid) ?: error("Imported note missing")
            val wordAudio=row.optionalText("wordAudio")?.let { media[it] ?: error("Missing word audio: $it") }
            val examples=row.path("examples")
            jdbc.update("delete from note_example where note_id=? and owner_id=?",noteId,owner)
            if(examples.isArray) for(index in 0 until examples.size()) {
                val entry=examples.get(index) ?: continue
                val japanese=entry.optionalText("japanese") ?: continue
                val audio=entry.optionalText("audio")?.let { media[it] ?: error("Missing example audio: $it") }
                jdbc.update("""insert into note_example(id,owner_id,note_id,ordinal,japanese,reading,korean,audio_id)
                    values(?,?,?,?,?,?,?,?)""",UUID.randomUUID(),owner,noteId,index,japanese,
                    entry.optionalText("reading"),entry.optionalText("korean"),audio)
            }
            val exampleAudio=first?.optionalText("audio")?.let { media[it] ?: error("Missing example audio: $it") }
            val existingCard=jdbc.query("select id from card where owner_id=? and deck_id=? and note_id=? and direction=?",
                {rs,_->rs.getObject(1,UUID::class.java)},owner,deck,noteId,direction).firstOrNull()
            if(existingCard==null) jdbc.update("""insert into card(id,owner_id,deck_id,note_id,source_card_id,direction,word_audio_id,example_audio_id)
                values(?,?,?,?,?,?,?,?)""",UUID.randomUUID(),owner,deck,noteId,row.requireText("sourceCardId"),direction,wordAudio,exampleAudio)
            else jdbc.update("""update card set source_card_id=?,word_audio_id=?,example_audio_id=?,active=true where id=?""",
                row.requireText("sourceCardId"),wordAudio,exampleAudio,existingCard)
            cards++
        } }
        if(cards==0) error("Converted notes.jsonl has no supported cards")
        if(report.path("convertedCards").asInt(-1)!=cards) error("Converted card count differs from report")
        deckCache.values.forEach { jdbc.update("update deck set import_status='READY' where id=? and owner_id=?",it,owner) }
        courses.synchronize(owner)
        return ImportResult(source,cards,media.size,reportText)
    }

    @Transactional
    fun refreshGrammarFocus(owner:UUID,dir:Path):Int {
        val report=mapper.readTree(Files.readString(dir.resolve("report.json")))
        check(report.requireText("version")=="2.1.2" && report.requireText("sha256")=="c0898a086a7d440e4081c8a68fcd0c63e678bb345012888d1fc8e5270d762532") { "Unsupported MAX version or checksum" }
        var updated=0
        Files.newBufferedReader(dir.resolve("notes.jsonl")).useLines { lines -> lines.filter {it.isNotBlank()}.forEach { line ->
            val row=mapper.readTree(line)
            if(row.path("kind").asString("")!="grammar") return@forEach
            check(row.path("schemaVersion").asInt()==1 && row.requireText("sourceVersion")=="2.1.2") { "Unsupported converted grammar version" }
            val front=row.requireText("front")
            check(convertedGrammarFocus(row,front)!=null) { "Original grammar highlight is unavailable" }
            val existing=jdbc.query("""select n.id,n.front,n.meaning from study_note n join content_source s on s.id=n.source_id
                where n.owner_id=? and s.owner_id=? and s.source_key=? and s.source_version='2.1.2' and n.source_guid=? and n.kind='grammar'""",
                {rs,_->Triple(rs.getObject(1,UUID::class.java),rs.getString(2),rs.getString(3))},owner,owner,sourceKey,row.requireText("sourceGuid")).singleOrNull()
                ?: error("Matching owned grammar note was not found")
            check(existing.second==front && existing.third==row.requireText("answer")) { "Grammar content differs; use reviewed reimport" }
            jdbc.update("update study_note set raw_fields=?,updated_at=now() where id=? and owner_id=?",line,existing.first,owner)
            updated++
        } }
        check(updated>0) { "No original grammar highlights to update" }
        return updated
    }

    private fun findOrCreateDeck(owner:UUID,source:UUID,path:String,level:String,kind:String):UUID {
        val title="${if(kind=="vocabulary") "어휘" else "문법"} $level"
        val existing=jdbc.query("select id from deck where owner_id=? and source_id=? and source_path=?",
            {rs,_->rs.getObject(1,UUID::class.java)},owner,source,path).firstOrNull()
        if(existing!=null) {
            jdbc.update("update deck set title=?,level=?,kind=? where id=? and owner_id=?",title,level,kind,existing,owner)
            return existing
        }
        val id=UUID.randomUUID()
        val selected=kind=="vocabulary" && level=="N5" &&
            (jdbc.queryForObject("select count(*) from deck where owner_id=? and selected=true",Int::class.java,owner) ?: 0)==0
        jdbc.update("""insert into deck(id,owner_id,source_id,source_path,title,level,kind,import_status,selected)
            values(?,?,?,?,?,?,?,'IMPORTING',?)""",id,owner,source,path,title,level,kind,selected)
        return id
    }

    private fun readMedia(owner:UUID,source:UUID,dir:Path,file:Path):Map<String,UUID> {
        val result=mutableMapOf<String,UUID>()
        val mediaDir=dir.resolve("media").normalize()
        if(!Files.isDirectory(mediaDir) || !mediaDir.toRealPath().startsWith(dir.toRealPath()))
            error("Unsafe media directory")
        Files.newBufferedReader(file).useLines { lines -> lines.forEach { line ->
            if(line.isBlank()) return@forEach
            val row=mapper.readTree(line)
            val name=row.requireText("name")
            if(name=="." || name==".." || name.contains('/') || name.contains('\\') || name.contains('\u0000'))
                error("Unsafe media name")
            val src=mediaDir.resolve(name).normalize()
            if(!src.startsWith(mediaDir) || !Files.isRegularFile(src) || !src.toRealPath().startsWith(mediaDir.toRealPath()))
                error("Missing or unsafe media: $name")
            if(row.requireText("contentType")!="audio/mpeg" || Files.size(src)>50_000_000L)
                error("Unsupported media type or size: $name")
            val digest=MessageDigest.getInstance("SHA-256")
            Files.newInputStream(src).use { stream ->
                val buffer=ByteArray(64*1024)
                while(true) { val n=stream.read(buffer); if(n<0) break; digest.update(buffer,0,n) }
            }
            val sha=digest.digest().joinToString("") { "%02x".format(it) }
            if(sha!=row.requireText("sha256")) error("Media checksum mismatch: $name")
            val relative="$owner/$source/$sha"
            val dest=mediaRoot.resolve(relative).normalize()
            if(!dest.startsWith(mediaRoot)) error("Unsafe media target")
            Files.createDirectories(mediaRoot)
            Files.createDirectories(dest.parent)
            if(!dest.parent.toRealPath().startsWith(mediaRoot.toRealPath()) || Files.isSymbolicLink(dest))
                error("Unsafe media target")
            if(!Files.exists(dest,LinkOption.NOFOLLOW_LINKS)) Files.copy(src,dest,StandardCopyOption.COPY_ATTRIBUTES)
            val id=jdbc.query("select id from media_asset where owner_id=? and source_id=? and original_name=?",
                {rs,_->rs.getObject(1,UUID::class.java)},owner,source,name).firstOrNull() ?: UUID.randomUUID()
            jdbc.update("""insert into media_asset(id,owner_id,source_id,original_name,storage_path,sha256,mime,size_bytes)
                values(?,?,?,?,?,?,?,?) on conflict(owner_id,source_id,original_name)
                do update set storage_path=excluded.storage_path,sha256=excluded.sha256,mime=excluded.mime,
                size_bytes=excluded.size_bytes""",id,owner,source,name,relative,sha,row.requireText("contentType"),Files.size(src))
            result[name]=id
        } }
        return result
    }
}

private fun JsonNode.requireText(name:String):String = path(name).asString("").takeIf { it.isNotBlank() }
    ?: error("Missing required converted field: $name")
private fun JsonNode.optionalText(name:String):String? = path(name).asString("").takeIf { it.isNotBlank() }
