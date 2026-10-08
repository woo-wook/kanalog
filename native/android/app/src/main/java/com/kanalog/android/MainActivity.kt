package com.kanalog.android

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.provider.DocumentsContract
import androidx.activity.ComponentActivity
import androidx.activity.compose.BackHandler
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.selection.toggleable
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Checkbox
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ElevatedCard
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedCard
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.kanalog.core.Example
import com.kanalog.core.GrammarFocus
import com.kanalog.core.HighlightSegment
import com.kanalog.core.InstallProgress
import com.kanalog.core.LocalState
import com.kanalog.core.LocalStore
import com.kanalog.core.Note
import com.kanalog.core.Progress
import com.kanalog.core.ReadingGuide
import com.kanalog.core.ReadingSegment
import com.kanalog.core.Settings
import com.kanalog.core.StudyScope
import com.kanalog.core.StudySession
import com.kanalog.core.conjugationFor
import com.kanalog.core.learningStats
import com.kanalog.core.structureGrammarAnswer
import com.kanalog.core.vocabularyGrammarDueCount
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.File
import java.io.FileOutputStream
import java.time.Instant
import java.time.ZoneId

class MainActivity : ComponentActivity() {
    private lateinit var audio: LocalAudio

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            MaterialTheme(
                colorScheme =
                    lightColorScheme(
                        primary = Color(0xFF006A63),
                        primaryContainer = Color(0xFF9EF2E7),
                        onPrimaryContainer = Color(0xFF00504A),
                        secondary = Color(0xFF4C635F),
                        secondaryContainer = Color(0xFFCEE8E2),
                        onSecondaryContainer = Color(0xFF304B46),
                        tertiary = Color(0xFF48617B),
                        background = Color(0xFFF5FAF7),
                        onBackground = Color(0xFF171D1B),
                        surface = Color(0xFFF5FAF7),
                        onSurface = Color(0xFF171D1B),
                        surfaceContainer = Color(0xFFE9EFEC),
                        surfaceContainerLow = Color(0xFFEFF5F2),
                        surfaceContainerHigh = Color(0xFFE3EAE6),
                        surfaceContainerHighest = Color(0xFFDEE4E1),
                        outline = Color(0xFF6F7975),
                        outlineVariant = Color(0xFFBEC9C4),
                    ),
            ) {
                var store by remember { mutableStateOf<LocalStore?>(null) }
                var error by remember { mutableStateOf<String?>(null) }
                var attempt by remember { mutableIntStateOf(0) }
                var startupProgress by remember { mutableStateOf<InstallProgress?>(null) }
                LaunchedEffect(attempt) {
                    try {
                        store =
                            withContext(Dispatchers.IO) {
                                DeviceProfile.open(File(filesDir, "profile.json")).also { local ->
                                    if (!local.snapshot().packages.containsKey(
                                            "kanalog-kana",
                                        )
                                    ) {
                                        local.install(
                                            assets.open("builtin-content.json").bufferedReader().use {
                                                it.readText()
                                            },
                                        )
                                    }
                                    if (assets.list("")?.contains("manifest.json") == true) {
                                        val manifest = assets.open("manifest.json").bufferedReader().use { it.readText() }
                                        if (!local.hasInstalledManifest(
                                                manifest,
                                            )
                                        ) {
                                            local.installVerified(
                                                manifest,
                                                ::saveMedia,
                                                { progress -> runOnUiThread { startupProgress = progress } },
                                            ) { path -> assets.open(path).use { it.readBytes() } }
                                        }
                                    }
                                }
                            }
                    } catch (e: Exception) {
                        error = "로컬 데이터를 열 수 없습니다: ${e.message}"
                    }
                }
                if (store == null) {
                    Box(Modifier.fillMaxSize().padding(24.dp), contentAlignment = Alignment.Center) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            if (error ==
                                null
                            ) {
                                CircularProgressIndicator()
                                Spacer(Modifier.height(20.dp))
                                Text("처음 실행: 단어와 음성을 기기에 준비하고 있습니다. 한 번만 진행합니다.")
                                Spacer(Modifier.height(12.dp))
                                startupProgress?.let { progress ->
                                    Text(
                                        when (progress.phase) {
                                            "CONTENT" -> "콘텐츠 검증 중"
                                            "MEDIA" -> "음성 검증 및 저장: ${progress.completed} / ${progress.total} 파일"
                                            "COMMIT" -> "학습 기록을 저장하는 중"
                                            else -> "완료"
                                        },
                                    )
                                }
                            } else {
                                Text(error!!)
                                Button(onClick = {
                                    error = null
                                    attempt++
                                }) { Text("다시 시도") }
                            }
                        }
                    }
                } else {
                    audio = remember { LocalAudio(this) { error = it } }
                    KanalogApp(store!!, { note -> audio.play(note) }, { text, path -> audio.play(text, path) }, {
                        audio.stop()
                    }, { uri -> importFolder(store!!, uri) }, error, {
                        error =
                            null
                    })
                }
            }
        }
    }

    private fun saveMedia(
        path: String,
        bytes: ByteArray,
    ) {
        require(LocalStore.validAudio(path))
        val target = File(filesDir, path)
        target.parentFile?.mkdirs()
        val temp = File(target.parentFile, target.name + ".tmp")
        FileOutputStream(temp).use {
            it.write(bytes)
            it.fd.sync()
        }
        java.nio.file.Files.move(
            temp.toPath(),
            target.toPath(),
            java.nio.file.StandardCopyOption.REPLACE_EXISTING,
            java.nio.file.StandardCopyOption.ATOMIC_MOVE,
        )
    }

    private fun importFolder(
        store: LocalStore,
        tree: Uri,
    ) {
        contentResolver.takePersistableUriPermission(tree, Intent.FLAG_GRANT_READ_URI_PERMISSION)

        fun read(path: String): ByteArray {
            var documentId = DocumentsContract.getTreeDocumentId(tree)
            path.split('/').forEach { name ->
                val children = DocumentsContract.buildChildDocumentsUriUsingTree(tree, documentId)
                val next =
                    contentResolver
                        .query(
                            children,
                            arrayOf(DocumentsContract.Document.COLUMN_DOCUMENT_ID, DocumentsContract.Document.COLUMN_DISPLAY_NAME),
                            null,
                            null,
                            null,
                        )?.use { cursor ->
                            var match: String? = null
                            while (cursor.moveToNext()) {
                                if (cursor.getString(1) == name) {
                                    match = cursor.getString(0)
                                    break
                                }
                            }
                            match
                        } ?: error("파일이 없습니다: $path")
                documentId = next
            }
            val uri = DocumentsContract.buildDocumentUriUsingTree(tree, documentId)
            return contentResolver.openInputStream(uri)?.use { input ->
                val out = java.io.ByteArrayOutputStream()
                val buffer = ByteArray(65536)
                var total = 0
                while (true) {
                    val count = input.read(buffer)
                    if (count <
                        0
                    ) {
                        break
                    }
                    total += count
                    require(total <= 64 * 1024 * 1024)
                    out.write(buffer, 0, count)
                }
                out.toByteArray()
            } ?: error("파일을 읽을 수 없습니다")
        }
        store.installVerified(read("manifest.json").toString(Charsets.UTF_8), ::saveMedia, readFile = ::read)
    }

    override fun onPause() {
        if (::audio.isInitialized) audio.stop()
        super.onPause()
    }

    override fun onDestroy() {
        if (::audio.isInitialized) audio.close()
        super.onDestroy()
    }
}

private object DeviceProfile {
    private var instance: LocalStore? = null

    @Synchronized fun open(file: File): LocalStore = instance ?: LocalStore(file).also { instance = it }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun KanalogApp(
    store: LocalStore,
    play: (Note) -> Unit,
    playText: (String, String?) -> Unit,
    stopAudio: () -> Unit,
    import: (Uri) -> Unit,
    audioError: String?,
    dismissAudioError: () -> Unit,
) {
    var state by remember { mutableStateOf(store.snapshot()) }
    var tab by remember { mutableStateOf("학습") }
    var page by remember { mutableStateOf("home") }
    var selected by remember { mutableStateOf<Note?>(null) }
    var session by remember { mutableStateOf<StudySession?>(null) }
    var busy by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var revision by remember { mutableIntStateOf(0) }
    val scope = rememberCoroutineScope()

    fun action(
        work: () -> Unit,
        done: () -> Unit = {},
    ) {
        if (busy) return
        busy = true
        error = null
        scope.launch {
            try {
                withContext(Dispatchers.IO) { work() }
                state = store.snapshot()
                revision++
                done()
            } catch (
                e: Exception,
            ) {
                error = e.message ?: "저장에 실패했습니다. 다시 시도하세요."
            } finally {
                busy = false
            }
        }
    }

    fun begin(studyScope: StudyScope) {
        if (busy) return
        stopAudio()
        session?.close()
        session = store.startSession(studyScope, Instant.now())
        page =
            "study"
    }
    val picker =
        rememberLauncherForActivityResult(ActivityResultContracts.OpenDocumentTree()) { uri -> uri?.let { action({ import(it) }) } }
    BackHandler(page != "home") {
        stopAudio()
        page = "home"
        selected = null
        session?.close()
        session = null
    }
    Scaffold(
        topBar = {
            TopAppBar(title = {
                Text(
                    if (page ==
                        "study"
                    ) {
                        "연습"
                    } else {
                        "Kanalog · $tab"
                    },
                )
            }, navigationIcon = {
                if (page !=
                    "home"
                ) {
                    TextButton(onClick = {
                        stopAudio()
                        page = "home"
                        selected = null
                        session?.close()
                        session = null
                    }) { Text("뒤로") }
                }
            })
        },
        bottomBar = {
            if (page ==
                "home"
            ) {
                NavigationBar {
                    listOf("학습", "가나표", "검색", "기록", "설정").forEach { label ->
                        NavigationBarItem(selected = tab == label, onClick = {
                            stopAudio()
                            tab =
                                label
                        }, icon = {
                            Text(
                                when (label) {
                                    "학습" -> "あ"
                                    "가나표" -> "表"
                                    "검색" -> "⌕"
                                    "기록" -> "▥"
                                    else -> "⚙"
                                },
                            )
                        }, label = { Text(label) })
                    }
                }
            }
        },
    ) { padding ->
        Column(Modifier.fillMaxSize().padding(padding)) {
            if (busy) LinearProgressIndicator(Modifier.fillMaxWidth())
            (error ?: audioError)?.let { message ->
                Surface(color = MaterialTheme.colorScheme.errorContainer) {
                    Row(Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                        Text(message, Modifier.weight(1f))
                        TextButton(onClick = {
                            error =
                                null
                            dismissAudioError()
                        }) { Text("닫기") }
                    }
                }
            }
            when {
                page == "study" -> {
                    session?.let {
                        StudyScreen(it, state.settings, revision, busy, play, playText, { rating ->
                            action(
                                { it.rate(rating, Instant.now()) },
                                stopAudio,
                            )
                        }, {
                            session?.close()
                            page =
                                "home"
                        }, { n ->
                            session?.close()
                            selected = n
                            page = "detail"
                        })
                    }
                }

                page == "detail" -> {
                    selected?.let { note ->
                        DetailScreen(note, state, busy, play, playText, { bookmark, exclude, memo ->
                            action({
                                store.setFlags(note.id, bookmark, exclude, memo)
                            })
                        }, { front, reading, meaning, level ->
                            action({
                                store.savePersonalNote(
                                    front,
                                    reading,
                                    meaning,
                                    level,
                                    note.id,
                                )
                            }, { selected = store.snapshot().notes.first { it.id == note.id } })
                        })
                    }
                }

                tab == "학습" -> {
                    HomeScreen(state, ::begin)
                }

                tab == "가나표" -> {
                    KanaReference(state.notes, play)
                }

                tab == "검색" -> {
                    SearchScreen(store, state, {
                        selected = it
                        page = "detail"
                    }, { front, reading, meaning, level -> action({ store.savePersonalNote(front, reading, meaning, level) }) })
                }

                tab == "기록" -> {
                    StatsScreen(state)
                }

                tab == "설정" -> {
                    SettingsScreen(
                        state.settings,
                        busy,
                        { settings -> action({ store.saveSettings(settings) }) },
                        { picker.launch(null) },
                        state.packages,
                    )
                }
            }
        }
    }
}

@Composable private fun HomeScreen(
    state: LocalState,
    begin: (StudyScope) -> Unit,
) {
    var kinds by remember { mutableStateOf(setOf("hiragana")) }
    var groups by remember { mutableStateOf(setOf("basic")) }
    var reviewOnly by remember { mutableStateOf(false) }
    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(20.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
        Text("오늘도 한 걸음", style = MaterialTheme.typography.headlineMedium)
        Text("가나부터 JLPT 문법까지, 기기에 저장하며 연습하세요.")
        ElevatedCard(Modifier.fillMaxWidth()) {
            Column(Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Text("가나 섞어 연습", style = MaterialTheme.typography.titleLarge)
                FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    listOf("hiragana" to "히라가나", "katakana" to "가타카나").forEach { (key, label) ->
                        FilterChip(kinds.contains(key), {
                            kinds =
                                if (key in kinds) kinds - key else kinds + key
                        }, { Text(label) })
                    }
                }
                FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    listOf(
                        "basic" to "기본 46",
                        "voiced" to "탁음 20",
                        "semiVoiced" to "반탁음 5",
                        "yoon" to "요음 33",
                    ).forEach { (key, label) ->
                        FilterChip(groups.contains(key), {
                            groups =
                                if (key in groups) groups - key else groups + key
                        }, { Text(label) })
                    }
                }
                val count = state.notes.count { it.kind in kinds && it.group in groups && state.progress[it.id]?.excluded != true }
                Text("선택한 문자 전체 $count 장 · 어려운 문자부터 섞기")
                Button(onClick = {
                    begin(StudyScope(kinds, groups))
                }, enabled = kinds.isNotEmpty() && groups.isNotEmpty(), modifier = Modifier.fillMaxWidth()) { Text("가나 연습 시작") }
            }
        }
        Text("레벨 전체 학습", style = MaterialTheme.typography.titleLarge)
        val dueCount = vocabularyGrammarDueCount(state, Instant.now())
        Button(
            onClick = { begin(StudyScope(kinds = setOf("vocabulary", "grammar"), reviewOnly = true)) },
            enabled = dueCount > 0,
            modifier = Modifier.fillMaxWidth(),
        ) { Text("모든 레벨 단어·문법 복습 $dueCount 장") }
        Row(
            Modifier.fillMaxWidth().toggleable(reviewOnly, role = Role.Checkbox, onValueChange = {
                reviewOnly = it
            }),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Checkbox(reviewOnly, onCheckedChange = null)
            Text("복습 카드만")
        }
        listOf("N5", "N4", "N3", "N2", "N1").forEach { level ->
            ElevatedCard(Modifier.fillMaxWidth()) {
                Column(Modifier.padding(16.dp)) {
                    Text(
                        "$level · ${when (level) {
                            "N5" -> "입문"
                            "N4" -> "초급"
                            "N3" -> "중급"
                            "N2" -> "중상급"
                            else -> "고급"
                        }}",
                        style = MaterialTheme.typography.titleLarge,
                    )
                    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        listOf("vocabulary" to "단어", "grammar" to "문법").forEach { (kind, label) ->
                            val count = state.notes.count { it.level == level && it.kind == kind }
                            OutlinedButton(onClick = {
                                begin(StudyScope(setOf(kind), level = level, reviewOnly = reviewOnly))
                            }, enabled = count > 0, modifier = Modifier.weight(1f)) { Text("$label $count") }
                        }
                    }
                    if (state.notes.none { it.level == level }) Text("설정에서 개인 콘텐츠 폴더를 가져오세요.", style = MaterialTheme.typography.bodySmall)
                }
            }
        }
    }
}

@Composable private fun StudyScreen(
    session: StudySession,
    settings: Settings,
    revision: Int,
    busy: Boolean,
    play: (Note) -> Unit,
    playText: (String, String?) -> Unit,
    rate: (String) -> Unit,
    close: () -> Unit,
    detail: (Note) -> Unit,
) {
    val current = remember(revision, session.index) { session.current }
    var revealed by remember(current?.note?.id, session.index) { mutableStateOf(false) }
    val scroll = rememberScrollState()
    LaunchedEffect(current, session.index) {
        scroll.scrollTo(0)
        if (settings.autoAudio && current != null &&
            (current.note.kind != "grammar" || current.note.examples.isNotEmpty())
        ) {
            play(current.note)
        }
    }
    if (current == null) {
        Column(Modifier.fillMaxSize().padding(24.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
            Text(if (session.cards.isEmpty()) "지금 연습할 카드가 없습니다" else "연습을 마쳤어요", style = MaterialTheme.typography.headlineMedium)
            Text(if (session.cards.isEmpty()) "복습일, 하루 새 카드 한도, 제외 설정을 확인하세요. 가나는 분류를 골라 전체 연습할 수 있어요." else "평가와 복습일을 기기에 저장했습니다.")
            Button(onClick = close) { Text("학습으로 돌아가기") }
        }
    } else {
        Column(Modifier.fillMaxSize().padding(horizontal = 18.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Text(
                "${session.index + 1} / ${session.total}" + if (current.reinforcement) " · 오답 다시 연습" else "",
                style = MaterialTheme.typography.labelLarge,
            )
            ElevatedCard(Modifier.weight(1f).fillMaxWidth()) {
                Column(Modifier.fillMaxWidth().verticalScroll(scroll).padding(22.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
                    NoteBody(current.note, revealed, settings, playText)
                    TextButton(onClick = { play(current.note) }) { Text("발음 듣기") }
                    if (revealed) TextButton(onClick = { detail(current.note) }) { Text("북마크·제외·메모") }
                }
            }
            if (!revealed) {
                Button(onClick = { revealed = true }, modifier = Modifier.fillMaxWidth().padding(bottom = 16.dp)) { Text("정답 보기") }
            } else {
                Text("얼마나 잘 기억했나요?", style = MaterialTheme.typography.labelLarge)
                FlowRow(Modifier.fillMaxWidth().padding(bottom = 16.dp), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    listOf("AGAIN" to "다시", "HARD" to "어려움", "GOOD" to "보통", "EASY" to "쉬움").forEach { (key, label) ->
                        OutlinedButton(onClick = { rate(key) }, enabled = !busy) { Text(label) }
                    }
                }
            }
        }
    }
}

@Composable fun NoteBody(
    note: Note,
    revealed: Boolean,
    settings: Settings,
    playText: (String, String?) -> Unit = { _, _ -> },
) {
    val visibleSettings =
        settings.copy(
            furigana = settings.furigana && (revealed || settings.hintBeforeAnswer),
            hangul =
                settings.hangul && (revealed || settings.hintBeforeAnswer),
        )
    if (note.kind == "grammar") {
        Text("이 문형의 뜻과 쓰임을 떠올려 보세요", style = MaterialTheme.typography.labelLarge)
        note.grammarFocus?.title?.let { Text(it, style = MaterialTheme.typography.headlineLarge, fontWeight = FontWeight.Bold) }
        JapaneseText(
            note.front,
            note.readingGuide,
            if (revealed ||
                settings.hintBeforeAnswer
            ) {
                note.reading
            } else {
                null
            },
            visibleSettings,
            highlights = note.grammarFocus?.segments,
        )
    } else {
        JapaneseText(
            note.front,
            note.readingGuide,
            if (revealed ||
                settings.hintBeforeAnswer
            ) {
                note.reading
            } else {
                null
            },
            visibleSettings,
            kana = note.kind in LocalStore.KANA_KINDS,
        )
    }
    if (revealed) {
        HorizontalDivider()
        val structured = if (note.kind == "grammar") structureGrammarAnswer(note.meaning, note.front) else null
        if (structured != null) {
            Text(structured.translation, style = MaterialTheme.typography.titleMedium, lineHeight = 29.sp)
            Text(structured.expression, style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.primary)
            structured.topics.forEach { topic ->
                Surface(color = MaterialTheme.colorScheme.surfaceContainer, shape = MaterialTheme.shapes.medium) {
                    Column(Modifier.fillMaxWidth().padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text(topic.title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                        topic.paragraphs.forEach { Text(it, style = MaterialTheme.typography.bodyLarge, lineHeight = 28.sp) }
                    }
                }
            }
        } else {
            note.meaning?.takeIf { it.isNotBlank() }?.let { Text(it, style = MaterialTheme.typography.titleMedium, lineHeight = 29.sp) }
        }
        note.partOfSpeech?.let { Text(it, style = MaterialTheme.typography.labelLarge) }
        val conjugation = remember(note) { conjugationFor(note) }
        conjugation?.let { VerbConjugationContent(it, settings, playText) }
        note.examples.forEach { example ->
            Surface(color = MaterialTheme.colorScheme.surfaceContainer, shape = MaterialTheme.shapes.medium) {
                Column(Modifier.fillMaxWidth().padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    if (example.japanese != note.front) JapaneseText(example.japanese, example.readingGuide, example.reading, settings)
                    if (example.korean !=
                        structured?.translation
                    ) {
                        example.korean?.let { Text(it, style = MaterialTheme.typography.bodyLarge) }
                    }
                    TextButton(onClick = { playText(example.japanese, example.audio) }) { Text("예문 듣기") }
                }
            }
        }
    }
}

@Composable internal fun JapaneseText(
    text: String,
    guide: ReadingGuide?,
    reading: String?,
    settings: Settings,
    kana: Boolean = false,
    highlights: List<HighlightSegment>? = null,
) {
    val highlightStyle =
        SpanStyle(
            color = MaterialTheme.colorScheme.onPrimaryContainer,
            fontWeight = FontWeight.Bold,
            background = MaterialTheme.colorScheme.primaryContainer,
        )
    if (guide != null && settings.furigana) {
        FlowRow(horizontalArrangement = Arrangement.spacedBy(1.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
            var offset = 0
            guide.segments.forEach { segment ->
                val annotated = highlightText(segment.text, highlights, offset, highlightStyle)
                offset += segment.text.length
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(segment.reading ?: " ", fontSize = 12.sp, color = MaterialTheme.colorScheme.primary)
                    Text(annotated, fontSize = if (kana) 42.sp else 23.sp)
                }
            }
        }
    } else {
        Text(
            highlightText(text, highlights, 0, highlightStyle),
            style = if (kana) MaterialTheme.typography.displayLarge else MaterialTheme.typography.headlineMedium,
        )
    }
    if (settings.furigana && reading != null &&
        guide == null
    ) {
        Text(reading, color = MaterialTheme.colorScheme.primary, style = MaterialTheme.typography.titleMedium)
    }
    if (settings.hangul) {
        guide?.hangul?.let { Text("한글 보조 · $it", color = MaterialTheme.colorScheme.secondary, style = MaterialTheme.typography.bodyMedium) }
            ?: Text("한글 보조를 만들 수 없는 읽기입니다", style = MaterialTheme.typography.bodySmall)
    }
}

private fun highlightText(
    text: String,
    segments: List<HighlightSegment>?,
    offset: Int,
    highlightStyle: SpanStyle,
) = buildAnnotatedString {
    val positions = mutableSetOf<Int>()
    var start = 0
    segments?.forEach { segment ->
        if (segment.highlighted) positions.addAll(start until start + segment.text.length)
        start +=
            segment.text.length
    }
    text.forEachIndexed { index, char ->
        withStyle(
            if (index + offset in
                positions
            ) {
                highlightStyle
            } else {
                SpanStyle()
            },
        ) { append(char) }
    }
}

@Composable private fun KanaReference(
    notes: List<Note>,
    play: (Note) -> Unit,
) {
    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(20.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Text("가나 참고표", style = MaterialTheme.typography.headlineMedium)
        Text("히라가나 · 가타카나를 함께 비교하고 눌러 들어보세요.")
        listOf("basic" to "기본 46", "voiced" to "탁음 20", "semiVoiced" to "반탁음 5", "yoon" to "요음 33").forEach { (group, title) ->
            Text(title, style = MaterialTheme.typography.titleLarge)
            val hira = notes.filter { it.kind == "hiragana" && it.group == group }
            val kata = notes.filter { it.kind == "katakana" && it.group == group }
            hira.forEachIndexed { index, note ->
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    OutlinedButton(onClick = { play(note) }, modifier = Modifier.weight(1f)) { Text(note.front, fontSize = 24.sp) }
                    kata.getOrNull(index)?.let { other ->
                        OutlinedButton(onClick = { play(other) }, modifier = Modifier.weight(1f)) { Text(other.front, fontSize = 24.sp) }
                    }
                    Text(note.reading ?: "", Modifier.align(Alignment.CenterVertically))
                }
            }
        }
    }
}

@Composable private fun SearchScreen(
    store: LocalStore,
    state: LocalState,
    open: (Note) -> Unit,
    add: (String, String, String, String) -> Unit,
) {
    var query by remember { mutableStateOf("") }
    var bookmarks by remember { mutableStateOf(false) }
    var kind by remember { mutableStateOf("전체") }
    var adding by remember { mutableStateOf(false) }
    val found = remember(query, bookmarks, kind, state) { store.search(query, bookmarks).filter { kind == "전체" || it.kind == kind } }
    Column(Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
        OutlinedTextField(query, { query = it }, label = { Text("일본어·읽기·뜻 검색") }, modifier = Modifier.fillMaxWidth(), singleLine = true)
        FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            listOf(
                "전체" to "전체",
                "vocabulary" to "단어",
                "grammar" to "문법",
                "hiragana" to "히라가나",
                "katakana" to "가타카나",
            ).forEach { (key, label) -> FilterChip(kind == key, { kind = key }, { Text(label) }) }
        }
        Row(verticalAlignment = Alignment.CenterVertically) {
            FilterChip(bookmarks, { bookmarks = !bookmarks }, { Text("북마크만") })
            Spacer(Modifier.weight(1f))
            TextButton(onClick = {
                adding =
                    true
            }) { Text("개인 단어 추가") }
        }
        Text("${found.size}개", style = MaterialTheme.typography.labelLarge)
        androidx.compose.foundation.lazy.LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            items(found.size, key = { found[it].id }) { index ->
                val note = found[index]
                OutlinedCard(onClick = { open(note) }, modifier = Modifier.fillMaxWidth()) {
                    Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(5.dp)) {
                        Text(note.grammarFocus?.title ?: note.front.take(180), style = MaterialTheme.typography.titleMedium)
                        note.reading?.let { Text(it) }
                        note.meaning?.let { Text(it.take(160), maxLines = 3) }
                        if (state.progress[note.id]?.excluded ==
                            true
                        ) {
                            Text("학습 제외", style = MaterialTheme.typography.labelSmall)
                        }
                    }
                }
            }
        }
    }
    if (adding) {
        PersonalNoteDialog(null, { adding = false }) { front, reading, meaning, level ->
            add(front, reading, meaning, level)
            adding =
                false
        }
    }
}

@Composable private fun DetailScreen(
    note: Note,
    state: LocalState,
    busy: Boolean,
    play: (Note) -> Unit,
    playText: (String, String?) -> Unit,
    save: (Boolean?, Boolean?, String?) -> Unit,
    edit: (String, String, String, String) -> Unit,
) {
    val progress = state.progress[note.id] ?: Progress()
    var memo by remember(note.id, progress.memo) { mutableStateOf(progress.memo) }
    var editing by remember { mutableStateOf(false) }
    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(20.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
        NoteBody(note, true, state.settings, playText)
        TextButton(onClick = { play(note) }) { Text("발음 듣기") }
        ToggleRow("북마크", progress.bookmarked, !busy) { save(it, null, null) }
        ToggleRow("학습에서 제외", progress.excluded, !busy) { save(null, it, null) }
        OutlinedTextField(memo, { memo = it }, label = { Text("내 메모") }, modifier = Modifier.fillMaxWidth())
        Button(onClick = { save(null, null, memo) }, enabled = !busy) { Text("메모 저장") }
        progress.due?.let { Text("다음 복습: ${Instant.parse(it).atZone(ZoneId.of(state.settings.timeZone)).toLocalDate()}") }
        if (note.id.startsWith("personal:")) OutlinedButton(onClick = { editing = true }) { Text("개인 단어 편집") }
    }
    if (editing) {
        PersonalNoteDialog(note, { editing = false }) { front, reading, meaning, level ->
            edit(front, reading, meaning, level)
            editing =
                false
        }
    }
}

@Composable private fun PersonalNoteDialog(
    note: Note?,
    close: () -> Unit,
    save: (String, String, String, String) -> Unit,
) {
    var front by remember { mutableStateOf(note?.front ?: "") }
    var reading by remember { mutableStateOf(note?.reading ?: "") }
    var meaning by remember {
        mutableStateOf(note?.meaning ?: "")
    }
    var level by remember { mutableStateOf(note?.level ?: "N5") }
    AlertDialog(onDismissRequest = close, title = {
        Text(
            if (note ==
                null
            ) {
                "개인 단어 추가"
            } else {
                "개인 단어 편집"
            },
        )
    }, text = {
        Column(Modifier.verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            OutlinedTextField(front, { front = it }, label = { Text("일본어") })
            OutlinedTextField(reading, { reading = it }, label = { Text("읽기") })
            OutlinedTextField(meaning, {
                meaning =
                    it
            }, label = { Text("뜻") })
            FlowRow { listOf("N5", "N4", "N3", "N2", "N1").forEach { FilterChip(level == it, { level = it }, { Text(it) }) } }
        }
    }, confirmButton = {
        TextButton(
            onClick = { save(front, reading, meaning, level) },
            enabled =
                front.isNotBlank() && meaning.isNotBlank(),
        ) { Text("저장") }
    }, dismissButton = { TextButton(onClick = close) { Text("취소") } })
}

@Composable private fun StatsScreen(state: LocalState) {
    val zone = ZoneId.of(state.settings.timeZone)
    val now = Instant.now()
    val stats = learningStats(state, now)
    val reviews = state.reviews.filter { !Instant.parse(it.at).isAfter(now) }
    val dueCount = vocabularyGrammarDueCount(state, now)
    val learned = state.notes.count { state.progress[it.id]?.fsrsJson != null }
    val figures =
        listOf(
            "오늘 답변" to stats.todayAnswers.toString(),
            "오늘 고유 카드" to stats.todayUniqueCards.toString(),
            "최근 7일 답변" to stats.answers7Days.toString(),
            "최근 7일 고유 카드" to stats.uniqueCards7Days.toString(),
            "최근 30일 답변" to stats.answers30Days.toString(),
            "최근 30일 고유 카드" to stats.uniqueCards30Days.toString(),
            "연속 학습일" to "${stats.streak}일",
            "최근 학습일" to (
                stats.lastStudiedAt
                    ?.atZone(zone)
                    ?.toLocalDate()
                    ?.toString() ?: "아직 없음"
            ),
        )
    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(20.dp), verticalArrangement = Arrangement.spacedBy(18.dp)) {
        Text("나의 학습 기록", style = MaterialTheme.typography.headlineMedium)
        Text("가나·단어·문법과 오답 재연습을 모두 포함합니다. 같은 카드는 고유 카드 수에서 한 번만 셉니다.")
        Text("오늘을 포함한 7일·30일 · ${state.settings.timeZone} 기준", style = MaterialTheme.typography.bodySmall)
        figures.chunked(2).forEach { pair ->
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                pair.forEach { (label, value) ->
                    ElevatedCard(Modifier.weight(1f)) {
                        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            Text(label, style = MaterialTheme.typography.labelLarge)
                            Text(value, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
        }
        Text("학습한 카드 $learned · 전체 ${state.notes.size}")
        Text("단어·문법 복습 $dueCount 장 · 모든 레벨")
        Text("전체 답변 ${reviews.size} · 오답 재연습 ${reviews.count { it.reinforcement }}")
        Text("평가별 답변", style = MaterialTheme.typography.titleLarge)
        listOf("AGAIN" to "다시", "HARD" to "어려움", "GOOD" to "보통", "EASY" to "쉬움").forEach { (rating, label) ->
            Text("$label: ${reviews.count { it.rating == rating }}회")
        }
        Text("최근 평가", style = MaterialTheme.typography.titleLarge)
        reviews.takeLast(30).reversed().forEach { review ->
            val note = state.notes.firstOrNull { it.id == review.noteId }
            Text(
                "${note?.grammarFocus?.title ?: note?.front?.take(
                    60,
                ) ?: review.noteId} · ${review.rating}${if (review.reinforcement) " · 재연습" else ""}\n${Instant.parse(
                    review.at,
                ).atZone(zone).toLocalDateTime()}",
            )
        }
    }
}

@Composable private fun SettingsScreen(
    settings: Settings,
    busy: Boolean,
    save: (Settings) -> Unit,
    import: () -> Unit,
    packages: Map<String, String>,
) {
    var limit by remember(settings.dailyNewLimit) { mutableStateOf(settings.dailyNewLimit.toString()) }
    var zone by remember(settings.timeZone) { mutableStateOf(settings.timeZone) }
    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(20.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Text("학습 설정", style = MaterialTheme.typography.headlineMedium)
        ToggleRow("후리가나", settings.furigana, !busy) { save(settings.copy(furigana = it)) }
        ToggleRow("정답 전 읽기 힌트", settings.hintBeforeAnswer, !busy) { save(settings.copy(hintBeforeAnswer = it)) }
        ToggleRow("한글 발음 보조", settings.hangul, !busy) { save(settings.copy(hangul = it)) }
        ToggleRow("카드 음성 자동 재생", settings.autoAudio, !busy) { save(settings.copy(autoAudio = it)) }
        OutlinedTextField(
            limit,
            { limit = it },
            label = { Text("하루 새 카드 수 (0~100)") },
            modifier = Modifier.fillMaxWidth(),
            singleLine = true,
        )
        OutlinedTextField(zone, { zone = it }, label = { Text("시간대") }, modifier = Modifier.fillMaxWidth(), singleLine = true)
        Button(
            onClick = { limit.toIntOrNull()?.let { save(settings.copy(dailyNewLimit = it, timeZone = zone)) } },
            enabled =
                !busy && limit.toIntOrNull() in 0..100,
        ) { Text("학습 설정 저장") }
        HorizontalDivider()
        Text("콘텐츠", style = MaterialTheme.typography.titleLarge)
        Text("manifest.json과 개인 콘텐츠 JSON, media 폴더가 들어 있는 폴더를 선택하세요. 같은 카드의 학습 기록은 유지됩니다.")
        OutlinedButton(onClick = import, enabled = !busy) { Text("콘텐츠 폴더 가져오기") }
        packages.forEach { (id, version) -> Text("$id · $version", style = MaterialTheme.typography.bodySmall) }
    }
}

@Composable private fun ToggleRow(
    label: String,
    value: Boolean,
    enabled: Boolean,
    onChange: (Boolean) -> Unit,
) {
    Row(
        Modifier.fillMaxWidth().toggleable(value, enabled = enabled, role = Role.Switch, onValueChange = onChange),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(label, Modifier.weight(1f))
        Switch(value, onCheckedChange = null, enabled = enabled)
    }
}
