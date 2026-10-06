package com.kanalog.android

import android.content.Context
import android.media.MediaPlayer
import android.speech.tts.TextToSpeech
import com.kanalog.core.Note
import java.io.File
import java.util.Locale

class LocalAudio(
    private val context: Context,
    private val report: (String) -> Unit,
) {
    private var player: MediaPlayer? = null
    private var ready = false
    private val tts = TextToSpeech(context) { status -> ready = status == TextToSpeech.SUCCESS }

    fun stop() {
        player?.release()
        player = null
        tts.stop()
    }

    fun play(note: Note) {
        val example = if (note.kind == "grammar") note.examples.firstOrNull() else null
        play(example?.japanese ?: note.front, example?.audio ?: note.audio)
    }

    fun play(
        text: String,
        audio: String?,
    ) {
        stop()
        if (audio != null) {
            try {
                require(
                    com.kanalog.core.LocalStore
                        .validAudio(audio),
                )
                val stored = File(context.filesDir, audio)
                if (!stored.exists()) {
                    stored.parentFile?.mkdirs()
                    context.assets.open(audio).use { input -> stored.outputStream().use(input::copyTo) }
                }
                player =
                    MediaPlayer().apply {
                        setDataSource(stored.absolutePath)
                        setOnErrorListener { _, _, _ ->
                            report("음성을 재생할 수 없습니다. 다시 시도하세요.")
                            true
                        }
                        setOnCompletionListener { stop() }
                        prepare()
                        start()
                    }
                return
            } catch (_: Exception) {
                report("원본 음성을 찾을 수 없어 기기 음성을 사용합니다.")
            }
        }
        if (!ready) {
            report("기기 음성을 준비 중입니다. 다시 눌러 주세요.")
            return
        }
        val offline = tts.voices?.firstOrNull { it.locale.language == Locale.JAPANESE.language && !it.isNetworkConnectionRequired }
        if (offline == null) {
            report("기기 설정에서 오프라인 일본어 음성을 설치해 주세요.")
            return
        }
        tts.voice = offline
        val japanese = text.lines().filter { line -> line.any { it in '\u3040'..'\u30ff' || it in '\u4e00'..'\u9fff' } }.joinToString("。")
        if (japanese.isBlank()) {
            report("읽을 일본어가 없습니다.")
            return
        }
        if (tts.speak(japanese, TextToSpeech.QUEUE_FLUSH, null, "kanalog-local") == TextToSpeech.ERROR) report("음성을 재생할 수 없습니다.")
    }

    fun close() {
        stop()
        tts.shutdown()
    }
}
