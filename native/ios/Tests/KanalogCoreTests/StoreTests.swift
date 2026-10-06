import Foundation
import Testing
import FSRS
@testable import KanalogCore

func temporaryDirectory() throws -> URL {
    let url = FileManager.default.temporaryDirectory.appendingPathComponent("kanalog-test-\(UUID().uuidString)")
    try FileManager.default.createDirectory(at: url, withIntermediateDirectories: true)
    return url
}
func fixtureNotes(_ count: Int = 12) -> [Note] {
    (0..<count).map { Note(id: "synthetic:\($0):front", kind: .vocabulary, level: "N5", front: "例\($0)", reading: "れい", meaning: "합성 예시") }
}
let fixedNow = Date(timeIntervalSince1970: 1_791_267_600)

@Test func reviewUsesOfficialFSRSAndSurvivesReopenAndReimport() throws {
    let directory = try temporaryDirectory()
    defer { try? FileManager.default.removeItem(at: directory) }
    let store = try LocalStudyStore(directory: directory)
    let notes = fixtureNotes(1)
    try store.install(ContentPackage(packageId: "synthetic", version: "1", notes: notes))
    let session = try store.startSession(scope: StudyScope(kinds: [.vocabulary], levels: ["N5"]), now: fixedNow)
    let request = ReviewRequest(key: "request-1", sessionID: session.id, itemID: session.items[0].id, noteID: notes[0].id, expectedVersion: 0, rating: .good)
    let receipt = try store.submit(request, now: fixedNow)
    let official = FSRS(parameters: .init(w: FSRSDefaults.defaultWv6, enableFuzz: false, enableShortTerm: true))
    let expected = try official.next(card: Card(due: fixedNow), now: fixedNow, grade: .good)
    #expect(receipt.card == expected.card)
    #expect(try store.submit(request, now: fixedNow.addingTimeInterval(5)) == receipt)
    let reopened = try LocalStudyStore(directory: directory)
    var updated = notes[0]; updated.meaning = "갱신 합성 예시"
    try reopened.install(ContentPackage(packageId: "synthetic", version: "2", notes: [updated]))
    #expect(try reopened.snapshot().progress[notes[0].id]?.card == expected.card)
    #expect(try reopened.snapshot().reviews.count == 1)
}

@Test func failedAtomicWriteDoesNotAdvanceSessionOrPublishReview() throws {
    let directory = try temporaryDirectory()
    defer { try? FileManager.default.removeItem(at: directory) }
    let initial = try LocalStudyStore(directory: directory)
    try initial.install(ContentPackage(packageId: "synthetic", version: "1", notes: fixtureNotes(1)))
    let session = try initial.startSession(scope: StudyScope(kinds: [.vocabulary]), now: fixedNow)
    let bytes = try Data(contentsOf: directory.appendingPathComponent("state.json"))
    let failing = try LocalStudyStore(directory: directory, writer: { _, _ in throw CocoaError(.fileWriteOutOfSpace) })
    let item = session.items[0]
    #expect(throws: (any Error).self) {
        try failing.submit(ReviewRequest(key: "fail", sessionID: session.id, itemID: item.id, noteID: item.noteID, expectedVersion: item.version, rating: .good), now: fixedNow)
    }
    #expect(try Data(contentsOf: directory.appendingPathComponent("state.json")) == bytes)
    #expect(try failing.snapshot().reviews.isEmpty)
    #expect(try failing.session(session.id)?.answered == 0)
}

@Test func boundsReinforcementAndKeepsOfficialDueSeparateFromTomorrowReminder() throws {
    let directory = try temporaryDirectory()
    defer { try? FileManager.default.removeItem(at: directory) }
    let store = try LocalStudyStore(directory: directory)
    try store.install(ContentPackage(packageId: "synthetic", version: "1", notes: fixtureNotes(1)))
    let session = try store.startSession(scope: StudyScope(kinds: [.vocabulary]), now: fixedNow)
    let item = session.items[0]
    let first = try store.submit(ReviewRequest(key: "again", sessionID: session.id, itemID: item.id, noteID: item.noteID, expectedVersion: item.version, rating: .again), now: fixedNow)
    let retry = try #require(store.session(session.id)?.current)
    #expect(retry.reinforcement)
    let second = try store.submit(ReviewRequest(key: "retry", sessionID: session.id, itemID: retry.id, noteID: retry.noteID, expectedVersion: retry.version, rating: .again), now: fixedNow.addingTimeInterval(20))
    #expect(second.card == first.card)
    #expect(try store.session(session.id)?.complete == true)
    #expect(try store.session(session.id)?.items.count == 2)
    let progress = try #require(store.snapshot().progress[item.noteID])
    #expect(progress.tomorrowReminder != nil)
    #expect(progress.card?.due == fixedNow.addingTimeInterval(60))
}

@Test func personalKanaAudioOverlayPreservesBuiltInIDsAndPracticeState() throws {
    let directory = try temporaryDirectory()
    defer { try? FileManager.default.removeItem(at: directory) }
    let store = try LocalStudyStore(directory: directory)
    let kana = Note(id: "hiragana:あ", kind: .hiragana, group: .basic, front: "あ", reading: "あ", meaning: "아")
    try store.install(ContentPackage(packageId: "kanalog-kana", version: "1", notes: [kana]))
    try store.editNoteState(kana.id, bookmarked: true)
    var audioNote = kana; audioNote.audio = "media/" + String(repeating: "a", count: 64) + ".wav"
    try store.install(ContentPackage(packageId: "personal-max", version: "2", notes: [audioNote]))
    #expect(try store.snapshot().notes.count == 1)
    #expect(try store.snapshot().notes[kana.id]?.audio == audioNote.audio)
    #expect(try store.snapshot().progress[kana.id]?.bookmarked == true)
}
