import Foundation

/// Port of the repository's kana alignment and approximate Korean pronunciation rules.
/// Supplied/original readings take precedence; there is no network or kanji dictionary guess.
public enum KanaAlignment {
    public static func hiragana(_ text: String) -> String {
        String(String.UnicodeScalarView(text.precomposedStringWithCompatibilityMapping.unicodeScalars.map { scalar in
            (0x30A1...0x30F6).contains(scalar.value) ? UnicodeScalar(scalar.value - 0x60)! : scalar
        }))
    }
    public static func isKana(_ text: String) -> Bool {
        !text.isEmpty && hiragana(text).unicodeScalars.allSatisfy { (0x3041...0x3096).contains($0.value) || $0.value == 0x30FC }
    }
    private static func hasKanji(_ text: String) -> Bool {
        text.unicodeScalars.contains { scalar in
            let point = scalar.value
            return point == 0x3005 || point == 0x3007 || (0x2E80...0x2FDF).contains(point) ||
                (0x3021...0x3029).contains(point) || (0x3038...0x303B).contains(point) ||
                (0x3400...0x4DBF).contains(point) || (0x4E00...0x9FFF).contains(point) ||
                (0xF900...0xFAFF).contains(point) || (0x20000...0x2FA1F).contains(point) || (0x30000...0x323AF).contains(point)
        }
    }
    public static func align(text: String, reading: String) -> [ReadingSegment]? {
        guard !text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty, text.utf16.count <= 512,
              reading.utf16.count <= 512, isKana(reading) else { return nil }
        let kana = Array(hiragana(reading).utf16)
        var groups: [String] = []
        for scalar in text.unicodeScalars {
            let value = String(scalar)
            if let last = groups.last, hasKanji(last) == hasKanji(value) { groups[groups.count - 1] += value }
            else { groups.append(value) }
        }
        struct Position: Hashable { var group: Int; var offset: Int }
        var budget = 20_000; var exhausted = false
        var memo: [Position: [[ReadingSegment]]] = [:]
        let small = Set("ゃゅょぁぃぅぇぉ".utf16)
        func solve(_ index: Int, _ offset: Int) -> [[ReadingSegment]] {
            let key = Position(group: index, offset: offset)
            if let cached = memo[key] { return cached }
            budget -= 1
            guard budget >= 0 else { exhausted = true; return [] }
            let result: [[ReadingSegment]]
            if index == groups.count { result = offset == kana.count ? [[]] : [] }
            else {
                let group = groups[index]
                if !hasKanji(group) {
                    let anchor = Array(hiragana(group).utf16)
                    if offset + anchor.count <= kana.count && Array(kana[offset..<(offset + anchor.count)]) == anchor {
                        result = solve(index + 1, offset + anchor.count).map { [ReadingSegment(text: group, reading: nil)] + $0 }
                    } else { result = [] }
                } else if offset >= kana.count { result = [] }
                else {
                    var matches: [[ReadingSegment]] = []
                    for end in (offset + 1)...kana.count {
                        budget -= 1
                        guard budget >= 0 else { exhausted = true; return [] }
                        if small.contains(kana[end - 1]) && end - offset == 1 { continue }
                        if end < kana.count && small.contains(kana[end]) { continue }
                        for tail in solve(index + 1, end) {
                            matches.append([ReadingSegment(text: group, reading: String(decoding: kana[offset..<end], as: UTF16.self))] + tail)
                            if matches.count == 2 { memo[key] = matches; return matches }
                        }
                    }
                    result = matches
                }
            }
            memo[key] = result; return result
        }
        let matches = solve(0, 0)
        guard !exhausted, !matches.isEmpty else { return nil }
        return matches.count == 1 ? matches[0] : [ReadingSegment(text: text, reading: hiragana(reading))]
    }
}

public enum HangulPronunciation {
    public struct Guide: Equatable, Sendable { public var text: String?; public var status: String }
    private static let punctuation = Set("。、！？?!・,.:;「」『』（）()〜～…—-\"'[]/／【】〈〉《》«»".utf16)
    private static let syllables: [String: String] = {
        var result: [String: String] = [:]
        let rows = [("あいうえお", "아이우에오"), ("かきくけこ", "카키쿠케코"), ("がぎぐげご", "가기구게고"), ("さしすせそ", "사시스세소"), ("ざじずぜぞ", "자지즈제조"), ("たちつてと", "타치츠테토"), ("だぢづでど", "다지즈데도"), ("なにぬねの", "나니누네노"), ("はひふへほ", "하히후헤호"), ("ばびぶべぼ", "바비부베보"), ("ぱぴぷぺぽ", "파피푸페포"), ("まみむめも", "마미무메모"), ("らりるれろ", "라리루레로"), ("やゆよわをん", "야유요와오응")]
        for (kana, hangul) in rows { for (a, b) in zip(kana, hangul) { result[String(a)] = String(b) } }
        let bases = [("き", "캬큐쿄"), ("ぎ", "갸규교"), ("し", "샤슈쇼"), ("じ", "자주조"), ("ち", "차추초"), ("に", "냐뉴뇨"), ("ひ", "햐휴효"), ("び", "뱌뷰뵤"), ("ぴ", "퍄퓨표"), ("み", "먀뮤묘"), ("り", "랴류료")]
        for (base, sounds) in bases { for (suffix, sound) in zip("ゃゅょ", sounds) { result[base + String(suffix)] = String(sound) } }
        let special = ["ふぁ":"파", "ふぃ":"피", "ふぇ":"페", "ふぉ":"포", "てぃ":"티", "でぃ":"디", "とぅ":"투", "どぅ":"두", "しぇ":"셰", "じぇ":"제", "ちぇ":"체", "うぃ":"위", "うぇ":"웨", "うぉ":"워", "ゔ":"부", "ゔぁ":"바", "ゔぃ":"비", "ゔぇ":"베", "ゔぉ":"보", "いぇ":"예", "ぁ":"아", "ぃ":"이", "ぅ":"우", "ぇ":"에", "ぉ":"오", "ゃ":"야", "ゅ":"유", "ょ":"요", "ゎ":"와", "ゐ":"이", "ゑ":"에", "ゕ":"카", "ゖ":"케"]
        result.merge(special) { _, value in value }; return result
    }()
    private static func string(_ value: UInt16) -> String { String(decoding: [value], as: UTF16.self) }
    private static func final(_ value: UInt16, _ jong: UInt16) -> UInt16 {
        (0xAC00...0xD7A3).contains(value) && (value - 0xAC00) % 28 == 0 ? value + jong : value
    }
    private static func vowel(_ value: UInt16) -> UInt16? {
        guard (0xAC00...0xD7A3).contains(value) else { return nil }
        return Array("ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ".utf16)[Int((value - 0xAC00) / 28 % 21)]
    }
    private static func whitespace(_ value: UInt16) -> Bool { UnicodeScalar(value).map(CharacterSet.whitespacesAndNewlines.contains) ?? false }
    private static func contains(_ text: String, _ value: UInt16) -> Bool { text.utf16.contains(value) }
    public static func convert(_ reading: String, vowelBreaks: Set<Int> = []) -> String? {
        let kana = Array(KanaAlignment.hiragana(reading).utf16)
        guard !reading.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty, kana.count <= 2_048 else { return nil }
        var output: [UInt16] = []; var i = 0
        while i < kana.count {
            let value = kana[i]
            if value == 0x3063 { // small tsu
                guard !output.isEmpty, i + 1 < kana.count else { return nil }
                let next = kana[i + 1]
                let jong: UInt16 = contains("かきくけこがぎぐげご", next) ? 1 : contains("ぱぴぷぺぽばびぶべぼ", next) ? 17 : 19
                output[output.count - 1] = final(output.last!, jong); i += 1
            } else if value == 0x3093, let last = output.last, vowel(last) != nil {
                let next = i + 1 < kana.count ? kana[i + 1] : 0x20
                let jong: UInt16 = contains("まみむめもばびぶべぼぱぴぷぺぽ", next) ? 16 : contains("かきくけこがぎぐげご", next) ? 21 : 4
                if (last - 0xAC00) % 28 != 0 { output += Array("응".utf16) }
                else { output[output.count - 1] = final(last, jong) }
                i += 1
            } else if value == 0x30FC {
                guard let last = output.last, let previous = vowel(last) else { return nil }
                let sound: String
                if contains("ㅏㅑㅘ", previous) { sound = "아" }
                else if contains("ㅣㅟ", previous) { sound = "이" }
                else if contains("ㅜㅠ", previous) { sound = "우" }
                else if contains("ㅗㅛ", previous) { sound = "오" }
                else if contains("ㅔㅐㅚㅙㅞ", previous) { sound = "에" }
                else if contains("ㅓㅕㅝ", previous) { sound = "어" }
                else if previous == Array("ㅡ".utf16)[0] { sound = "으" }
                else { return nil }
                output += sound.utf16; i += 1
            } else if whitespace(value) || punctuation.contains(value) { output.append(value); i += 1 }
            else {
                let pair = String(decoding: kana[i..<min(i + 2, kana.count)], as: UTF16.self)
                guard let sound = syllables[pair] ?? syllables[string(value)] else { return nil }
                let previous = i > 0 ? kana[i - 1] : 0x20
                if !vowelBreaks.contains(i) && value == 0x3046 && contains("おこごそぞとどのほぼぽもよろょ", previous) { output += "오".utf16 }
                else if !vowelBreaks.contains(i) && value == 0x3044 && contains("えけげせぜてでねへべぺめれ", previous) { output += "에".utf16 }
                else { output += sound.utf16 }
                i += syllables[pair] == nil ? 1 : pair.utf16.count
            }
        }
        return String(decoding: output, as: UTF16.self)
    }
    public static func guide(_ reading: String, vowelBreaks: Set<Int> = []) -> Guide {
        let kana = KanaAlignment.hiragana(reading)
        if let text = convert(kana, vowelBreaks: vowelBreaks) { return Guide(text: text, status: "COMPLETE") }
        guard !kana.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty, kana.utf16.count <= 2_048 else { return Guide(text: nil, status: "UNAVAILABLE") }
        func supported(_ scalar: UnicodeScalar) -> Bool {
            scalar.value <= UInt16.max && (syllables[String(scalar)] != nil || scalar.value == 0x3063 || scalar.value == 0x30FC || punctuation.contains(UInt16(scalar.value)) || CharacterSet.whitespacesAndNewlines.contains(scalar))
        }
        let scalars = Array(kana.unicodeScalars)
        var cursor = 0, utf16Offset = 0; var output = ""; var converted = false
        while cursor < scalars.count {
            let start = cursor, offset = utf16Offset, accepted = supported(scalars[cursor])
            repeat { utf16Offset += scalars[cursor].value > 0xFFFF ? 2 : 1; cursor += 1 } while cursor < scalars.count && supported(scalars[cursor]) == accepted
            let span = String(String.UnicodeScalarView(scalars[start..<cursor]))
            let breaks = Set(vowelBreaks.filter { $0 >= offset && $0 < utf16Offset }.map { $0 - offset })
            let result = span.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? span : accepted ? convert(span, vowelBreaks: breaks) : nil
            if let result {
                output += result
                if span.unicodeScalars.contains(where: { (0x3041...0x3096).contains($0.value) }) { converted = true }
            } else { output += "〔" + span + "〕" }
        }
        return Guide(text: converted ? output : nil, status: converted ? "PARTIAL" : "UNAVAILABLE")
    }
}

public enum LocalReadingGuide {
    public static func create(text: String, reading: String?, original: ReadingGuide? = nil) -> ReadingGuide? {
        if let original { return original }
        guard !text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty, text.utf16.count <= 4_096 else { return nil }
        let supplied = reading.flatMap { KanaAlignment.isKana($0) ? $0 : nil }
        let alignment = supplied.flatMap { KanaAlignment.align(text: text, reading: $0) }
        let segments = alignment ?? [ReadingSegment(text: text, reading: nil)]
        var offset = 0; var breaks: Set<Int> = []
        let pronunciation = segments.map { segment in
            breaks.insert(offset)
            let value = KanaAlignment.hiragana(segment.reading ?? segment.text); offset += value.utf16.count
            return value
        }.joined()
        let guide = HangulPronunciation.guide(supplied != nil && alignment == nil ? supplied! : pronunciation, vowelBreaks: supplied != nil && alignment == nil ? [] : breaks)
        return ReadingGuide(segments: segments, source: supplied != nil ? "READING" : "NONE", hangul: guide.text, hangulSource: guide.text == nil ? nil : "APPROXIMATE", hangulStatus: guide.status)
    }
}
