import Testing
@testable import KanalogCore

@Test func grammarPromptKeepsOriginalHighlightAndHidesAnswerUntilRevealed() throws {
    var note = Note(id: "synthetic:grammar:front", kind: .grammar, level: "N5", front: "窓を開けてください。", meaning: "窓を開けてください。\n창문을 열어 주세요.\n〜てください\n뉘앙스\n정중한 부탁\n접속\n동사 て형\n헷갈리는 문형\n〜てもいい")
    note.grammarFocus = GrammarFocus(title: "〜てください", segments: [HighlightSegment(text: "窓を開け", highlighted: false), HighlightSegment(text: "てください", highlighted: true), HighlightSegment(text: "。", highlighted: false)])
    let hidden = NotePresentation(note: note, revealed: false, settings: StudySettings())
    #expect(hidden.title == "〜てください")
    #expect(hidden.prompt == note.front)
    #expect(hidden.answer == nil)
    #expect(hidden.grammarAnswer == nil)
    #expect(hidden.highlightSegments == note.grammarFocus?.segments)
    let answer = NotePresentation(note: note, revealed: true, settings: StudySettings())
    #expect(answer.grammarAnswer?.translation == "창문을 열어 주세요.")
    #expect(answer.grammarAnswer?.topics.map(\.title) == ["뉘앙스", "접속", "헷갈리는 문형"])
}
