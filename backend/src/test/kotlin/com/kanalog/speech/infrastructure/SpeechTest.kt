package com.kanalog.speech.infrastructure

import com.kanalog.common.error.ApiFailure
import com.kanalog.speech.application.SpeechService
import com.kanalog.speech.application.model.SpeechRequest
import com.kanalog.speech.infrastructure.HttpSpeechSynthesizer
import com.sun.net.httpserver.HttpServer
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertThrows
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import tools.jackson.databind.json.JsonMapper
import java.net.InetSocketAddress

class SpeechTest {
    @Test fun `calculator returns checked WAV and rejects failed or malformed upstream responses`() {
        val server = HttpServer.create(InetSocketAddress("127.0.0.1", 0), 0)
        var status = 200
        var data =
            ByteArray(44).also {
                "RIFF".toByteArray().copyInto(it)
                "WAVE".toByteArray().copyInto(it, 8)
            }
        server.createContext("/synthesize") { exchange ->
            val request = exchange.requestBody.readAllBytes().toString(Charsets.UTF_8)
            assertTrue(request.contains("F1"))
            exchange.responseHeaders.set("Content-Type", "audio/wav")
            exchange.sendResponseHeaders(status, data.size.toLong())
            exchange.responseBody.use { it.write(data) }
        }
        server.start()
        try {
            val speech = SpeechService(HttpSpeechSynthesizer("http://127.0.0.1:${server.address.port}", JsonMapper.builder().build()))
            assertEquals(44, speech.generate(SpeechRequest("ア", "F1")).size)
            status = 503
            assertEquals("SPEECH_UNAVAILABLE", assertThrows(ApiFailure::class.java) { speech.generate(SpeechRequest("ア", "F1")) }.code)
            status = 200
            data = "not audio".toByteArray()
            assertEquals("BAD_SPEECH", assertThrows(ApiFailure::class.java) { speech.generate(SpeechRequest("ア", "F1")) }.code)
            assertThrows(ApiFailure::class.java) { speech.generate(SpeechRequest("a".repeat(501), "F1")) }
        } finally {
            server.stop(0)
        }
    }
}
