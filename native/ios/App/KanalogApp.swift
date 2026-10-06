import SwiftUI
import KanalogCore

@main
struct KanalogApp: App {
    @StateObject private var model = AppModel()
    var body: some Scene {
        WindowGroup { RootView().environmentObject(model) }
    }
}

@MainActor
final class AppModel: ObservableObject {
    @Published var snapshot = LocalSnapshot()
    @Published var loading = true
    @Published var working = false
    @Published var error: String?
    @Published var currentSession: StudySession?
    private(set) var store: LocalStudyStore?
    let audio = PronunciationPlayer()

    init() { Task { await load() } }
    func load() async {
        loading = true
        do {
            let directory = try FileManager.default.url(for: .applicationSupportDirectory, in: .userDomainMask, appropriateFor: nil, create: true).appendingPathComponent("Kanalog", isDirectory: true)
            let builtin = Bundle.main.url(forResource: "builtin-content", withExtension: "json")
            let personal = Bundle.main.resourceURL?.appendingPathComponent("PersonalAssets", isDirectory: true)
            let result = try await Task.detached(priority: .userInitiated) {
                let store = try LocalStudyStore(directory: directory)
                let saved = try store.snapshot()
                if let builtin {
                    let package = try ContentPackage.decode(Data(contentsOf: builtin))
                    if saved.packages[package.packageId] != package.version { try store.install(package) }
                }
                if !ProcessInfo.processInfo.arguments.contains("--public-content-only"), let personal, FileManager.default.fileExists(atPath: personal.appendingPathComponent("manifest.json").path) {
                    let data = try Data(contentsOf: personal.appendingPathComponent("manifest.json"))
                    let manifest = try JSONDecoder().decode(PackageManifest.self, from: data)
                    if saved.packages[manifest.packageId] != manifest.version { try ContentPackageInstaller(store: store).install(directory: personal) }
                }
                return (store, try store.snapshot())
            }.value
            store = result.0; snapshot = result.1
        } catch { self.error = error.localizedDescription }
        loading = false
    }
    func perform<T: Sendable>(_ action: @escaping @Sendable (LocalStudyStore) throws -> T) async throws -> T {
        guard let store else { throw CoreError.corruptState }
        return try await Task.detached(priority: .userInitiated) { try action(store) }.value
    }
    func start(_ scope: StudyScope) async {
        working = true; defer { working = false }
        do {
            currentSession = try await perform { try $0.startSession(scope: scope) }
            snapshot = try await perform { try $0.snapshot() }
        } catch { self.error = error.localizedDescription }
    }
    func resume(_ session: StudySession) { currentSession = session }
    func rate(_ rating: StudyRating, key: String) async {
        guard !working, let session = currentSession, let item = session.current else { return }
        working = true; defer { working = false }
        let request = ReviewRequest(key: key, sessionID: session.id, itemID: item.id, noteID: item.noteID, expectedVersion: item.version, rating: rating)
        do {
            _ = try await perform { try $0.submit(request) }
            let result = try await perform { store in (try store.session(session.id), try store.snapshot()) }
            audio.stop(); currentSession = result.0; snapshot = result.1
        } catch { self.error = error.localizedDescription }
    }
    func saveSettings(_ value: StudySettings) async {
        do { try await perform { try $0.setSettings(value) }; snapshot = try await perform { try $0.snapshot() } }
        catch { self.error = error.localizedDescription }
    }
    func flags(_ id: String, bookmarked: Bool? = nil, excluded: Bool? = nil, memo: String? = nil) async {
        do { try await perform { try $0.editNoteState(id, bookmarked: bookmarked, excluded: excluded, memo: memo) }; snapshot = try await perform { try $0.snapshot() } }
        catch { self.error = error.localizedDescription }
    }
    func savePersonal(_ note: Note) async -> Bool {
        do { try await perform { try $0.savePersonalNote(note) }; snapshot = try await perform { try $0.snapshot() }; return true }
        catch { self.error = error.localizedDescription; return false }
    }
    func importFolder(_ url: URL) async {
        working = true; defer { working = false }
        let scoped = url.startAccessingSecurityScopedResource()
        defer { if scoped { url.stopAccessingSecurityScopedResource() } }
        do {
            try await perform { try ContentPackageInstaller(store: $0).install(directory: url) }
            snapshot = try await perform { try $0.snapshot() }
        } catch { self.error = error.localizedDescription }
    }
    func pronounce(_ note: Note, example: Example? = nil) {
        guard let store else { return }
        let path = example?.audio ?? note.audio
        let text = example.map { $0.reading ?? $0.japanese } ?? note.spokenText
        do { try audio.play(path: path, text: text, directory: store.directory, rate: Float(snapshot.settings.speechRate)) }
        catch { self.error = error.localizedDescription }
    }
    var dueCount: Int {
        snapshot.notes.values.filter { note in
            let state = snapshot.progress[note.id]
            return !note.kind.isKana && state?.excluded != true && state?.card != nil && (state!.card!.due <= Date() || (state?.tomorrowReminder.map { $0 <= Date() } ?? false))
        }.count
    }
}
