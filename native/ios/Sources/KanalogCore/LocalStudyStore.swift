import Foundation
import FSRS
import Darwin

/// Each operation holds both an in-process lock and a cross-instance advisory file lock.
/// A candidate snapshot is published only after the atomic writer succeeds.
public final class LocalStudyStore: @unchecked Sendable {
    public let directory: URL
    private let lock = NSRecursiveLock()
    private let writer: @Sendable (Data, URL) throws -> Void
    private var state = LocalSnapshot()
    private var stateURL: URL { directory.appendingPathComponent("state.json") }

    public init(directory: URL, writer: @escaping @Sendable (Data, URL) throws -> Void = { data, url in try data.write(to: url, options: .atomic) }) throws {
        self.directory = directory; self.writer = writer
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        _ = try snapshot()
    }
    private func withFileLock<T>(_ action: () throws -> T) throws -> T {
        lock.lock(); defer { lock.unlock() }
        let descriptor = open(directory.appendingPathComponent("state.lock").path, O_CREAT | O_RDWR, S_IRUSR | S_IWUSR)
        guard descriptor >= 0 else { throw CocoaError(.fileWriteNoPermission) }
        defer { close(descriptor) }
        guard flock(descriptor, LOCK_EX) == 0 else { throw CocoaError(.fileWriteUnknown) }
        defer { flock(descriptor, LOCK_UN) }
        if FileManager.default.fileExists(atPath: stateURL.path) {
            do {
                let data = try Data(contentsOf: stateURL)
                let loaded = try JSONDecoder().decode(LocalSnapshot.self, from: data)
                guard loaded.schemaVersion == 1 else { throw CoreError.unsupportedSchema }
                try loaded.settings.validate()
                state = loaded
            } catch let error as CoreError { throw error }
            catch { throw CoreError.corruptState }
        }
        return try action()
    }
    private func transaction<T>(_ action: (inout LocalSnapshot) throws -> T) throws -> T {
        try withFileLock {
            var candidate = state
            let result = try action(&candidate)
            if candidate == state { return result }
            let encoder = JSONEncoder(); encoder.outputFormatting = [.sortedKeys]
            try writer(encoder.encode(candidate), stateURL)
            state = candidate
            return result
        }
    }
    public func snapshot() throws -> LocalSnapshot { try withFileLock { state } }
    public func install(_ package: ContentPackage) throws {
        try package.validate()
        try transaction { snapshot in
            for note in package.notes {
                if let owner = snapshot.notePackages[note.id], owner != package.packageId {
                    guard owner == "kanalog-kana", note.kind.isKana, let existing = snapshot.notes[note.id],
                          existing.kind == note.kind, existing.front == note.front, existing.group == note.group else { throw CoreError.duplicateID }
                }
            }
            let incomingIDs = Set(package.notes.map(\.id))
            for (id, owner) in snapshot.notePackages where owner == package.packageId && !incomingIDs.contains(id) {
                snapshot.notes.removeValue(forKey: id)
            }
            for note in package.notes {
                snapshot.notes[note.id] = note
                if snapshot.notePackages[note.id] != "kanalog-kana" { snapshot.notePackages[note.id] = package.packageId }
            }
            snapshot.packages[package.packageId] = package.version
        }
    }
    public func setSettings(_ settings: StudySettings) throws {
        try settings.validate()
        try transaction { $0.settings = settings }
    }
    public func editNoteState(_ id: String, bookmarked: Bool? = nil, excluded: Bool? = nil, memo: String? = nil) throws {
        try transaction { snapshot in
            guard snapshot.notes[id] != nil else { throw CoreError.missingNote }
            var progress = snapshot.progress[id] ?? NoteProgress()
            if let bookmarked { progress.bookmarked = bookmarked }
            if let excluded { progress.excluded = excluded }
            if let memo { progress.memo = memo }
            snapshot.progress[id] = progress
        }
    }
    public func savePersonalNote(_ note: Note) throws {
        var note = note
        note.readingGuide = LocalReadingGuide.create(text: note.front, reading: note.reading, original: note.readingGuide)
        try note.validate()
        try transaction { snapshot in
            guard snapshot.notePackages[note.id] == nil || snapshot.notePackages[note.id] == "personal" else { throw CoreError.duplicateID }
            snapshot.notes[note.id] = note; snapshot.notePackages[note.id] = "personal"
        }
    }
    public func search(_ query: String, kind: ContentKind? = nil, bookmarkedOnly: Bool = false) throws -> [Note] {
        let snapshot = try snapshot()
        let needle = query.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        return snapshot.notes.values.filter { note in
            (kind == nil || kind == note.kind) && (!bookmarkedOnly || snapshot.progress[note.id]?.bookmarked == true) &&
            (needle.isEmpty || [note.front, note.title, note.reading ?? "", note.meaning ?? ""].contains { $0.lowercased().contains(needle) })
        }.sorted { $0.title.localizedStandardCompare($1.title) == .orderedAscending }
    }
    private func calendar(_ settings: StudySettings) -> Calendar {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = TimeZone(identifier: settings.timezone)!
        return calendar
    }
    private func newUsed(_ snapshot: LocalSnapshot, now: Date) -> Int {
        let calendar = calendar(snapshot.settings)
        return snapshot.reviews.filter { $0.wasNew && !$0.kind.isKana && calendar.isDate($0.receipt.reviewedAt, inSameDayAs: now) }.count
    }
    public func startSession(scope: StudyScope, now: Date = Date(), shuffle: @Sendable ([Note]) -> [Note] = { $0.shuffled() }) throws -> StudySession {
        try transaction { snapshot in
            let eligible = snapshot.notes.values.filter { scope.contains($0) && snapshot.progress[$0.id]?.excluded != true }
            let chosen: [Note]
            if scope.isKanaPractice {
                // Shuffle within each priority band; an entire selected kana scope is always included.
                chosen = (0...4).flatMap { priority in
                    shuffle(eligible.filter { note in
                        switch snapshot.progress[note.id]?.lastRating {
                        case .again: return priority == 0
                        case .hard: return priority == 1
                        case nil: return priority == 2
                        case .good: return priority == 3
                        case .easy: return priority == 4
                        }
                    })
                }
            } else {
                let due = eligible.filter { note in
                    let p = snapshot.progress[note.id]
                    return p?.card != nil && ((p!.card!.due <= now) || (p?.tomorrowReminder.map { $0 <= now } ?? false))
                }.sorted { (snapshot.progress[$0.id]?.card?.due ?? now) < (snapshot.progress[$1.id]?.card?.due ?? now) }
                let limit = max(0, snapshot.settings.newCardsPerDay - newUsed(snapshot, now: now))
                let fresh = scope.reviewOnly ? [] : shuffle(eligible.filter { snapshot.progress[$0.id]?.card == nil }).prefix(limit).map { $0 }
                chosen = due + fresh
            }
            let session = StudySession(id: UUID().uuidString, scope: scope, items: chosen.map {
                SessionItem(id: UUID().uuidString, noteID: $0.id, version: snapshot.progress[$0.id]?.version ?? 0, reinforcement: false)
            }, createdAt: now)
            snapshot.sessions[session.id] = session
            return session
        }
    }
    public func submit(_ request: ReviewRequest, now: Date = Date()) throws -> ReviewReceipt {
        try transaction { snapshot in
            guard !request.key.isEmpty else { throw CoreError.invalidSession }
            if let previous = snapshot.reviews.first(where: { $0.request.key == request.key }) {
                guard previous.request == request else { throw CoreError.idempotencyConflict }
                return previous.receipt
            }
            guard var session = snapshot.sessions[request.sessionID], let current = session.current,
                  current.id == request.itemID, current.noteID == request.noteID,
                  current.version == request.expectedVersion else { throw CoreError.invalidSession }
            guard let note = snapshot.notes[request.noteID] else { throw CoreError.missingNote }
            var progress = snapshot.progress[request.noteID] ?? NoteProgress()
            guard progress.version == request.expectedVersion else { throw CoreError.staleVersion }
            let wasNew = !session.scope.isKanaPractice && !current.reinforcement && progress.card == nil
            if wasNew && !note.kind.isKana && newUsed(snapshot, now: now) >= snapshot.settings.newCardsPerDay { throw CoreError.dailyLimit }
            var officialLog: ReviewLog?
            if !session.scope.isKanaPractice && !current.reinforcement {
                let scheduler = FSRS(parameters: .init(requestRetention: snapshot.settings.retention, w: FSRSDefaults.defaultWv6, enableFuzz: false, enableShortTerm: true))
                let scheduled = try scheduler.next(card: progress.card ?? Card(due: now), now: now, grade: request.rating.official)
                progress.card = scheduled.card; officialLog = scheduled.log
                progress.tomorrowReminder = request.rating == .again ? calendar(snapshot.settings).date(byAdding: .day, value: 1, to: calendar(snapshot.settings).startOfDay(for: now)) : nil
            }
            progress.lastRating = request.rating
            progress.version += 1
            snapshot.progress[request.noteID] = progress
            session.answered += 1
            if request.rating == .again && !current.reinforcement && !session.scope.isKanaPractice {
                session.items.append(SessionItem(id: UUID().uuidString, noteID: note.id, version: progress.version, reinforcement: true))
            }
            snapshot.sessions[session.id] = session
            let receipt = ReviewReceipt(noteID: note.id, version: progress.version, card: progress.card, reviewedAt: now, reinforcement: current.reinforcement)
            snapshot.reviews.append(SavedReview(request: request, receipt: receipt, officialLog: officialLog, wasNew: wasNew, kind: note.kind))
            return receipt
        }
    }
    public func session(_ id: String) throws -> StudySession? { try snapshot().sessions[id] }
    public func dueCount(now: Date = Date()) throws -> Int {
        let snapshot = try snapshot()
        return snapshot.notes.values.filter { note in
            let progress = snapshot.progress[note.id]
            return progress?.excluded != true && progress?.card != nil && (progress!.card!.due <= now || (progress?.tomorrowReminder.map { $0 <= now } ?? false))
        }.count
    }
}
