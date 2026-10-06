import Foundation
import FSRS

public enum StudyRating: Int, Codable, CaseIterable, Sendable {
    case again = 1, hard, good, easy
    public var label: String {
        switch self { case .again: "다시"; case .hard: "어려움"; case .good: "보통"; case .easy: "쉬움" }
    }
    var official: Rating { Rating(rawValue: rawValue)! }
}
public struct StudySettings: Codable, Equatable, Sendable {
    public var showFurigana = true
    public var showHintBeforeAnswer = false
    public var showHangul = false
    public var autoPlayAudio = false
    public var newCardsPerDay = 10
    public var timezone = "Asia/Seoul"
    public var retention = 0.9
    public var speechRate = 0.45
    public init() {}
    public func validate() throws {
        guard (0...100).contains(newCardsPerDay), TimeZone(identifier: timezone) != nil,
              (0.7...0.99).contains(retention), (0.2...0.6).contains(speechRate) else { throw CoreError.invalidContent }
    }
}
public struct NoteProgress: Codable, Equatable, Sendable {
    public var version = 0
    public var card: Card?
    public var schedulerVersion = "swift-fsrs/4fbaf201/fsrs6"
    public var lastRating: StudyRating?
    public var bookmarked = false
    public var excluded = false
    public var memo = ""
    public var tomorrowReminder: Date?
    public init() {}
}
public struct StudyScope: Codable, Equatable, Sendable {
    public var kinds: Set<ContentKind>
    public var levels: Set<String>
    public var groups: Set<KanaGroup>
    public var reviewOnly: Bool
    public init(kinds: Set<ContentKind> = Set(ContentKind.allCases), levels: Set<String> = [], groups: Set<KanaGroup> = Set(KanaGroup.allCases), reviewOnly: Bool = false) {
        self.kinds = kinds; self.levels = levels; self.groups = groups; self.reviewOnly = reviewOnly
    }
    func contains(_ note: Note) -> Bool {
        kinds.contains(note.kind) && (levels.isEmpty || note.level.map(levels.contains) == true) && (!note.kind.isKana || note.group.map(groups.contains) == true)
    }
    public var isKanaPractice: Bool { !kinds.isEmpty && kinds.allSatisfy(\.isKana) && !reviewOnly }
}
public struct SessionItem: Codable, Equatable, Identifiable, Sendable {
    public var id: String
    public var noteID: String
    public var version: Int
    public var reinforcement: Bool
}
public struct StudySession: Codable, Equatable, Identifiable, Sendable {
    public var id: String
    public var scope: StudyScope
    public var items: [SessionItem]
    public var answered = 0
    public var createdAt: Date
    public var current: SessionItem? { answered < items.count ? items[answered] : nil }
    public var complete: Bool { current == nil }
}
public struct ReviewRequest: Codable, Equatable, Sendable {
    public var key: String
    public var sessionID: String
    public var itemID: String
    public var noteID: String
    public var expectedVersion: Int
    public var rating: StudyRating
    public init(key: String, sessionID: String, itemID: String, noteID: String, expectedVersion: Int, rating: StudyRating) {
        self.key = key; self.sessionID = sessionID; self.itemID = itemID; self.noteID = noteID; self.expectedVersion = expectedVersion; self.rating = rating
    }
}
public struct ReviewReceipt: Codable, Equatable, Sendable {
    public var noteID: String
    public var version: Int
    public var card: Card?
    public var reviewedAt: Date
    public var reinforcement: Bool
}
public struct SavedReview: Codable, Equatable, Sendable {
    public var request: ReviewRequest
    public var receipt: ReviewReceipt
    public var officialLog: ReviewLog?
    public var wasNew: Bool
    public var kind: ContentKind
}
public struct LocalSnapshot: Codable, Equatable, Sendable {
    public var schemaVersion = 1
    public var notes: [String: Note] = [:]
    public var notePackages: [String: String] = [:]
    public var packages: [String: String] = [:]
    public var progress: [String: NoteProgress] = [:]
    public var reviews: [SavedReview] = []
    public var sessions: [String: StudySession] = [:]
    public var settings = StudySettings()
    public init() {}
}
