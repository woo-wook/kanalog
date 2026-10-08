package com.kanalog.content.domain

data class VerbConjugation(
    val verbClass: String,
    val classLabel: String,
    val dictionaryForm: String,
    val dictionaryReading: String,
    val rule: String,
    val forms: List<VerbForm>,
)

data class VerbForm(
    val key: String,
    val label: String,
    val group: String,
    val description: String,
    val japanese: String,
    val reading: String,
    val stem: String,
    val suffix: String,
    val readingGuide: ReadingGuide,
)

/** Uses explicit source classes, never guesses ichidan from an -iru/-eru ending. */
object VerbConjugator {
    private data class PairForm(
        val text: String,
        val reading: String,
    ) {
        fun append(suffix: String) = PairForm(text + suffix, reading + suffix)
    }

    // Basic non-volitional senses confirmed by JPF BTS00003; spelling AND reading avoid homophones.
    private val nonVolitional =
        mapOf(
            "合う" to "あう",
            "開く" to "あく",
            "空く" to "あく",
            "要る" to "いる",
            "折れる" to "おれる",
            "掛かる" to "かかる",
            "かかる" to "かかる",
            "乾く" to "かわく",
            "決まる" to "きまる",
            "暮れる" to "くれる",
            "故障する" to "こしょうする",
            "混む" to "こむ",
            "壊れる" to "こわれる",
            "咲く" to "さく",
            "閉まる" to "しまる",
            "すく" to "すく",
            "済む" to "すむ",
            "足りる" to "たりる",
            "違う" to "ちがう",
            "点く" to "つく",
            "続く" to "つづく",
            "止まる" to "とまる",
            "治る" to "なおる",
            "直る" to "なおる",
            "無くなる" to "なくなる",
            "なくなる" to "なくなる",
            "鳴る" to "なる",
            "似る" to "にる",
            "始まる" to "はじまる",
            "晴れる" to "はれる",
            "冷える" to "ひえる",
            "増える" to "ふえる",
            "焼ける" to "やける",
            "揺れる" to "ゆれる",
            "汚れる" to "よごれる",
            "沸く" to "わく",
            "割れる" to "われる",
            "気がする" to "きがする",
            "見える" to "みえる",
            "聞こえる" to "きこえる",
            "見つかる" to "みつかる",
            "できる" to "できる",
            "出来る" to "できる",
        )

    fun generate(
        front: String,
        reading: String?,
        partOfSpeech: String?,
    ): VerbConjugation? {
        if (front.isBlank() || front.length > 128 || reading.isNullOrBlank() || !KanaAlignment.isKana(reading)) return null
        val kana = KanaAlignment.hiragana(reading)
        if (KanaAlignment.align(front, kana) == null) return null
        val pos = partOfSpeech.orEmpty().replace(" ", "")
        val godanPos = pos.contains("5단동사") || pos.contains("五段")
        val ichidanPos = pos.contains("1단동사") || pos.contains("一段")
        val modernJun = front in setOf("準ずる", "准ずる") && kana == "じゅんずる"
        val modernKakeru = front == "駆ける" && kana == "かける"
        if (godanPos && ichidanPos && !modernKakeru && !modernJun) return null
        val type =
            when {
                modernJun || modernKakeru -> "ICHIDAN"
                godanPos -> "GODAN"
                ichidanPos -> "ICHIDAN"
                pos.contains("サ변") || pos.contains("サ変") || front == "する" -> "SURU"
                pos.contains("カ변") || pos.contains("カ変") || front in setOf("来る", "くる") -> "KURU"
                else -> return null
            }
        val nominalSuru = type == "SURU" && (pos.contains("명사") || pos.contains("名詞")) && !front.endsWith("する")
        val dictionary =
            when {
                modernJun -> PairForm(front.dropLast(2) + "じる", "じゅんじる")
                nominalSuru -> PairForm(front + "する", kana + "する")
                else -> PairForm(front, kana)
            }
        val ending = dictionary.text.last()
        if (type == "GODAN" && (ending !in "うくぐすつぬぶむる" || dictionary.reading.last() != ending)) return null
        if (type == "ICHIDAN" && (!dictionary.text.endsWith("る") || !dictionary.reading.endsWith("る"))) return null
        if (type == "SURU" && (!dictionary.text.endsWith("する") || !dictionary.reading.endsWith("する"))) return null
        if (type == "KURU" &&
            (!dictionary.reading.endsWith("くる") || !(dictionary.text.endsWith("来る") || dictionary.text.endsWith("くる")))
        ) {
            return null
        }
        val width = if (type == "SURU" || (type == "KURU" && dictionary.text.endsWith("くる"))) 2 else 1
        val stem = PairForm(dictionary.text.dropLast(width), dictionary.reading.dropLast(if (type == "KURU") 2 else width))

        fun godan(row: String): PairForm = stem.append(row["うくぐすつぬぶむる".indexOf(ending)].toString())

        fun kuru(value: String): PairForm {
            val textSuffix = if (dictionary.text.endsWith("来る")) value.drop(1) else value
            return PairForm(stem.text + textSuffix, stem.reading + value)
        }
        val iStem =
            when (type) {
                "GODAN" -> godan("いきぎしちにびみり")
                "SURU" -> stem.append("し")
                "KURU" -> kuru("き")
                else -> stem
            }
        val aStem = if (type == "GODAN") godan("わかがさたなばまら") else stem
        val aru = type == "GODAN" && setOf("ある", "有る", "在る").any(dictionary.text::endsWith) && dictionary.reading.endsWith("ある")
        val iru = type == "ICHIDAN" && dictionary.text in setOf("いる", "居る") && dictionary.reading == "いる"
        val iku =
            type == "GODAN" && dictionary.text.endsWith("く") &&
                (
                    dictionary.text.endsWith("行く") || dictionary.text.endsWith("往く") || dictionary.text.endsWith("逝く") ||
                        dictionary.text in setOf("いく", "ゆく")
                )
        val honorific = type == "GODAN" && dictionary.reading in setOf("いらっしゃる", "おっしゃる", "くださる", "なさる", "ござる")
        val uOnbin = type == "GODAN" && dictionary.text in setOf("問う", "請う", "乞う")
        val negative =
            when {
                aru -> PairForm(dictionary.text.dropLast(2) + "ない", dictionary.reading.dropLast(2) + "ない")

                type == "GODAN" -> aStem.append("ない")

                type == "SURU" -> stem.append("しない")

                type ==
                    "KURU" -> kuru("こない")

                else -> stem.append("ない")
            }
        val te =
            when {
                type == "SURU" -> {
                    stem.append("して")
                }

                type == "KURU" -> {
                    kuru("きて")
                }

                type == "ICHIDAN" -> {
                    stem.append("て")
                }

                iku -> {
                    PairForm(
                        if (dictionary.text.endsWith("ゆく")) dictionary.text.dropLast(2) + "いって" else stem.text + "って",
                        if (dictionary.reading.endsWith("ゆく")) dictionary.reading.dropLast(2) + "いって" else stem.reading + "って",
                    )
                }

                uOnbin -> {
                    stem.append("うて")
                }

                ending in "うつる" -> {
                    stem.append("って")
                }

                ending in "ぬぶむ" -> {
                    stem.append("んで")
                }

                ending == 'く' -> {
                    stem.append("いて")
                }

                ending == 'ぐ' -> {
                    stem.append("いで")
                }

                else -> {
                    stem.append("して")
                }
            }
        val past =
            PairForm(
                te.text.dropLast(1) + if (te.text.endsWith("で")) "だ" else "た",
                te.reading.dropLast(1) + if (te.reading.endsWith("で")) "だ" else "た",
            )
        val politeStem = if (honorific) stem.append("い") else iStem
        val kureru = type == "ICHIDAN" && dictionary.text in setOf("くれる", "呉れる") && dictionary.reading == "くれる"
        val dekiru = type == "ICHIDAN" && dictionary.text in setOf("できる", "出来る") && dictionary.reading == "できる"
        val noIntent = nonVolitional[dictionary.text] == dictionary.reading || (dictionary.text == "空く" && dictionary.reading == "すく")
        val noPotential =
            noIntent ||
                mapOf("分かる" to "わかる", "わかる" to "わかる", "知る" to "しる")[dictionary.text] == dictionary.reading
        val noPassive =
            mapOf("分かる" to "わかる", "わかる" to "わかる", "できる" to "できる", "出来る" to "できる")[dictionary.text] == dictionary.reading
        val excluded =
            (
                when {
                    kureru -> {
                        setOf("potential", "passive", "tai", "volitional", "request")
                    }

                    dekiru -> {
                        setOf(
                            "potential",
                            "passive",
                            "tai",
                            "volitional",
                            "imperative",
                            "causative",
                            "causativePassive",
                            "request",
                            "prohibition",
                        )
                    }

                    aru -> {
                        setOf("teiru", "tai", "volitional")
                    }

                    iru -> {
                        setOf("teiru")
                    }

                    else -> {
                        emptySet()
                    }
                }
            ) + (if (noIntent) setOf("volitional", "imperative") else emptySet()) +
                (if (noPotential) setOf("potential") else emptySet()) +
                (if (noPassive) setOf("passive") else emptySet())
        val forms = mutableListOf<VerbForm>()

        fun add(
            key: String,
            label: String,
            group: String,
            description: String,
            value: PairForm,
        ) {
            if (key in excluded) return
            val base = if (key == "dictionary") value.text else stem.text.takeIf { value.text.startsWith(it) }.orEmpty()
            val segments = KanaAlignment.align(value.text, value.reading) ?: listOf(ReadingSegment(value.text, value.reading))
            var readingOffset = 0
            val vowelBreaks =
                segments
                    .map { segment ->
                        val start = readingOffset
                        readingOffset += (segment.reading ?: segment.text).length
                        start
                    }.toSet()
            val pronunciation = HangulPronunciation.guide(value.reading, vowelBreaks)
            val guide =
                ReadingGuide(
                    segments,
                    "READING",
                    pronunciation.text,
                    "APPROXIMATE",
                    pronunciation.status,
                )
            forms += VerbForm(key, label, group, description, value.text, value.reading, base, value.text.removePrefix(base), guide)
        }
        add("dictionary", "기본형", "BASIC", "사전에 나오는 형태", dictionary)
        add("masu", "정중형", "BASIC", "정중하게 말할 때 · ～합니다", politeStem.append("ます"))
        add("masen", "정중 부정", "BASIC", "정중하게 부정할 때 · ～하지 않습니다", politeStem.append("ません"))
        add("mashita", "정중 과거", "BASIC", "지난 일을 정중하게 말할 때 · ～했습니다", politeStem.append("ました"))
        add("masendeshita", "정중 과거 부정", "BASIC", "지난 일을 정중하게 부정할 때", politeStem.append("ませんでした"))
        add("nai", "부정형", "BASIC", "～하지 않는다", negative)
        add("nakatta", "과거 부정", "BASIC", "～하지 않았다", PairForm(negative.text.dropLast(1) + "かった", negative.reading.dropLast(1) + "かった"))
        add("te", "て형", "CONNECT", "요청·진행·연결 표현의 출발점", te)
        add("ta", "과거형", "BASIC", "～했다", past)
        add("teiru", "진행·상태", "CONNECT", "～하고 있다 · 문맥에 따라 결과 상태", te.append("いる"))
        add("tai", "희망형", "CONNECT", "～하고 싶다", iStem.append("たい"))
        val productivePotential =
            !aru && (type != "SURU" || dictionary.text == "する" || nominalSuru || pos.contains("명사") || pos.contains("名詞"))
        if (productivePotential) {
            val potential =
                when (type) {
                    "GODAN" -> godan("えけげせてねべめれ").append("る")
                    "SURU" -> stem.append("できる")
                    "KURU" -> kuru("こられる")
                    else -> stem.append("られる")
                }
            add("potential", "가능형", "ADVANCED", "～할 수 있다 · 1단/くる는 수동형과 같은 모양", potential)
        }
        if (!aru) {
            val passive =
                when (type) {
                    "GODAN" -> aStem.append("れる")
                    "SURU" -> stem.append("される")
                    "KURU" -> kuru("こられる")
                    else -> stem.append("られる")
                }
            val causative =
                when (type) {
                    "GODAN" -> aStem.append("せる")
                    "SURU" -> stem.append("させる")
                    "KURU" -> kuru("こさせる")
                    else -> stem.append("させる")
                }
            add("passive", "수동형", "ADVANCED", "행위의 영향을 받음 · 문맥에 따라 존경 표현", passive)
            add("causative", "사역형", "ADVANCED", "～하게 하다 · ～하도록 허락하다", causative)
            add(
                "causativePassive",
                "사역 수동",
                "ADVANCED",
                "～하도록 시킴을 받다 · 줄임 없는 표준형",
                PairForm(causative.text.dropLast(1), causative.reading.dropLast(1)).append("られる"),
            )
        }
        val volitional =
            when (type) {
                "GODAN" -> godan("おこごそとのぼもろ").append("う")
                "SURU" -> stem.append("しよう")
                "KURU" -> kuru("こよう")
                else -> stem.append("よう")
            }
        val imperative =
            when {
                kureru -> stem

                honorific -> stem.append("い")

                type == "GODAN" -> godan("えけげせてねべめれ")

                type == "SURU" -> stem.append("しろ")

                type ==
                    "KURU" -> kuru("こい")

                else -> stem.append("ろ")
            }
        val conditional =
            when (type) {
                "GODAN" -> godan("えけげせてねべめれ").append("ば")
                "SURU" -> stem.append("すれば")
                "KURU" -> kuru("くれば")
                else -> stem.append("れば")
            }
        add("volitional", "의지·권유", "ADVANCED", "～하자 · ～하려고 한다", volitional)
        if (!aru) {
            add(
                "imperative",
                "명령형",
                "ADVANCED",
                if (kureru) "강한 요청 · 정중하게는 くれますか 등으로 부탁합니다" else "강한 명령 · 일상 요청에는 てください 사용",
                imperative,
            )
        }
        add("ba", "ば 조건형", "ADVANCED", "～하면 · 조건 표현", conditional)
        add("tara", "たら 조건형", "ADVANCED", "～하면 · ～한 뒤에", past.append("ら"))
        if (!aru) {
            add("request", "정중한 요청", "CONNECT", "～해 주세요", te.append("ください"))
            add("prohibition", "하지 말아 주세요", "CONNECT", "정중하게 금지·부탁할 때", negative.append("でください"))
        }
        val label =
            when (type) {
                "GODAN" -> "5단 동사 · 1그룹"
                "ICHIDAN" -> "1단 동사 · 2그룹"
                "SURU" -> "불규칙 · する 동사"
                else -> "불규칙 · くる 동사"
            }
        val rule =
            when {
                dekiru -> "できる는 가능·완성을 나타냅니다. 희망은 ～できるようになりたい 등으로 표현하며, 사역·요청 등을 그대로 만들지 않습니다. ～ている는 완성된 상태의 뜻에서 사용합니다."
                modernJun -> "원본 準ずる·准ずる는 サ변입니다. 여기서는 같은 뜻의 현대형 準じる·准じる 활용을 보여줍니다."
                modernKakeru -> "駆ける는 현대 일본어의 1단 동사입니다. 원본의 혼합 분류 대신 る를 빼고 활용합니다."
                kureru -> "くれる의 표준 명령형은 くれ입니다. 주는 사람의 관점 때문에 일반적으로 쓰지 않는 가능·수동·희망·의지·てください는 제외합니다."
                aru -> "ある의 부정은 ない입니다. 이미 상태를 나타내므로 ～ている를 붙이지 않습니다. 기본 용법에 맞지 않는 형태는 제외합니다."
                iru -> "존재를 나타내는 いる는 그 자체로 상태를 나타냅니다. ～ている를 덧붙이지 않습니다."
                iku -> "行く의 て형·과거형은 行って·行った입니다. 나머지는 5단 규칙을 따릅니다."
                honorific -> "정중형은 り 대신 い가 됩니다. 존경 표현의 쓰임은 문맥에 따라 확인하세요."
                type == "GODAN" -> "어미가 あ·い·う·え·お단으로 바뀝니다. う의 부정은 わない, て형은 어미별 음편을 따릅니다."
                type == "ICHIDAN" -> "끝의 る를 빼고 활용 어미를 붙입니다. 가능·수동은 모두 られる입니다."
                type == "KURU" -> "来る는 형태에 따라 くる·き·こ로 읽습니다. 예제마다 읽기를 확인하세요."
                nominalSuru -> "명사에 する를 붙인 동사입니다. します·しない·して·できる로 활용합니다."
                !productivePotential -> "する 활용을 따릅니다. 이 어휘의 가능 표현은 의미·용법 확인이 필요해 자동 생성하지 않습니다."
                else -> "する는 します·しない·して, 가능형은 できる로 바뀝니다."
            }
        val usageRule =
            rule +
                (if (noIntent) " 기본 뜻에서는 의지·명령을 쓰지 않으므로 두 형태를 표시하지 않습니다." else "") +
                (if (noPotential) " 기본 뜻에 맞지 않는 가능형은 생성하지 않습니다." else "") +
                (if (noPassive) " 일반적인 수동형도 표시하지 않습니다." else "") +
                " 활용의 모양을 비교하는 표입니다. 뜻·주어·상황에 따라 사용할 수 있는 형태는 다릅니다."
        return VerbConjugation(type, label, dictionary.text, dictionary.reading, usageRule, forms)
    }
}
