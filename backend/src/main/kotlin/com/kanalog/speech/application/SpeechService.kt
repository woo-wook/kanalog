package com.kanalog.speech.application

import com.kanalog.common.error.fail
import com.kanalog.speech.application.model.SpeechRequest
import java.net.URI
import java.net.http.HttpClient
import java.net.http.HttpRequest
import java.net.http.HttpResponse
import java.time.Duration
import java.util.concurrent.Semaphore
import org.springframework.beans.factory.annotation.Value
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.web.bind.annotation.*
import tools.jackson.databind.ObjectMapper

@Service
class SpeechService(@Value("\${app.speech-url:http://127.0.0.1:8090}") url:String, private val mapper:ObjectMapper) {
    private val target=URI(url).also { require(it.scheme in setOf("http","https") && it.host!=null && it.userInfo==null) }.resolve("/synthesize")
    private val client=HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(3)).build()
    private val slots=Semaphore(8)

    fun generate(input:SpeechRequest):ByteArray {
        if(input.text.isBlank() || input.text.length>500 || !input.voice.matches(Regex("[FM][1-5]")))
            fail("BAD_SPEECH_INPUT","음성 요청을 확인하세요")
        if(!slots.tryAcquire()) fail("SPEECH_BUSY","음성을 준비 중입니다. 잠시 후 다시 눌러 주세요.",HttpStatus.TOO_MANY_REQUESTS)
        try {
            val request=HttpRequest.newBuilder(target).timeout(Duration.ofSeconds(45))
                .header("Content-Type","application/json")
                .POST(HttpRequest.BodyPublishers.ofString(mapper.writeValueAsString(input))).build()
            val response=try { client.send(request,HttpResponse.BodyHandlers.ofInputStream()) }
            catch(e:Exception) {
                if(e is InterruptedException) Thread.currentThread().interrupt()
                fail("SPEECH_UNAVAILABLE","음성을 준비하지 못했습니다. 잠시 후 다시 눌러 주세요.",HttpStatus.SERVICE_UNAVAILABLE)
            }
            val bytes=response.body().use { stream ->
                if(response.statusCode()==429) fail("SPEECH_BUSY","다른 음성을 준비 중입니다. 잠시 후 다시 눌러 주세요.",HttpStatus.TOO_MANY_REQUESTS)
                if(response.statusCode()!=200) fail("SPEECH_UNAVAILABLE","음성을 준비하지 못했습니다. 잠시 후 다시 눌러 주세요.",HttpStatus.SERVICE_UNAVAILABLE)
                stream.readNBytes(8*1024*1024+1)
            }
            if(bytes.size !in 44..8*1024*1024 || bytes.copyOfRange(0,4).toString(Charsets.US_ASCII)!="RIFF" ||
                bytes.copyOfRange(8,12).toString(Charsets.US_ASCII)!="WAVE" ||
                !response.headers().firstValue("Content-Type").orElse("").startsWith("audio/wav"))
                fail("BAD_SPEECH","음성 응답을 확인하지 못했습니다.",HttpStatus.BAD_GATEWAY)
            return bytes
        } finally { slots.release() }
    }
}
