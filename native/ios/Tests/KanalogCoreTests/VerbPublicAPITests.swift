import KanalogCore
import Testing

@Test func verbChangedEndingHighlightsAreConstructibleFromPublicCoreAPI() {
    let segments: [HighlightSegment] = [
        HighlightSegment(text: "書", highlighted: false),
        HighlightSegment(text: "きます", highlighted: true),
    ]
    #expect(segments.map(\.text).joined() == "書きます")
    #expect(segments.map(\.highlighted) == [false, true])
}
