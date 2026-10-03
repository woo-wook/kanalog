package com.kanalog.course.domain

data class KanaCharacter(
    val glyph: String,
    val sourceGuid: String,
    val romaji: String,
    val hangul: String,
)

data class KanaLesson(
    val key: String,
    val title: String,
    val position: Int,
    val optional: Boolean,
    val characters: List<KanaCharacter>,
)

data class KanaCourse(
    val kind: String,
    val title: String,
    val position: Int,
    val lessons: List<KanaLesson>,
)

object KanaInventory {
    fun courses(): List<KanaCourse> =
        listOf("hiragana", "katakana").mapIndexed { position, kind ->
            KanaCourse(
                kind,
                if (kind == "hiragana") "히라가나" else "가타카나",
                position,
                rows.mapIndexed { rowIndex, row ->
                    val parts = row.split('|')
                    val romaji = parts[2].split(' ')
                    val hangul = parts[3].split(' ')
                    val characters =
                        parts[1].split(' ').mapIndexed { index, hira ->
                            val glyph =
                                if (kind ==
                                    "katakana"
                                ) {
                                    hira.map { if (it in 'ぁ'..'ゖ') (it.code + 0x60).toChar() else it }.joinToString("")
                                } else {
                                    hira
                                }
                            KanaCharacter(glyph, "$kind:$hira", romaji[index], hangul[index])
                        }
                    KanaLesson("row:$rowIndex", "${parts[0]} · ${if (rowIndex < 10) "기본" else "확장"}", rowIndex, rowIndex >= 10, characters)
                },
            )
        }

    private val rows =
        listOf(
            "모음|あ い う え お|a i u e o|아 이 우 에 오",
            "카 행|か き く け こ|ka ki ku ke ko|카 키 쿠 케 코",
            "사 행|さ し す せ そ|sa shi su se so|사 시 스 세 소",
            "타 행|た ち つ て と|ta chi tsu te to|타 치 츠 테 토",
            "나 행|な に ぬ ね の|na ni nu ne no|나 니 누 네 노",
            "하 행|は ひ ふ へ ほ|ha hi fu he ho|하 히 후 헤 호",
            "마 행|ま み む め も|ma mi mu me mo|마 미 무 메 모",
            "야 행|や ゆ よ|ya yu yo|야 유 요",
            "라 행|ら り る れ ろ|ra ri ru re ro|라 리 루 레 로",
            "와 행·응|わ を ん|wa wo n|와 오 응",
            "탁음 가 행|が ぎ ぐ げ ご|ga gi gu ge go|가 기 구 게 고",
            "탁음 자 행|ざ じ ず ぜ ぞ|za ji zu ze zo|자 지 즈 제 조",
            "탁음 다 행|だ ぢ づ で ど|da ji zu de do|다 지 즈 데 도",
            "탁음 바 행|ば び ぶ べ ぼ|ba bi bu be bo|바 비 부 베 보",
            "반탁음 파 행|ぱ ぴ ぷ ぺ ぽ|pa pi pu pe po|파 피 푸 페 포",
            "요음|きゃ きゅ きょ しゃ しゅ しょ ちゃ ちゅ ちょ にゃ にゅ にょ ひゃ ひゅ ひょ みゃ みゅ みょ りゃ りゅ りょ ぎゃ ぎゅ ぎょ じゃ じゅ じょ びゃ びゅ びょ ぴゃ ぴゅ ぴょ|kya kyu kyo sha shu sho cha chu cho nya nyu nyo hya hyu hyo mya myu myo rya ryu ryo gya gyu gyo ja ju jo bya byu byo pya pyu pyo|캬 큐 쿄 샤 슈 쇼 차 추 초 냐 뉴 뇨 햐 휴 효 먀 뮤 묘 랴 류 료 갸 규 교 자 쥬 죠 뱌 뷰 뵤 퍄 퓨 표",
        )
}
