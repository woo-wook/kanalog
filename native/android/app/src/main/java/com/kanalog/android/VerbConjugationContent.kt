package com.kanalog.android

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.kanalog.core.HighlightSegment
import com.kanalog.core.Settings
import com.kanalog.core.VerbConjugationPanel

@Composable
fun VerbConjugationContent(
    panel: VerbConjugationPanel,
    settings: Settings,
    playText: (String, String?) -> Unit,
) {
    Column(
        Modifier.fillMaxWidth().testTag("verb-conjugation"),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Text("동사 활용", style = MaterialTheme.typography.titleLarge)
        Text(panel.classLabel, style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.primary)
        Text(panel.rule, style = MaterialTheme.typography.bodyMedium)
        listOf("BASIC" to "기본 활용", "CONNECT" to "연결 활용", "ADVANCED" to "확장 활용").forEach { (group, title) ->
            val forms = panel.forms.filter { it.group == group }
            if (forms.isNotEmpty()) {
                Text(title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                forms.forEach { form ->
                    Surface(
                        modifier = Modifier.fillMaxWidth().testTag("verb-form-${form.key}"),
                        color = MaterialTheme.colorScheme.surfaceContainerLow,
                        shape = MaterialTheme.shapes.medium,
                    ) {
                        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            Text(form.label, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
                            JapaneseText(
                                form.japanese,
                                form.readingGuide,
                                form.reading,
                                settings,
                                highlights = listOf(HighlightSegment(form.stem, false), HighlightSegment(form.suffix, true)),
                            )
                            Text("읽기 · ${form.reading}", style = MaterialTheme.typography.bodyMedium)
                            Text(form.description, style = MaterialTheme.typography.bodySmall)
                            TextButton(
                                onClick = { playText(form.reading, null) },
                                modifier = Modifier.testTag("verb-listen-${form.key}"),
                            ) { Text("${form.label} 듣기") }
                        }
                    }
                }
            }
        }
    }
}
