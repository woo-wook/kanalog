import Foundation

public enum VerbClass: String, Codable, Sendable { case godan = "GODAN", ichidan = "ICHIDAN", suru = "SURU", kuru = "KURU" }
public enum VerbFormGroup: String, Codable, CaseIterable, Sendable { case basic = "BASIC", connect = "CONNECT", advanced = "ADVANCED" }
public struct VerbConjugation: Codable, Equatable, Sendable {
    public let verbClass: VerbClass
    public let classLabel: String
    public let dictionaryForm: String
    public let dictionaryReading: String
    public let rule: String
    public let forms: [VerbConjugationForm]
}
public struct VerbConjugationForm: Codable, Equatable, Identifiable, Sendable {
    public let key: String
    public let label: String
    public let group: VerbFormGroup
    public let description: String
    public let japanese: String
    public let reading: String
    public let stem: String
    public let suffix: String
    public let readingGuide: ReadingGuide?
    public var id: String { key }
}

/// Port of the common verb engine. Explicit classes take precedence; -iru/-eru are never guessed.
public enum VerbConjugator {
    private struct PairForm {
        let text: String
        let reading: String
        func append(_ suffix: String) -> PairForm { PairForm(text: text + suffix, reading: reading + suffix) }
    }
    public static func generate(front: String, reading: String?, partOfSpeech: String?) -> VerbConjugation? {
        guard !front.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty, front.utf16.count <= 128,
              let reading, KanaAlignment.isKana(reading) else { return nil }
        let kana = KanaAlignment.hiragana(reading)
        guard KanaAlignment.align(text: front, reading: kana) != nil else { return nil }
        let pos = (partOfSpeech ?? "").replacingOccurrences(of: " ", with: "")
        let type: VerbClass
        if pos.contains("5단동사") || pos.contains("五段") { type = .godan }
        else if pos.contains("1단동사") || pos.contains("一段") { type = .ichidan }
        else if pos.contains("サ변") || pos.contains("サ変") || front == "する" { type = .suru }
        else if pos.contains("カ변") || pos.contains("カ変") || ["来る", "くる"].contains(front) { type = .kuru }
        else { return nil }
        let nominalSuru = type == .suru && (pos.contains("명사") || pos.contains("名詞")) && !front.hasSuffix("する")
        let dictionary = PairForm(text: front + (nominalSuru ? "する" : ""), reading: kana + (nominalSuru ? "する" : ""))
        guard let ending = dictionary.text.last else { return nil }
        let endings = Array("うくぐすつぬぶむる")
        if type == .godan && (!endings.contains(ending) || dictionary.reading.last != ending) { return nil }
        if type == .ichidan && (!dictionary.text.hasSuffix("る") || !dictionary.reading.hasSuffix("る")) { return nil }
        if type == .suru && (!dictionary.text.hasSuffix("する") || !dictionary.reading.hasSuffix("する")) { return nil }
        if type == .kuru && (!dictionary.reading.hasSuffix("くる") || !(dictionary.text.hasSuffix("来る") || dictionary.text.hasSuffix("くる"))) { return nil }
        let width = type == .suru || (type == .kuru && dictionary.text.hasSuffix("くる")) ? 2 : 1
        let stem = PairForm(text: String(dictionary.text.dropLast(width)), reading: String(dictionary.reading.dropLast(type == .kuru ? 2 : width)))
        func godan(_ row: String) -> PairForm { stem.append(String(Array(row)[endings.firstIndex(of: ending)!])) }
        func kuru(_ value: String) -> PairForm {
            PairForm(text: stem.text + (dictionary.text.hasSuffix("来る") ? String(value.dropFirst()) : value), reading: stem.reading + value)
        }
        let iStem: PairForm
        switch type { case .godan: iStem = godan("いきぎしちにびみり"); case .suru: iStem = stem.append("し"); case .kuru: iStem = kuru("き"); case .ichidan: iStem = stem }
        let aStem = type == .godan ? godan("わかがさたなばまら") : stem
        let aru = type == .godan && ["ある", "有る", "在る"].contains(dictionary.text) && dictionary.reading == "ある"
        let iku = type == .godan && dictionary.text.hasSuffix("く") && (["行く", "往く", "逝く"].contains { dictionary.text.hasSuffix($0) } || ["いく", "ゆく"].contains(dictionary.text))
        let honorific = type == .godan && ["いらっしゃる", "おっしゃる", "くださる", "なさる", "ござる"].contains(dictionary.reading)
        let uOnbin = type == .godan && ["問う", "請う", "乞う"].contains(dictionary.text)
        let negative: PairForm
        if aru { negative = PairForm(text: "ない", reading: "ない") }
        else { switch type { case .godan: negative = aStem.append("ない"); case .suru: negative = stem.append("しない"); case .kuru: negative = kuru("こない"); case .ichidan: negative = stem.append("ない") } }
        let te: PairForm
        if type == .suru { te = stem.append("して") }
        else if type == .kuru { te = kuru("きて") }
        else if type == .ichidan { te = stem.append("て") }
        else if iku { te = stem.append("って") }
        else if uOnbin { te = stem.append("うて") }
        else if "うつる".contains(ending) { te = stem.append("って") }
        else if "ぬぶむ".contains(ending) { te = stem.append("んで") }
        else if ending == "く" { te = stem.append("いて") }
        else if ending == "ぐ" { te = stem.append("いで") }
        else { te = stem.append("して") }
        let past = PairForm(text: String(te.text.dropLast()) + (te.text.hasSuffix("で") ? "だ" : "た"), reading: String(te.reading.dropLast()) + (te.reading.hasSuffix("で") ? "だ" : "た"))
        let politeStem = honorific ? stem.append("い") : iStem
        var forms: [VerbConjugationForm] = []
        func add(_ key: String, _ label: String, _ group: VerbFormGroup, _ description: String, _ value: PairForm) {
            let base = key == "dictionary" ? value.text : (value.text.hasPrefix(stem.text) ? stem.text : "")
            let pronunciation = HangulPronunciation.guide(value.reading)
            let guide = ReadingGuide(segments: KanaAlignment.align(text: value.text, reading: value.reading) ?? [ReadingSegment(text: value.text, reading: value.reading)], source: "READING", hangul: pronunciation.text, hangulSource: "APPROXIMATE", hangulStatus: pronunciation.status)
            forms.append(VerbConjugationForm(key: key, label: label, group: group, description: description, japanese: value.text, reading: value.reading, stem: base, suffix: String(value.text.dropFirst(base.count)), readingGuide: guide))
        }
        add("dictionary", "기본형", .basic, "사전에 나오는 형태", dictionary)
        add("masu", "정중형", .basic, "정중하게 말할 때 · ～합니다", politeStem.append("ます"))
        add("masen", "정중 부정", .basic, "정중하게 부정할 때 · ～하지 않습니다", politeStem.append("ません"))
        add("mashita", "정중 과거", .basic, "지난 일을 정중하게 말할 때 · ～했습니다", politeStem.append("ました"))
        add("masendeshita", "정중 과거 부정", .basic, "지난 일을 정중하게 부정할 때", politeStem.append("ませんでした"))
        add("nai", "부정형", .basic, "～하지 않는다", negative)
        add("nakatta", "과거 부정", .basic, "～하지 않았다", PairForm(text: String(negative.text.dropLast()) + "かった", reading: String(negative.reading.dropLast()) + "かった"))
        add("te", "て형", .connect, "요청·진행·연결 표현의 출발점", te)
        add("ta", "과거형", .basic, "～했다", past)
        add("teiru", "진행·상태", .connect, "～하고 있다 · 문맥에 따라 결과 상태", te.append("いる"))
        add("tai", "희망형", .connect, "～하고 싶다", iStem.append("たい"))
        let productivePotential = !aru && (type != .suru || dictionary.text == "する" || nominalSuru || pos.contains("명사") || pos.contains("名詞"))
        if productivePotential {
            let potential: PairForm
            switch type { case .godan: potential = godan("えけげせてねべめれ").append("る"); case .suru: potential = stem.append("できる"); case .kuru: potential = kuru("こられる"); case .ichidan: potential = stem.append("られる") }
            add("potential", "가능형", .advanced, "～할 수 있다 · 1단/くる는 수동형과 같은 모양", potential)
        }
        if !aru {
            let passive: PairForm, causative: PairForm
            switch type {
            case .godan: passive = aStem.append("れる"); causative = aStem.append("せる")
            case .suru: passive = stem.append("される"); causative = stem.append("させる")
            case .kuru: passive = kuru("こられる"); causative = kuru("こさせる")
            case .ichidan: passive = stem.append("られる"); causative = stem.append("させる")
            }
            add("passive", "수동형", .advanced, "행위의 영향을 받음 · 문맥에 따라 존경 표현", passive)
            add("causative", "사역형", .advanced, "～하게 하다 · ～하도록 허락하다", causative)
            add("causativePassive", "사역 수동", .advanced, "～하도록 시킴을 받다 · 줄임 없는 표준형", PairForm(text: String(causative.text.dropLast()), reading: String(causative.reading.dropLast())).append("られる"))
        }
        let volitional: PairForm, imperative: PairForm, conditional: PairForm
        switch type {
        case .godan: volitional = godan("おこごそとのぼもろ").append("う"); imperative = honorific ? stem.append("い") : godan("えけげせてねべめれ"); conditional = godan("えけげせてねべめれ").append("ば")
        case .suru: volitional = stem.append("しよう"); imperative = stem.append("しろ"); conditional = stem.append("すれば")
        case .kuru: volitional = kuru("こよう"); imperative = kuru("こい"); conditional = kuru("くれば")
        case .ichidan: volitional = stem.append("よう"); imperative = stem.append("ろ"); conditional = stem.append("れば")
        }
        add("volitional", "의지·권유", .advanced, "～하자 · ～하려고 한다", volitional)
        if !aru { add("imperative", "명령형", .advanced, "강한 명령 · 일상 요청에는 てください 사용", imperative) }
        add("ba", "ば 조건형", .advanced, "～하면 · 조건 표현", conditional)
        add("tara", "たら 조건형", .advanced, "～하면 · ～한 뒤에", past.append("ら"))
        if !aru {
            add("request", "정중한 요청", .connect, "～해 주세요", te.append("ください"))
            add("prohibition", "하지 말아 주세요", .connect, "정중하게 금지·부탁할 때", negative.append("でください"))
        }
        let label: String
        switch type { case .godan: label = "5단 동사 · 1그룹"; case .ichidan: label = "1단 동사 · 2그룹"; case .suru: label = "불규칙 · する 동사"; case .kuru: label = "불규칙 · くる 동사" }
        let rule: String
        if aru { rule = "ある의 부정은 ない입니다. 일반 예제로 쓰지 않는 가능·수동·사역·요청은 제외합니다." }
        else if iku { rule = "行く의 て형·과거형은 行って·行った입니다. 나머지는 5단 규칙을 따릅니다." }
        else if honorific { rule = "정중형은 り 대신 い가 됩니다. 존경 표현의 쓰임은 문맥에 따라 확인하세요." }
        else if type == .godan { rule = "어미가 あ·い·う·え·お단으로 바뀝니다. う의 부정은 わない, て형은 어미별 음편을 따릅니다." }
        else if type == .ichidan { rule = "끝의 る를 빼고 활용 어미를 붙입니다. 가능·수동은 모두 られる입니다." }
        else if type == .kuru { rule = "来る는 형태에 따라 くる·き·こ로 읽습니다. 예제마다 읽기를 확인하세요." }
        else if nominalSuru { rule = "명사에 する를 붙인 동사입니다. します·しない·して·できる로 활용합니다." }
        else if !productivePotential { rule = "する 활용을 따릅니다. 이 어휘의 가능 표현은 의미·용법 확인이 필요해 자동 생성하지 않습니다." }
        else { rule = "する는 します·しない·して, 가능형은 できる로 바뀝니다." }
        return VerbConjugation(verbClass: type, classLabel: label, dictionaryForm: dictionary.text, dictionaryReading: dictionary.reading, rule: rule, forms: forms)
    }
}
