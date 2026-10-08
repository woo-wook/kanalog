import SwiftUI
import KanalogCore

/// The generated table is shared by revealed study cards and the vocabulary detail view.
struct VerbConjugationView: View {
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
                VerbConjugationGroupView(group: group, forms: conjugation.forms.filter { $0.group == group })
            }
        }.frame(maxWidth: .infinity, alignment: .leading)
    }
}

private struct VerbConjugationGroupView: View {
    let group: VerbFormGroup
    let forms: [VerbConjugationForm]

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            Text(group.title).font(.headline)
            ForEach(forms) { form in VerbConjugationRowView(form: form) }
        }
    }
}

private struct VerbConjugationRowView: View {
    @EnvironmentObject var model: AppModel
    let form: VerbConjugationForm

    private var guide: ReadingGuide? {
        model.snapshot.settings.showFurigana ? form.readingGuide : nil
    }
    private var highlights: [HighlightSegment] {
        [HighlightSegment(text: form.stem, highlighted: false), HighlightSegment(text: form.suffix, highlighted: true)]
    }
    private var hangul: String? {
        model.snapshot.settings.showHangul ? form.readingGuide?.hangul : nil
    }
    private var header: some View {
        HStack(alignment: .firstTextBaseline) {
            Text(form.label).font(.subheadline.bold())
            Spacer()
            Button { model.pronounceConjugation(form) } label: {
                Image(systemName: "speaker.wave.2")
            }.buttonStyle(.bordered)
                .accessibilityLabel("\(form.label) 발음 듣기")
                .accessibilityIdentifier("verb.audio.\(form.key)")
        }
    }
    private var japaneseForm: some View {
        JapaneseText(text: form.japanese, guide: guide, highlights: highlights)
            .accessibilityIdentifier("verb.japanese.\(form.key)")
    }
    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            header
            japaneseForm
            Text(form.reading).font(.body).foregroundStyle(.secondary)
                .accessibilityIdentifier("verb.reading.\(form.key)")
            if let hangul { Text(hangul).font(.body).foregroundStyle(.secondary) }
            Text(form.description).font(.caption).foregroundStyle(.secondary)
        }.frame(maxWidth: .infinity, alignment: .leading)
            .padding(14).background(Color.secondary.opacity(0.06), in: RoundedRectangle(cornerRadius: 16))
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
