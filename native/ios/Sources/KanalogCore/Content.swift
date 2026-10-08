import Foundation

public enum ContentKind: String, Codable, CaseIterable, Sendable {
    case hiragana, katakana, vocabulary, grammar
    public var isKana: Bool { self == .hiragana || self == .katakana }
}
public enum KanaGroup: String, Codable, CaseIterable, Sendable {
    case basic, voiced, semiVoiced, yoon
}
public struct ReadingSegment: Codable, Equatable, Sendable {
    public var text: String
    public var reading: String?
}
public struct ReadingGuide: Codable, Equatable, Sendable {
    public var segments: [ReadingSegment]
    public var source: String
    public var hangul: String?
    public var hangulSource: String?
    public var hangulStatus: String?
}
public struct HighlightSegment: Codable, Equatable, Sendable {
    public var text: String
    public var highlighted: Bool
    public init(text: String, highlighted: Bool) {
        self.text = text; self.highlighted = highlighted
    }
}
public struct GrammarFocus: Codable, Equatable, Sendable {
    public var title: String
    public var segments: [HighlightSegment]
}
public struct Example: Codable, Equatable, Sendable {
    public var japanese: String
    public var reading: String?
    public var korean: String?
    public var readingGuide: ReadingGuide?
    public var audio: String?
}
public struct Note: Codable, Equatable, Identifiable, Sendable {
    public var id: String
    public var kind: ContentKind
    public var level: String?
    public var group: KanaGroup?
    public var front: String
    public var reading: String?
    public var meaning: String?
    public var grammarFocus: GrammarFocus?
    public var readingGuide: ReadingGuide?
    public var examples: [Example]?
    public var audio: String?
    public var explanation: String?
    public var hangulHint: String?
    public var partOfSpeech: String?

    public init(id: String, kind: ContentKind, level: String? = nil, group: KanaGroup? = nil, front: String, reading: String? = nil, meaning: String? = nil) {
        self.id = id; self.kind = kind; self.level = level; self.group = group
        self.front = front; self.reading = reading; self.meaning = meaning
    }
    public var title: String { grammarFocus?.title ?? front }
    public var spokenText: String {
        if kind == .grammar { return examples?.first?.reading ?? examples?.first?.japanese ?? front }
        return reading ?? front
    }
    public func validate() throws {
        guard !id.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty, id.utf8.count <= 512,
              !front.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty,
              front.utf8.count <= 200_000 else { throw CoreError.invalidContent }
        guard level == nil || ["N5", "N4", "N3", "N2", "N1"].contains(level!) else { throw CoreError.invalidContent }
        guard !kind.isKana || group != nil else { throw CoreError.invalidContent }
        for path in [audio] + (examples ?? []).map(\.audio) {
            if let path { try ContentPackage.validateMediaPath(path) }
        }
        for guide in [readingGuide] + (examples ?? []).map(\.readingGuide) {
            if let guide {
                guard ["ORIGINAL", "READING", "DICTIONARY", "NONE"].contains(guide.source),
                      guide.hangulSource == nil || ["MANUAL", "APPROXIMATE"].contains(guide.hangulSource!),
                      guide.hangulStatus == nil || ["COMPLETE", "PARTIAL", "UNAVAILABLE"].contains(guide.hangulStatus!) else { throw CoreError.invalidContent }
            }
        }
    }
}
public struct ContentPackage: Codable, Equatable, Sendable {
    public static let maximumBytes = 64 * 1024 * 1024
    public var schemaVersion: Int
    public var packageId: String
    public var version: String
    public var notes: [Note]
    public init(packageId: String, version: String, notes: [Note]) {
        schemaVersion = 1; self.packageId = packageId; self.version = version; self.notes = notes
    }
    public static func decode(_ data: Data) throws -> ContentPackage {
        guard data.count <= maximumBytes else { throw CoreError.tooLarge }
        let result = try JSONDecoder().decode(Self.self, from: data)
        try result.validate()
        return result
    }
    public func validate() throws {
        guard schemaVersion == 1 else { throw CoreError.unsupportedSchema }
        guard !packageId.isEmpty, packageId.utf8.count <= 512, !version.isEmpty, version.utf8.count <= 128,
              notes.count <= 30_000 else { throw CoreError.invalidContent }
        guard Set(notes.map(\.id)).count == notes.count else { throw CoreError.duplicateID }
        for note in notes { try note.validate() }
    }
    public static func validateMediaPath(_ path: String) throws {
        let expression = #"^media/[a-fA-F0-9]{64}\.(mp3|m4a|wav|ogg|aac)$"#
        guard path.range(of: expression, options: .regularExpression) != nil else { throw CoreError.unsafePath }
    }
}
public enum CoreError: Error, Equatable, LocalizedError {
    case unsupportedSchema, invalidContent, duplicateID, unsafePath, tooLarge, integrityMismatch
    case missingNote, staleVersion, idempotencyConflict, dailyLimit, invalidSession, corruptState
    public var errorDescription: String? {
        switch self {
        case .unsupportedSchema: return "지원하지 않는 콘텐츠 또는 저장 형식입니다."
        case .invalidContent: return "콘텐츠 형식이 올바르지 않습니다."
        case .duplicateID: return "콘텐츠 ID가 중복되었습니다."
        case .unsafePath: return "안전하지 않은 미디어 경로입니다."
        case .tooLarge: return "파일 크기 한도를 초과했습니다."
        case .integrityMismatch: return "파일 크기 또는 해시가 일치하지 않습니다."
        case .missingNote: return "콘텐츠를 찾을 수 없습니다."
        case .staleVersion: return "다른 학습에서 카드가 갱신되었습니다. 학습을 다시 시작해 주세요."
        case .idempotencyConflict: return "이미 다른 평가로 저장된 요청입니다."
        case .dailyLimit: return "오늘의 새 카드 한도를 모두 사용했습니다."
        case .invalidSession: return "학습 세션을 찾을 수 없거나 평가 순서가 다릅니다."
        case .corruptState: return "저장 파일이 손상되었습니다. 원본 파일을 보존했습니다."
        }
    }
}
