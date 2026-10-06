import SwiftUI
import KanalogCore

struct StudyView: View {
    @EnvironmentObject var model: AppModel
    @State private var revealed = false
    @State private var requestKey = UUID().uuidString
    @State private var selectedRating: StudyRating?
    var body: some View {
        Group {
            if let session = model.currentSession {
                if let item = session.current, let note = model.snapshot.notes[item.noteID] {
                    VStack(spacing: 0) {
                        ProgressView(value: Double(session.answered), total: Double(max(1, session.items.count))).padding(.horizontal)
                        ScrollView {
                            VStack(alignment: .leading, spacing: 22) {
                                HStack {
                                    Text(item.reinforcement ? "오답 한 번 더 연습" : "\(session.answered + 1) / \(session.items.count)").font(.subheadline).foregroundStyle(.secondary)
                                    Spacer()
                                    Button { Task { await model.flags(note.id, bookmarked: !(model.snapshot.progress[note.id]?.bookmarked ?? false)) } } label: { Image(systemName: model.snapshot.progress[note.id]?.bookmarked == true ? "bookmark.fill" : "bookmark") }.accessibilityLabel("북마크")
                                }
                                NoteCard(note: note, revealed: revealed)
                                Button { model.pronounce(note) } label: { Label("발음 듣기", systemImage: "speaker.wave.2.fill") }.buttonStyle(.bordered).accessibilityIdentifier("study.audio")
                                if revealed {
                                    Toggle("학습에서 제외", isOn: Binding(get: { model.snapshot.progress[note.id]?.excluded == true }, set: { value in Task { await model.flags(note.id, excluded: value) } }))
                                }
                            }.padding(24)
                        }.id(item.id)
                        VStack(spacing: 12) {
                            if !revealed {
                                Button("정답 보기") { revealed = true }.buttonStyle(PrimaryGlassStyle()).frame(maxWidth: .infinity).accessibilityIdentifier("study.reveal")
                            } else {
                                HStack(spacing: 8) {
                                    ForEach(StudyRating.allCases, id: \.self) { rating in
                                        Button(rating.label) {
                                            selectedRating = rating
                                            Task { await model.rate(rating, key: requestKey) }
                                        }
                                        .buttonStyle(.borderedProminent)
                                        .accessibilityIdentifier("study.rating.\(rating.rawValue)")
                                        .tint(rating == .again ? .orange : rating == .hard ? .purple : .indigo)
                                        .disabled(model.working || (selectedRating != nil && selectedRating != rating))
                                        .frame(maxWidth: .infinity)
                                    }
                                }
                                if model.working { ProgressView("기기에 저장 중") }
                                else if let selectedRating { Text("저장이 실패하면 ‘\(selectedRating.label)’을 눌러 다시 저장하세요.").font(.caption).foregroundStyle(.secondary) }
                            }
                        }.padding().background(.regularMaterial)
                    }
                    .onChange(of: item.id, initial: true) { _, _ in
                        revealed = false; selectedRating = nil; requestKey = UUID().uuidString
                        model.audio.stop()
                        if model.snapshot.settings.autoPlayAudio { model.pronounce(note) }
                    }
                } else {
                    ContentUnavailableView {
                        Label(session.items.isEmpty ? "지금 학습할 카드가 없습니다" : "연습을 마쳤어요", systemImage: session.items.isEmpty ? "calendar.badge.clock" : "checkmark.circle.fill")
                    } description: {
                        Text(session.items.isEmpty ? "복습일, 새 카드 한도 또는 제외 설정을 확인해 주세요." : "평가 \(session.answered)개를 기기에 저장했습니다.")
                    } actions: {
                        if !session.items.isEmpty {
                            Button("같은 범위 다시 연습") { Task { await model.start(session.scope) } }.buttonStyle(.borderedProminent)
                        }
                        Button("닫기") { model.currentSession = nil }
                    }
                }
            }
        }
        .navigationTitle("학습")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar { ToolbarItem(placement: .cancellationAction) { Button("닫기") { model.audio.stop(); model.currentSession = nil }.disabled(model.working).accessibilityIdentifier("study.close") } }
        .alert("저장하지 못했습니다", isPresented: Binding(get: { model.error != nil }, set: { if !$0 { model.error = nil } })) {
            Button("확인", role: .cancel) { model.error = nil }
        } message: { Text(model.error ?? "") }
        .interactiveDismissDisabled(model.working)
        .onDisappear { model.audio.stop() }
    }
}

struct PrimaryGlassStyle: ButtonStyle {
    @ViewBuilder
    func makeBody(configuration: Configuration) -> some View {
        #if compiler(>=6.2)
        if #available(iOS 26.0, *) {
            configuration.label.font(.headline).padding(.horizontal, 28).padding(.vertical, 16)
                .frame(maxWidth: .infinity).glassEffect(.regular.interactive(), in: .capsule)
                .opacity(configuration.isPressed ? 0.65 : 1)
        } else { standard(configuration) }
        #else
        standard(configuration)
        #endif
    }
    private func standard(_ configuration: Configuration) -> some View {
        configuration.label.font(.headline).padding(.horizontal, 28).padding(.vertical, 16)
            .frame(maxWidth: .infinity).background(.indigo, in: Capsule()).foregroundStyle(.white)
            .opacity(configuration.isPressed ? 0.65 : 1)
    }
}

struct NoteCard: View {
    @EnvironmentObject var model: AppModel
    let note: Note
    let revealed: Bool
    var body: some View {
        let display = NotePresentation(note: note, revealed: revealed, settings: model.snapshot.settings)
        VStack(alignment: .leading, spacing: 22) {
            if note.kind == .grammar, display.title != display.prompt {
                Text(display.title).font(.title2.bold()).foregroundStyle(.indigo)
            }
            JapaneseText(text: display.prompt, guide: display.readingGuide, highlights: display.highlightSegments, large: note.kind.isKana)
            if let reading = display.reading, !reading.isEmpty, reading != display.prompt, display.readingGuide?.segments.contains(where: { $0.reading != nil }) != true {
                Text(reading).font(.title3).foregroundStyle(.secondary)
            }
            if let hangul = display.hangul, !hangul.isEmpty {
                VStack(alignment: .leading, spacing: 4) { Text("한글 발음 보조").font(.caption).foregroundStyle(.secondary); Text(hangul).font(.body) }
            }
            if model.snapshot.settings.showHangul && (revealed || model.snapshot.settings.showHintBeforeAnswer || note.kind.isKana) {
                if note.readingGuide?.hangulStatus == "PARTIAL" { Text("확인하지 못한 부분은 〔 〕로 표시합니다.").font(.caption).foregroundStyle(.secondary) }
                else if display.hangul == nil { Text("발음 보조를 만들 수 있는 읽기가 없습니다.").font(.caption).foregroundStyle(.secondary) }
            }
            if revealed {
                Divider()
                if let structured = display.grammarAnswer {
                    answerSection("예문 해석", paragraphs: [structured.translation])
                    answerSection("핵심 표현", paragraphs: [structured.expression])
                    ForEach(structured.topics, id: \.title) { topic in answerSection(topic.title, paragraphs: topic.paragraphs) }
                } else if let answer = display.answer, !answer.isEmpty {
                    answerSection(note.kind == .grammar ? "해설" : "뜻", paragraphs: answer.components(separatedBy: .newlines).filter { !$0.isEmpty })
                }
                if let explanation = note.explanation, !explanation.isEmpty { answerSection("설명", paragraphs: explanation.components(separatedBy: .newlines)) }
                ForEach(Array((note.examples ?? []).enumerated()), id: \.offset) { _, example in
                    VStack(alignment: .leading, spacing: 12) {
                        JapaneseText(text: example.japanese, guide: model.snapshot.settings.showFurigana ? example.readingGuide : nil)
                        if model.snapshot.settings.showHangul, let hangul = example.readingGuide?.hangul { Text(hangul).foregroundStyle(.secondary) }
                        if let korean = example.korean { Text(korean).font(.body) }
                        Button { model.pronounce(note, example: example) } label: { Label("예문 듣기", systemImage: "speaker.wave.2") }
                    }.padding().background(Color.secondary.opacity(0.06), in: RoundedRectangle(cornerRadius: 16))
                }
            }
        }
    }
    private func answerSection(_ title: String, paragraphs: [String]) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            Text(title).font(.headline).foregroundStyle(.indigo)
            ForEach(Array(paragraphs.enumerated()), id: \.offset) { _, line in Text(line).font(.body).lineSpacing(6).textSelection(.enabled) }
        }.frame(maxWidth: .infinity, alignment: .leading).padding(16).background(Color.secondary.opacity(0.06), in: RoundedRectangle(cornerRadius: 16))
    }
}

struct JapaneseText: View {
    let text: String
    var guide: ReadingGuide?
    var highlights: [HighlightSegment]?
    var large = false
    var body: some View {
        if let guide, !guide.segments.isEmpty, guide.segments.map(\.text).joined() == text {
            FlowLayout(spacing: 2) {
                ForEach(Array(guide.segments.enumerated()), id: \.offset) { index, segment in
                    VStack(spacing: 2) {
                        Text(segment.reading ?? " ").font(.system(size: 13)).foregroundStyle(.secondary)
                        highlightedText(segment.text, start: guide.segments.prefix(index).reduce(0) { $0 + $1.text.count }).font(.system(size: large ? 64 : 28, weight: .medium))
                    }
                }
            }.accessibilityElement(children: .ignore).accessibilityLabel(text)
        } else { highlightedText(text, start: 0).font(.system(size: large ? 80 : 30, weight: .medium)).lineSpacing(8).textSelection(.enabled) }
    }
    private func highlightedText(_ part: String, start: Int) -> Text {
        guard let highlights, highlights.map(\.text).joined() == text else { return Text(part) }
        var offset = 0; var result = Text("")
        for highlight in highlights {
            let end = offset + highlight.text.count
            let from = max(start, offset), to = min(start + part.count, end)
            if from < to {
                let begin = part.index(part.startIndex, offsetBy: from - start)
                let finish = part.index(part.startIndex, offsetBy: to - start)
                let fragment = Text(String(part[begin..<finish]))
                result = result + (highlight.highlighted ? fragment.foregroundColor(.indigo).bold() : fragment)
            }
            offset = end
        }
        return result
    }
}

struct FlowLayout: Layout {
    var spacing: CGFloat = 4
    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        arrangement(width: proposal.width ?? 320, subviews: subviews).size
    }
    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        let layout = arrangement(width: bounds.width, subviews: subviews)
        for (index, item) in layout.items.enumerated() {
            subviews[index].place(at: CGPoint(x: bounds.minX + item.point.x, y: bounds.minY + item.point.y), proposal: ProposedViewSize(width: item.width, height: nil))
        }
    }
    private func arrangement(width: CGFloat, subviews: Subviews) -> (size: CGSize, items: [(point: CGPoint, width: CGFloat)]) {
        var x: CGFloat = 0, y: CGFloat = 0, rowHeight: CGFloat = 0
        var items: [(point: CGPoint, width: CGFloat)] = []
        let availableWidth = max(0, width)
        for view in subviews {
            let intrinsic = view.sizeThatFits(.unspecified)
            let proposedWidth = min(intrinsic.width, availableWidth)
            let size = view.sizeThatFits(ProposedViewSize(width: proposedWidth, height: nil))
            if x > 0 && x + proposedWidth > availableWidth { y += rowHeight + spacing; x = 0; rowHeight = 0 }
            items.append((point: CGPoint(x: x, y: y), width: proposedWidth))
            x += proposedWidth + spacing; rowHeight = max(rowHeight, size.height)
        }
        return (CGSize(width: availableWidth, height: y + rowHeight), items)
    }
}
