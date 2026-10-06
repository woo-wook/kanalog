import Foundation
import Testing
@testable import KanalogCore

@Test func dailyLimitIsAtomicAcrossInstancesAndStaleVersionsAreRejected() throws {
    let directory = try temporaryDirectory()
    defer { try? FileManager.default.removeItem(at: directory) }
    let a = try LocalStudyStore(directory: directory), b = try LocalStudyStore(directory: directory)
    try a.install(ContentPackage(packageId: "synthetic", version: "1", notes: fixtureNotes(12)))
    var settings = StudySettings(); settings.newCardsPerDay = 1
    try a.setSettings(settings)
    let scope = StudyScope(kinds: [.vocabulary])
    let sa = try a.startSession(scope: scope, now: fixedNow, shuffle: { $0.sorted { $0.id < $1.id } })
    let sb = try b.startSession(scope: scope, now: fixedNow, shuffle: { $0.sorted { $0.id > $1.id } })
    let ia = sa.items[0], ib = sb.items[0]
    _ = try a.submit(ReviewRequest(key: "a", sessionID: sa.id, itemID: ia.id, noteID: ia.noteID, expectedVersion: ia.version, rating: .good), now: fixedNow)
    #expect(throws: CoreError.dailyLimit) { try b.submit(ReviewRequest(key: "b", sessionID: sb.id, itemID: ib.id, noteID: ib.noteID, expectedVersion: ib.version, rating: .good), now: fixedNow) }
    #expect(try b.snapshot().reviews.count == 1)
    let same = try a.startSession(scope: scope, now: fixedNow.addingTimeInterval(900))
    let stale = try b.startSession(scope: scope, now: fixedNow.addingTimeInterval(900))
    let item = try #require(same.current), staleItem = try #require(stale.current)
    _ = try a.submit(ReviewRequest(key: "next", sessionID: same.id, itemID: item.id, noteID: item.noteID, expectedVersion: item.version, rating: .good), now: fixedNow.addingTimeInterval(900))
    #expect(throws: CoreError.staleVersion) { try b.submit(ReviewRequest(key: "stale", sessionID: stale.id, itemID: staleItem.id, noteID: staleItem.noteID, expectedVersion: staleItem.version, rating: .good), now: fixedNow.addingTimeInterval(900)) }
}

@Test func kanaIncludesAll208AndDifficultyPriorityWithoutChangingFSRS() throws {
    let packageURL = URL(fileURLWithPath: #filePath).deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent().appendingPathComponent("shared/builtin-content.json")
    let package = try ContentPackage.decode(Data(contentsOf: packageURL))
    let directory = try temporaryDirectory()
    defer { try? FileManager.default.removeItem(at: directory) }
    let store = try LocalStudyStore(directory: directory)
    try store.install(package)
    let scope = StudyScope(kinds: [.hiragana, .katakana])
    let first = try store.startSession(scope: scope, now: fixedNow)
    #expect(first.items.count == 208)
    let item = first.items[0]
    _ = try store.submit(ReviewRequest(key: "kana", sessionID: first.id, itemID: item.id, noteID: item.noteID, expectedVersion: item.version, rating: .again), now: fixedNow)
    let next = try store.startSession(scope: scope, now: fixedNow)
    #expect(next.items.count == 208)
    #expect(next.items[0].noteID == item.noteID)
    #expect(try store.snapshot().progress[item.noteID]?.card == nil)
    #expect(try store.session(first.id)?.items.count == 208)
    let basic = try store.startSession(scope: StudyScope(kinds: [.hiragana], groups: [.basic]), now: fixedNow)
    #expect(basic.items.count == 46)
}

@Test func seoulNewCardLimitResetsAtLocalMidnightAndDueComesFirst() throws {
    let directory = try temporaryDirectory()
    defer { try? FileManager.default.removeItem(at: directory) }
    let store = try LocalStudyStore(directory: directory)
    try store.install(ContentPackage(packageId: "synthetic", version: "1", notes: fixtureNotes(3)))
    var settings = StudySettings(); settings.newCardsPerDay = 1
    try store.setSettings(settings)
    let now = try #require(ISO8601DateFormatter().date(from: "2026-10-06T14:59:00Z"))
    let session = try store.startSession(scope: StudyScope(kinds: [.vocabulary]), now: now)
    let item = session.items[0]
    _ = try store.submit(ReviewRequest(key: "night", sessionID: session.id, itemID: item.id, noteID: item.noteID, expectedVersion: item.version, rating: .again), now: now)
    let sameDay = try store.startSession(scope: StudyScope(kinds: [.vocabulary]), now: now.addingTimeInterval(20))
    #expect(sameDay.items.isEmpty)
    let nextDay = try store.startSession(scope: StudyScope(kinds: [.vocabulary]), now: now.addingTimeInterval(120))
    #expect(nextDay.items.count == 2)
    #expect(nextDay.items[0].noteID == item.noteID)
    #expect(nextDay.items[0].version == 1)
}
