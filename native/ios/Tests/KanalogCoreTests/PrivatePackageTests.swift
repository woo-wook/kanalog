import Foundation
import Testing
@testable import KanalogCore

/// Opt in explicitly; source text and audio are never copied into the repository or printed.
@Test(.enabled(if: ProcessInfo.processInfo.environment["NATIVE_PACKAGE_PATH"] != nil))
func completePrivatePackageInstallsOfflineAndKeepsProgressAfterRestartAndReimport() throws {
    let source = URL(fileURLWithPath: try #require(ProcessInfo.processInfo.environment["NATIVE_PACKAGE_PATH"])).standardizedFileURL
    let directory = try temporaryDirectory()
    defer { try? FileManager.default.removeItem(at: directory) }
    let store = try LocalStudyStore(directory: directory)
    let builtinURL = URL(fileURLWithPath: #filePath).deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent().appendingPathComponent("shared/builtin-content.json")
    try store.install(ContentPackage.decode(Data(contentsOf: builtinURL)))
    let installer = ContentPackageInstaller(store: store)
    try installer.install(directory: source)
    let installed = try store.snapshot()
    #expect(installed.notes.values.filter { $0.kind == .vocabulary }.count == 9_159)
    #expect(installed.notes.values.filter { $0.kind == .grammar }.count == 1_078)
    #expect(installed.notes.values.filter { $0.kind.isKana }.count == 208)
    let audioNote = try #require(installed.notes.values.first { $0.kind == .vocabulary && $0.audio != nil })
    let audioPath = try #require(audioNote.audio)
    #expect(FileManager.default.fileExists(atPath: directory.appendingPathComponent(audioPath).path))
    var reviewedIDs: [String] = []
    for kind in [ContentKind.vocabulary, .grammar] {
        let session = try store.startSession(scope: StudyScope(kinds: [kind], levels: ["N5"]), now: fixedNow)
        let item = try #require(session.current)
        _ = try store.submit(ReviewRequest(key: "private-\(kind.rawValue)", sessionID: session.id, itemID: item.id, noteID: item.noteID, expectedVersion: item.version, rating: .good), now: fixedNow)
        try store.editNoteState(item.noteID, bookmarked: true, memo: "합성 검증 메모")
        reviewedIDs.append(item.noteID)
    }
    let originalProgress = try store.snapshot().progress
    let reopened = try LocalStudyStore(directory: directory)
    try ContentPackageInstaller(store: reopened).install(directory: source)
    let restored = try reopened.snapshot()
    for id in reviewedIDs {
        #expect(restored.progress[id] == originalProgress[id])
        #expect(restored.progress[id]?.card != nil)
    }
    #expect(restored.reviews.count == 2)
    #expect(restored.notes.count == 10_445)
}
