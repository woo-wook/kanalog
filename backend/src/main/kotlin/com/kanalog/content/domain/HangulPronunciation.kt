package com.kanalog.content.domain

/** A reading aid, not a phonetic transcription. Unsupported characters suppress the guide. */
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
                ),
            )
        }

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

    fun convert(reading: String): String? {
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
                            'ㅏ', 'ㅑ' -> "아"
                            'ㅣ' -> "이"
                            'ㅜ', 'ㅠ' -> "우"
                            'ㅗ', 'ㅛ' -> "오"
                            'ㅔ', 'ㅐ' -> "에"
                            else -> return null
                        },
                    )
                    i++
                }

                char.isWhitespace() || char in "。、！？?!・,.:;「」『』（）()〜～…—-" -> {
                    out.append(char)
                    i++
                }

                else -> {
                    val pair = kana.substring(i, minOf(i + 2, kana.length))
                    val sound = syllables[pair] ?: syllables[char.toString()] ?: return null
                    // Japanese /ou/ and /ei/ commonly represent long o/e; retain two morae.
                    if (char == 'う' && (kana.getOrNull(i - 1) ?: ' ') in "おこごそぞとどのほぼぽもよろょ") {
                        out.append("오")
                    } else if (char == 'い' && (kana.getOrNull(i - 1) ?: ' ') in "えけげせぜてでねへべぺめれ") {
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
