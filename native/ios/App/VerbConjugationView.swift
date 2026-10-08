import SwiftUI
import KanalogCore

/// The generated table is shared by revealed study cards and the vocabulary detail view.
struct VerbConjugationView: View {
    @EnvironmentObject var model: AppModel
    let conjugation: VerbConjugation

    var body: some View {
        VStack(alignment: .leading, spacing: 18) {
            Text("동사 활용").font(.title2.bold()).accessibilityIdentifier("verb.conjugation.title")
            Text(conjugation.classLabel).font(.headline).foregroundStyle(KanalogTheme.primary)
                .accessibilityIdentifier("verb.conjugation.class")
            Text(conjugation.rule).font(.subheadline).foregroundStyle(.secondary)
            Text("바뀐 어미를 색으로 표시합니다. 한글 표기는 발음 보조입니다.")
                .font(.caption).foregroundStyle(.secondary)
            ForEach(VerbFormGroup.allCases, id: \.self) { group in
                VStack(alignment: .leading, spacing: 14) {
                    Text(group.title).font(.headline)
                    ForEach(conjugation.forms.filter { $0.group == group }) { form in
                        VStack(alignment: .leading, spacing: 10) {
                            HStack(alignment: .firstTextBaseline) {
                                Text(form.label).font(.subheadline.bold())
                                Spacer()
                                Button { model.pronounceConjugation(form) } label: {
                                    Image(systemName: "speaker.wave.2")
                                }.buttonStyle(.bordered)
                                    .accessibilityLabel("\(form.label) 발음 듣기")
                                    .accessibilityIdentifier("verb.audio.\(form.key)")
                            }
                            JapaneseText(
                                text: form.japanese,
                                guide: model.snapshot.settings.showFurigana ? form.readingGuide : nil,
                                highlights: [HighlightSegment(text: form.stem, highlighted: false), HighlightSegment(text: form.suffix, highlighted: true)]
                            ).accessibilityIdentifier("verb.japanese.\(form.key)")
                            Text(form.reading).font(.body).foregroundStyle(.secondary)
                                .accessibilityIdentifier("verb.reading.\(form.key)")
                            if model.snapshot.settings.showHangul, let hangul = form.readingGuide?.hangul {
                                Text(hangul).font(.body).foregroundStyle(.secondary)
                            }
                            Text(form.description).font(.caption).foregroundStyle(.secondary)
                        }.frame(maxWidth: .infinity, alignment: .leading)
                            .padding(14).background(Color.secondary.opacity(0.06), in: RoundedRectangle(cornerRadius: 16))
                    }
                }
            }
        }.frame(maxWidth: .infinity, alignment: .leading)
    }
}

extension VerbFormGroup {
    var title: String {
        switch self {
        case .basic: "기본 활용"
        case .connect: "문장 연결"
        case .advanced: "확장 활용"
        }
    }
}
