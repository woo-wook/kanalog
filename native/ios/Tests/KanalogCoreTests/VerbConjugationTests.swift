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
            struct Expected: Decodable { let japanese: String; let reading: String }
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
        }
        for key in expected.absent { #expect(!table.forms.contains { $0.key == key }) }
        for form in table.forms {
            #expect(form.stem + form.suffix == form.japanese)
            let guide = try #require(form.readingGuide)
            #expect(guide.segments.map(\.text).joined() == form.japanese)
            #expect(guide.segments.map { $0.reading ?? $0.text }.joined() == form.reading)
            #expect(guide.hangul == HangulPronunciation.guide(form.reading).text)
            #expect(guide.hangulStatus == "COMPLETE")
        }
    }
}
