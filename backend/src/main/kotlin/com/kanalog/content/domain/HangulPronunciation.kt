package com.kanalog.content.domain

/** A reading aid, not a phonetic transcription. Unknown spans remain visibly unresolved. */
object HangulPronunciation {
    private val syllables =
        linkedMapOf<String, String>().apply {
            val rows =
                listOf(
                    "あいうえお" to "아이우에오",
                    "かきくけこ" to "카키쿠케코",
                    "がぎぐげご" to "가기구게고",
                    "さしすせそ" to "사시스세소",
                    "ざじずぜぞ" to "자지즈제조",
                    "たちつてと" to "타치츠테토",
                    "だぢづでど" to "다지즈데도",
                    "なにぬねの" to "나니누네노",
                    "はひふへほ" to "하히후헤호",
                    "ばびぶべぼ" to "바비부베보",
                    "ぱぴぷぺぽ" to "파피푸페포",
                    "まみむめも" to "마미무메모",
                    "らりるれろ" to "라리루레로",
                    "やゆよわをん" to "야유요와오응",
                )
            rows.forEach { (kana, hangul) -> kana.zip(hangul).forEach { (a, b) -> put(a.toString(), b.toString()) } }
            val bases =
                mapOf(
                    'き' to listOf("캬", "큐", "쿄"),
                    'ぎ' to listOf("갸", "규", "교"),
                    'し' to listOf("샤", "슈", "쇼"),
                    'じ' to listOf("자", "주", "조"),
                    'ち' to listOf("차", "추", "초"),
                    'に' to listOf("냐", "뉴", "뇨"),
                    'ひ' to listOf("햐", "휴", "효"),
                    'び' to listOf("뱌", "뷰", "뵤"),
                    'ぴ' to listOf("퍄", "퓨", "표"),
                    'み' to listOf("먀", "뮤", "묘"),
                    'り' to listOf("랴", "류", "료"),
                )
            bases.forEach { (base, sounds) -> "ゃゅょ".forEachIndexed { i, suffix -> put("$base$suffix", sounds[i]) } }
            putAll(
                mapOf(
                    "ふぁ" to "파",
                    "ふぃ" to "피",
                    "ふぇ" to "페",
                    "ふぉ" to "포",
                    "てぃ" to "티",
                    "でぃ" to "디",
                    "とぅ" to "투",
                    "どぅ" to "두",
                    "しぇ" to "셰",
                    "じぇ" to "제",
                    "ちぇ" to "체",
                    "うぃ" to "위",
                    "うぇ" to "웨",
                    "うぉ" to "워",
                    "ゔ" to "부",
                    "ゔぁ" to "바",
                    "ゔぃ" to "비",
                    "ゔぇ" to "베",
                    "ゔぉ" to "보",
                    "いぇ" to "예",
                    "ぁ" to "아",
                    "ぃ" to "이",
                    "ぅ" to "우",
                    "ぇ" to "에",
                    "ぉ" to "오",
                    "ゃ" to "야",
                    "ゅ" to "유",
                    "ょ" to "요",
                    "ゎ" to "와",
                    "ゐ" to "이",
                    "ゑ" to "에",
                    "ゕ" to "카",
                    "ゖ" to "케",
                ),
            )
        }

    data class Guide(
        val text: String?,
        val status: String,
    )

    private const val PUNCTUATION = "。、！？?!・,.:;「」『』（）()〜～…—-\"'[]/／【】〈〉《》«»"

    fun guide(
        reading: String,
        vowelBreaks: Set<Int> = emptySet(),
    ): Guide {
        val kana = KanaAlignment.hiragana(reading)
        convert(kana, vowelBreaks)?.let { return Guide(it, "COMPLETE") }
        if (kana.isBlank() || kana.length > 2048) return Guide(null, "UNAVAILABLE")
        val out = StringBuilder()
        var converted = false
        var cursor = 0
        while (cursor < kana.length) {
            val start = cursor
            val supported = supported(kana.codePointAt(cursor))
            do {
                cursor += Character.charCount(kana.codePointAt(cursor))
            } while (cursor < kana.length && supported(kana.codePointAt(cursor)) == supported)
            val span = kana.substring(start, cursor)
            val result =
                if (span.isBlank()) {
                    span
                } else if (supported) {
                    convert(
                        span,
                        vowelBreaks
                            .filter { it in start until cursor }
                            .map {
                                it -
                                    start
                            }.toSet(),
                    )
                } else {
                    null
                }
            if (result == null) {
                out.append("〔").append(span).append("〕")
            } else {
                out.append(result)
                if (span.any { it in 'ぁ'..'ゖ' }) converted = true
            }
        }
        return if (converted) Guide(out.toString(), "PARTIAL") else Guide(null, "UNAVAILABLE")
    }

    private fun supported(point: Int): Boolean =
        point <= Char.MAX_VALUE.code &&
            (
                syllables.containsKey(point.toChar().toString()) || point.toChar() in "っー" || point.toChar() in PUNCTUATION ||
                    point.toChar().isWhitespace()
            )

    private fun final(
        char: Char,
        jong: Int,
    ): Char =
        if (char in '가'..'힣' &&
            (char.code - '가'.code) % 28 == 0
        ) {
            (char.code + jong).toChar()
        } else {
            char
        }

    private fun vowel(char: Char): Char? = if (char in '가'..'힣') "ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ"[(char.code - '가'.code) / 28 % 21] else null

    fun convert(
        reading: String,
        vowelBreaks: Set<Int> = emptySet(),
    ): String? {
        val kana = KanaAlignment.hiragana(reading)
        if (kana.isBlank() || kana.length > 2048) return null
        val out = StringBuilder()
        var i = 0
        while (i < kana.length) {
            val char = kana[i]
            when {
                char == 'っ' -> {
                    if (out.isEmpty() || i + 1 == kana.length) return null
                    val next = kana[i + 1]
                    val jong =
                        when (next) {
                            in "かきくけこがぎぐげご" -> 1
                            in "ぱぴぷぺぽばびぶべぼ" -> 17
                            else -> 19
                        }
                    out.setCharAt(out.lastIndex, final(out.last(), jong))
                    i++
                }

                char == 'ん' && out.isNotEmpty() && vowel(out.last()) != null -> {
                    val next = kana.getOrNull(i + 1) ?: ' '
                    val jong =
                        when (next) {
                            in "まみむめもばびぶべぼぱぴぷぺぽ" -> 16
                            in "かきくけこがぎぐげご" -> 21
                            else -> 4
                        }
                    if ((out.last().code - '가'.code) % 28 != 0) out.append("응") else out.setCharAt(out.lastIndex, final(out.last(), jong))
                    i++
                }

                char == 'ー' -> {
                    val previous =
                        out.lastOrNull()?.let(::vowel) ?: return null
                    out.append(
                        when (previous) {
                            'ㅏ', 'ㅑ', 'ㅘ' -> "아"
                            'ㅣ', 'ㅟ' -> "이"
                            'ㅜ', 'ㅠ' -> "우"
                            'ㅗ', 'ㅛ' -> "오"
                            'ㅔ', 'ㅐ', 'ㅚ', 'ㅙ', 'ㅞ' -> "에"
                            'ㅓ', 'ㅕ', 'ㅝ' -> "어"
                            'ㅡ' -> "으"
                            else -> return null
                        },
                    )
                    i++
                }

                char.isWhitespace() || char in PUNCTUATION -> {
                    out.append(char)
                    i++
                }

                else -> {
                    val pair = kana.substring(i, minOf(i + 2, kana.length))
                    val sound = syllables[pair] ?: syllables[char.toString()] ?: return null
                    // Japanese /ou/ and /ei/ commonly represent long o/e; retain two morae.
                    if (i !in vowelBreaks && char == 'う' && (kana.getOrNull(i - 1) ?: ' ') in "おこごそぞとどのほぼぽもよろょ") {
                        out.append("오")
                    } else if (i !in vowelBreaks && char == 'い' && (kana.getOrNull(i - 1) ?: ' ') in "えけげせぜてでねへべぺめれ") {
                        out.append("에")
                    } else {
                        out.append(sound)
                    }
                    i += if (syllables.containsKey(pair)) pair.length else 1
                }
            }
        }
        return out.toString()
    }
}
