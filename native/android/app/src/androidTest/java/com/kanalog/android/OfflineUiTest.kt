package com.kanalog.android

import androidx.compose.foundation.layout.Column
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.assertIsOn
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performScrollTo
import androidx.test.platform.app.InstrumentationRegistry
import com.kanalog.core.Example
import com.kanalog.core.GrammarFocus
import com.kanalog.core.HighlightSegment
import com.kanalog.core.LocalState
import com.kanalog.core.LocalStore
import com.kanalog.core.Note
import com.kanalog.core.Progress
import com.kanalog.core.ReadingGuide
import com.kanalog.core.ReadingSegment
import com.kanalog.core.Settings
import com.kanalog.core.StudyScope
import com.kanalog.core.StudySession
import com.kanalog.core.structureGrammarAnswer
import org.junit.Rule
import org.junit.Test
import java.io.File

class OfflineUiTest {
    @get:Rule val compose = createComposeRule()

    @Test fun settingsLabelPersistsHangulAndRestoresAfterReopening() {
        val directory = File(InstrumentationRegistry.getInstrumentation().targetContext.cacheDir, "ui-settings-${System.nanoTime()}")
        directory.mkdirs()
        val file = File(directory, "profile.json")
        val store = LocalStore(file)
        try {
            compose.setContent { MaterialTheme { KanalogApp(store, {}, { _, _ -> }, {}, {}, null, {}) } }
            compose.onNodeWithText("설정").performClick()
            compose.onNodeWithText("한글 발음 보조").performClick()
            compose.waitUntil(5_000) { store.snapshot().settings.hangul }
            compose.onNodeWithText("한글 발음 보조").assertIsOn()
            org.junit.Assert.assertTrue(LocalStore(file).snapshot().settings.hangul)
        } finally {
            directory.deleteRecursively()
        }
    }

    @Test fun reviewOnlyLabelTogglesEntireHomeRow() {
        val directory = File(InstrumentationRegistry.getInstrumentation().targetContext.cacheDir, "ui-review-${System.nanoTime()}")
        directory.mkdirs()
        try {
            val store = LocalStore(File(directory, "profile.json"))
            compose.setContent { MaterialTheme { KanalogApp(store, {}, { _, _ -> }, {}, {}, null, {}) } }
            compose
                .onNodeWithText("복습 카드만")
                .performScrollTo()
                .performClick()
                .assertIsOn()
        } finally {
            directory.deleteRecursively()
        }
    }

    @Test fun grammarAnswerIsHiddenUntilRevealAndOriginalJapaneseRemains() {
        val note =
            Note(
                "synthetic:grammar",
                "grammar",
                "この本は新しいです。",
                meaning = "합성 문법 뜻과 쓰임",
                grammarFocus = GrammarFocus("この", listOf(HighlightSegment("この", true), HighlightSegment("本は新しいです。", false))),
                examples = listOf(Example("この本は新しいです。", korean = "합성 예문 해석")),
            )
        compose.setContent {
            var answer by remember { mutableStateOf(false) }
            MaterialTheme {
                Column {
                    NoteBody(note, answer, Settings())
                    Button(onClick = { answer = true }) { Text("정답 보기") }
                }
            }
        }
        compose.onNodeWithText("합성 문법 뜻과 쓰임").assertDoesNotExist()
        compose.onNodeWithText("합성 예문 해석").assertDoesNotExist()
        compose.onNodeWithText("この").assertIsDisplayed()
        compose.onNodeWithText("정답 보기").performClick()
        compose.onNodeWithText("합성 문법 뜻과 쓰임").assertIsDisplayed()
        compose.onNodeWithText("합성 예문 해석").assertIsDisplayed()
    }

    @Test fun hintOffKeepsHangulAndReadingsHidden() {
        val note =
            Note(
                "synthetic:word",
                "vocabulary",
                "試験",
                reading = "しけん",
                meaning = "합성 정답",
                readingGuide = ReadingGuide(listOf(ReadingSegment("試験", "しけん")), hangul = "시켄"),
            )
        compose.setContent { MaterialTheme { NoteBody(note, false, Settings(hangul = true, hintBeforeAnswer = false)) } }
        compose.onNodeWithText("試験").assertIsDisplayed()
        compose.onNodeWithText("しけん").assertDoesNotExist()
        compose.onNodeWithText("한글 보조 · 시켄").assertDoesNotExist()
        compose.onNodeWithText("합성 정답").assertDoesNotExist()
    }
}
