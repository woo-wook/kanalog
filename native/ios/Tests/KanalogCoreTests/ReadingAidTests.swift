import Foundation
import Testing
@testable import KanalogCore

@Test func personalSuppliedReadingBuildsOfflineRubyAndHangulWithoutInventingKanjiReading() throws {
    let guide = try #require(LocalReadingGuide.create(text: "食べる", reading: "たべる"))
    #expect(guide.segments == [ReadingSegment(text: "食", reading: "た"), ReadingSegment(text: "べる", reading: nil)])
    #expect(guide.hangul == "타베루")
    #expect(guide.source == "READING")
    let unknown = try #require(LocalReadingGuide.create(text: "未知", reading: nil))
    #expect(unknown.hangul == nil)
    #expect(unknown.source == "NONE")
    #expect(HangulPronunciation.guide("カッパ").text == "캅파")
    #expect(HangulPronunciation.guide("がっこう").text == "각코오")
    #expect(HangulPronunciation.guide("未知かな").status == "PARTIAL")
}

@Test func sharedReadingGoldenFixturesMatchWebAndAndroid() throws {
    struct Fixture: Decodable {
        struct Hangul: Decodable { let reading: String; let text: String?; let status: String }
        struct Alignment: Decodable { let text: String; let reading: String; let segments: [ReadingSegment]? }
        let schemaVersion: Int
        let hangul: [Hangul]
        let alignment: [Alignment]
    }
    let url = URL(fileURLWithPath: #filePath).deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent().appendingPathComponent("shared/reading-fixtures.json")
    let fixture = try JSONDecoder().decode(Fixture.self, from: Data(contentsOf: url))
    #expect(fixture.schemaVersion == 1)
    for expected in fixture.hangul {
        let actual = HangulPronunciation.guide(expected.reading)
        #expect(actual.text == expected.text)
        #expect(actual.status == expected.status)
    }
    for expected in fixture.alignment {
        #expect(KanaAlignment.align(text: expected.text, reading: expected.reading) == expected.segments)
    }
}

@Test func personalWordReadingGuideIsSavedAndOriginalGuideWins() throws {
    let directory = try temporaryDirectory()
    defer { try? FileManager.default.removeItem(at: directory) }
    let store = try LocalStudyStore(directory: directory)
    let note = Note(id: "personal:fixture:front", kind: .vocabulary, front: "食べる", reading: "たべる", meaning: "먹다")
    try store.savePersonalNote(note)
    let reopened = try LocalStudyStore(directory: directory)
    #expect(try reopened.snapshot().notes[note.id]?.readingGuide?.hangul == "타베루")
    let original = ReadingGuide(segments: [ReadingSegment(text: "食べる", reading: "たべる")], source: "ORIGINAL", hangul: "원본 수동 발음", hangulSource: "MANUAL", hangulStatus: "COMPLETE")
    #expect(LocalReadingGuide.create(text: "食べる", reading: "たべる", original: original) == original)
}
