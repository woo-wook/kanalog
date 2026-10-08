import Foundation
import Testing
@testable import KanalogCore

@Test func godanConjugationUsesAuthoritativePartOfSpeechAndConjugatesReading() throws {
    let table = try #require(VerbConjugator.generate(front: "書く", reading: "かく", partOfSpeech: "五段動詞"))
    #expect(table.verbClass == .godan)
    let polite = try #require(table.forms.first { $0.key == "masu" })
    #expect(polite.japanese == "書きます")
    #expect(polite.reading == "かきます")
    #expect(polite.readingGuide?.hangul == "카키마스")
    #expect(VerbConjugator.generate(front: "切る", reading: "きる", partOfSpeech: nil) == nil)
}

@Test func sharedVerbGoldenFixturesMatchWebAndAndroid() throws {
    struct Fixture: Decodable {
        struct Case: Decodable {
            struct Expected: Decodable { let japanese: String; let reading: String; let hangul: String? }
            let front: String
            let reading: String?
            let partOfSpeech: String?
            let verbClass: VerbClass?
            let formCount: Int
            let expected: [String: Expected]
            let absent: [String]
        }
        let schemaVersion: Int
        let cases: [Case]
    }
    let url = URL(fileURLWithPath: #filePath).deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent().appendingPathComponent("shared/verb-fixtures.json")
    let fixture = try JSONDecoder().decode(Fixture.self, from: Data(contentsOf: url))
    #expect(fixture.schemaVersion == 1)
    #expect(fixture.cases.count >= 28)
    for expected in fixture.cases {
        let generated = VerbConjugator.generate(front: expected.front, reading: expected.reading, partOfSpeech: expected.partOfSpeech)
        #expect(generated?.verbClass == expected.verbClass)
        #expect((generated?.forms.count ?? 0) == expected.formCount)
        if expected.verbClass == nil { #expect(generated == nil); continue }
        let table = try #require(generated)
        #expect(Set(table.forms.map(\.key)).count == table.forms.count)
        for (key, value) in expected.expected {
            let actual = try #require(table.forms.first { $0.key == key })
            #expect(actual.japanese == value.japanese)
            #expect(actual.reading == value.reading)
            if let hangul = value.hangul { #expect(actual.readingGuide?.hangul == hangul) }
        }
        for key in expected.absent { #expect(!table.forms.contains { $0.key == key }) }
        for form in table.forms {
            #expect(form.stem + form.suffix == form.japanese)
            let guide = try #require(form.readingGuide)
            #expect(guide.segments.map(\.text).joined() == form.japanese)
            #expect(guide.segments.map { $0.reading ?? $0.text }.joined() == form.reading)
            var readingOffset = 0
            let boundaries = Set(guide.segments.map { segment in
                let start = readingOffset
                readingOffset += (segment.reading ?? segment.text).utf16.count
                return start
            })
            #expect(guide.hangul == HangulPronunciation.guide(form.reading, vowelBreaks: boundaries).text)
            #expect(guide.hangulStatus == "COMPLETE")
        }
    }
}

@Test func givingKureruHasStandardImperativeAndOmitsUnsupportedUsage() throws {
    for front in ["くれる", "呉れる"] {
        let table = try #require(VerbConjugator.generate(front: front, reading: "くれる", partOfSpeech: "一段動詞"))
        #expect(table.forms.count == 16)
        #expect(table.forms.first { $0.key == "imperative" }?.japanese == (front == "呉れる" ? "呉れ" : "くれ"))
        #expect(table.forms.first { $0.key == "imperative" }?.reading == "くれ")
        for key in ["potential", "passive", "tai", "volitional", "request"] { #expect(!table.forms.contains { $0.key == key }) }
    }
    let sunset = try #require(VerbConjugator.generate(front: "暮れる", reading: "くれる", partOfSpeech: "一段動詞"))
    #expect(!sunset.forms.contains { $0.key == "potential" })
    #expect(sunset.forms.contains { $0.key == "request" })
}

@Test func modernKakeruOverridesMixedClassificationWhileOtherAmbiguousClassesAreRejected() throws {
    for front in ["駆ける"] {
        let table = try #require(VerbConjugator.generate(front: front, reading: "かける", partOfSpeech: "1단동사 · 5단동사"))
        #expect(table.verbClass == .ichidan)
        #expect(table.forms.first { $0.key == "masu" }?.reading == "かけます")
        #expect(table.forms.first { $0.key == "te" }?.reading == "かけて")
    }
    #expect(VerbConjugator.generate(front: "かける", reading: "かける", partOfSpeech: "1단동사 · 5단동사") == nil)
    #expect(VerbConjugator.generate(front: "かける", reading: "かける", partOfSpeech: "一段動詞")?.verbClass == .ichidan)
    #expect(VerbConjugator.generate(front: "食べる", reading: "たべる", partOfSpeech: "1단동사 · 5단동사") == nil)
    #expect(VerbConjugator.generate(front: "切る", reading: "きる", partOfSpeech: "五段動詞 · 一段動詞") == nil)
}

@Test func junzuruUsesReviewedModernIchidanAlternativeWithoutEditingOriginalNote() throws {
    for (front, dictionary) in [("準ずる", "準じる"), ("准ずる", "准じる")] {
        let original = Note(id: "personal:synthetic-junzuru:front", kind: .vocabulary, front: front, reading: "じゅんずる")
        let table = try #require(VerbConjugator.generate(front: original.front, reading: original.reading, partOfSpeech: "サ変動詞 · 五段動詞"))
        #expect(table.verbClass == .ichidan)
        #expect(table.dictionaryForm == dictionary)
        #expect(table.dictionaryReading == "じゅんじる")
        #expect(table.forms.first { $0.key == "masu" }?.reading == "じゅんじます")
        #expect(table.forms.first { $0.key == "te" }?.reading == "じゅんじて")
        #expect(table.rule == "원본 準ずる·准ずる는 サ변입니다. 여기서는 같은 뜻의 현대형 準じる·准じる 활용을 보여줍니다. 활용의 모양을 비교하는 표입니다. 뜻·주어·상황에 따라 사용할 수 있는 형태는 다릅니다.")
        #expect(original.front == front)
        #expect(original.reading == "じゅんずる")
    }
}

@Test func aruCompoundsKeepTheirPrefixAndOmitUnsupportedElevenFormRows() throws {
    let cases = [("ある", "ある", "ない", "ない"), ("有る", "ある", "ない", "ない"), ("在る", "ある", "ない", "ない"), ("気がある", "きがある", "気がない", "きがない"), ("価値が有る", "かちがある", "価値がない", "かちがない")]
    for (front, reading, negative, negativeReading) in cases {
        let table = try #require(VerbConjugator.generate(front: front, reading: reading, partOfSpeech: "五段動詞"))
        #expect(table.forms.count == 11)
        #expect(table.forms.first { $0.key == "nai" }?.japanese == negative)
        #expect(table.forms.first { $0.key == "nai" }?.reading == negativeReading)
        for key in ["potential", "passive", "causative", "causativePassive", "imperative", "request", "prohibition", "teiru", "tai", "volitional"] {
            #expect(!table.forms.contains { $0.key == key })
        }
    }
}

@Test func iruOmitsOnlyRedundantProgressiveAndKeepsIntentionalResidenceExpressions() throws {
    for front in ["いる", "居る"] {
        let table = try #require(VerbConjugator.generate(front: front, reading: "いる", partOfSpeech: "一段動詞"))
        #expect(table.forms.count == 20)
        #expect(!table.forms.contains { $0.key == "teiru" })
        for key in ["tai", "volitional", "imperative", "request", "potential"] { #expect(table.forms.contains { $0.key == key }) }
    }
    let sleep = try #require(VerbConjugator.generate(front: "寝る", reading: "ねる", partOfSpeech: "一段動詞"))
    #expect(sleep.forms.contains { $0.key == "teiru" })
}

@Test func yukuOnbinUsesIkuteReadingAndPropagatesToConnectedAndPastForms() throws {
    let cases = [("ゆく", "ゆく", "いって", "いって"), ("行く", "ゆく", "行って", "いって"), ("往く", "ゆく", "往って", "いって"), ("逝く", "ゆく", "逝って", "いって"), ("持って行く", "もってゆく", "持って行って", "もっていって")]
    for (front, reading, te, teReading) in cases {
        let table = try #require(VerbConjugator.generate(front: front, reading: reading, partOfSpeech: "五段動詞"))
        #expect(table.forms.first { $0.key == "te" }?.japanese == te)
        #expect(table.forms.first { $0.key == "te" }?.reading == teReading)
        #expect(table.forms.first { $0.key == "ta" }?.reading == String(teReading.dropLast()) + "た")
        #expect(table.forms.first { $0.key == "teiru" }?.reading == teReading + "いる")
        #expect(table.forms.first { $0.key == "request" }?.reading == teReading + "ください")
        #expect(table.forms.first { $0.key == "tara" }?.reading == String(teReading.dropLast()) + "たら")
    }
}

@Test func conjugatedHangulKeepsAlignedKanjiAndKanaMorphemeBoundaries() throws {
    for (front, reading, hangul) in [("思う", "おもう", "오모우"), ("拾う", "ひろう", "히로우")] {
        let table = try #require(VerbConjugator.generate(front: front, reading: reading, partOfSpeech: "五段動詞"))
        let dictionary = try #require(table.forms.first { $0.key == "dictionary" })
        #expect(dictionary.readingGuide?.hangul == hangul)
        #expect(dictionary.readingGuide?.segments.map { $0.reading ?? $0.text }.joined() == reading)
        #expect(table.forms.first { $0.key == "masu" }?.readingGuide?.hangul == (front == "思う" ? "오모이마스" : "히로이마스"))
    }
}

@Test func reviewedNonVolitionalLexemesOmitIntentCommandAndPotentialWhileKeepingHomophones() throws {
    let cases = [("咲く", "さく", "五段動詞"), ("暮れる", "くれる", "一段動詞"), ("空く", "あく", "五段動詞"), ("空く", "すく", "五段動詞"), ("故障", "こしょう", "名詞 · サ変動詞")]
    for (front, reading, pos) in cases {
        let table = try #require(VerbConjugator.generate(front: front, reading: reading, partOfSpeech: pos))
        #expect(table.forms.count == 18)
        for key in ["volitional", "imperative", "potential"] { #expect(!table.forms.contains { $0.key == key }) }
        for key in ["tai", "request"] { #expect(table.forms.contains { $0.key == key }) }
        #expect(table.rule.contains("기본 뜻에서는 의지·명령을 쓰지 않으므로 두 형태를 표시하지 않습니다."))
        #expect(table.rule.hasSuffix("활용의 모양을 비교하는 표입니다. 뜻·주어·상황에 따라 사용할 수 있는 형태는 다릅니다."))
    }
    for (front, reading, pos) in [("開く", "ひらく", "五段動詞"), ("吹く", "ふく", "五段動詞"), ("いる", "いる", "一段動詞")] {
        let table = try #require(VerbConjugator.generate(front: front, reading: reading, partOfSpeech: pos))
        for key in ["volitional", "imperative"] { #expect(table.forms.contains { $0.key == key }) }
        #expect(!table.rule.contains("기본 뜻에서는 의지"))
    }
}

@Test func reviewedPotentialAndPassiveRestrictionsKeepMeaningAndReadingPairsExact() throws {
    for (front, reading, pos, count, noPassive) in [
        ("分かる", "わかる", "五段動詞", 19, true), ("わかる", "わかる", "五段動詞", 19, true),
        ("知る", "しる", "五段動詞", 20, false), ("見える", "みえる", "一段動詞", 18, false),
        ("聞こえる", "きこえる", "一段動詞", 18, false), ("見つかる", "みつかる", "五段動詞", 18, false)
    ] {
        let table = try #require(VerbConjugator.generate(front: front, reading: reading, partOfSpeech: pos))
        #expect(table.forms.count == count)
        #expect(!table.forms.contains { $0.key == "potential" })
        #expect(table.forms.contains { $0.key == "passive" } == !noPassive)
        for key in ["tai", "request", "causative", "causativePassive"] { #expect(table.forms.contains { $0.key == key }) }
        #expect(table.rule.contains("기본 뜻에 맞지 않는 가능형은 생성하지 않습니다."))
        #expect(table.rule.contains("일반적인 수동형도 표시하지 않습니다.") == noPassive)
    }
    let see = try #require(VerbConjugator.generate(front: "見る", reading: "みる", partOfSpeech: "一段動詞"))
    #expect(see.forms.count == 21)
    #expect(see.forms.contains { $0.key == "potential" })
    #expect(see.forms.contains { $0.key == "passive" })
}

@Test func dekiruUsesTwelveMeaningfulFormsAndExactSharedUsageExplanation() throws {
    let expectedRule = "できる는 가능·완성을 나타냅니다. 희망은 ～できるようになりたい 등으로 표현하며, 사역·요청 등을 그대로 만들지 않습니다. ～ている는 완성된 상태의 뜻에서 사용합니다. 기본 뜻에서는 의지·명령을 쓰지 않으므로 두 형태를 표시하지 않습니다. 기본 뜻에 맞지 않는 가능형은 생성하지 않습니다. 일반적인 수동형도 표시하지 않습니다. 활용의 모양을 비교하는 표입니다. 뜻·주어·상황에 따라 사용할 수 있는 형태는 다릅니다."
    for front in ["できる", "出来る"] {
        let table = try #require(VerbConjugator.generate(front: front, reading: "できる", partOfSpeech: "一段動詞"))
        #expect(table.forms.count == 12)
        for key in ["potential", "passive", "tai", "volitional", "imperative", "causative", "causativePassive", "request", "prohibition"] {
            #expect(!table.forms.contains { $0.key == key })
        }
        #expect(table.forms.first { $0.key == "teiru" }?.reading == "できている")
        #expect(table.rule == expectedRule)
    }
    let ordinary = try #require(VerbConjugator.generate(front: "生きる", reading: "いきる", partOfSpeech: "一段動詞"))
    #expect(ordinary.forms.count == 21)
}

@Test func kureruImperativeHintExplainsPoliteRequestWithoutSuggestingKureteKudasai() throws {
    for front in ["くれる", "呉れる"] {
        let table = try #require(VerbConjugator.generate(front: front, reading: "くれる", partOfSpeech: "一段動詞"))
        let imperative = try #require(table.forms.first { $0.key == "imperative" })
        #expect(imperative.description == "강한 요청 · 정중하게는 くれますか 등으로 부탁합니다")
        #expect(!imperative.description.contains("てください"))
    }
    let ordinary = try #require(VerbConjugator.generate(front: "食べる", reading: "たべる", partOfSpeech: "一段動詞"))
    #expect(ordinary.forms.first { $0.key == "imperative" }?.description == "강한 명령 · 일상 요청에는 てください 사용")
}
