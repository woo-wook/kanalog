import Foundation

public struct GrammarTopic: Equatable, Sendable {
    public var title: String
    public var paragraphs: [String]
}
public struct GrammarAnswer: Equatable, Sendable {
    public var example: String
    public var translation: String
    public var expression: String
    public var topics: [GrammarTopic]
    public static func parse(_ answer: String?, front: String) -> GrammarAnswer? {
        let lines = (answer ?? "").components(separatedBy: .newlines).map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }.filter { !$0.isEmpty }
        let topics = ["뉘앙스", "접속", "헷갈리는 문형"]
        guard lines.first == front.trimmingCharacters(in: .whitespacesAndNewlines) else { return nil }
        let positions = topics.map { lines.firstIndex(of: $0) ?? -1 }
        guard positions[0] == 3, positions[2] < lines.count - 1 else { return nil }
        for i in topics.indices {
            guard positions[i] >= 0, lines.filter({ $0 == topics[i] }).count == 1,
                  i == 0 || positions[i] > positions[i - 1] + 1 else { return nil }
        }
        return GrammarAnswer(example: lines[0], translation: lines[1], expression: lines[2], topics: topics.indices.map { i in
            GrammarTopic(title: topics[i], paragraphs: Array(lines[(positions[i] + 1)..<(i + 1 < positions.count ? positions[i + 1] : lines.count)]))
        })
    }
}
public struct NotePresentation: Equatable, Sendable {
    public var title: String
    public var prompt: String
    public var answer: String?
    public var grammarAnswer: GrammarAnswer?
    public var reading: String?
    public var readingGuide: ReadingGuide?
    public var hangul: String?
    public var highlightSegments: [HighlightSegment]?
    public init(note: Note, revealed: Bool, settings: StudySettings) {
        title = note.title; prompt = note.front
        answer = revealed ? note.meaning : nil
        grammarAnswer = revealed && note.kind == .grammar ? GrammarAnswer.parse(note.meaning, front: note.front) : nil
        let hintsVisible = revealed || settings.showHintBeforeAnswer || note.kind.isKana
        reading = hintsVisible ? note.reading : nil
        readingGuide = hintsVisible && settings.showFurigana ? note.readingGuide : nil
        hangul = hintsVisible && settings.showHangul ? note.readingGuide?.hangul ?? note.hangulHint : nil
        highlightSegments = note.grammarFocus?.segments.map(\.text).joined() == note.front ? note.grammarFocus?.segments : nil
    }
}
