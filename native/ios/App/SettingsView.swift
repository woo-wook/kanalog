import SwiftUI
import UniformTypeIdentifiers
import KanalogCore

struct SettingsView: View {
    @EnvironmentObject var model: AppModel
    @State private var settings = StudySettings()
    @State private var importing = false
    @State private var saving = false
    @State private var saved = false
    var body: some View {
        Form {
            Section("읽기 보조") {
                Toggle("후리가나", isOn: $settings.showFurigana)
                Toggle("정답 전 읽기 힌트", isOn: $settings.showHintBeforeAnswer)
                Toggle("한글 발음 보조", isOn: $settings.showHangul).accessibilityIdentifier("settings.hangul")
                Text("한글은 일본어 발음의 근사 표기입니다.").font(.footnote).foregroundStyle(.secondary)
            }
            Section("학습") {
                Stepper("새 카드 \(settings.newCardsPerDay)장/일", value: $settings.newCardsPerDay, in: 0...100)
                Picker("시간대", selection: $settings.timezone) {
                    ForEach(Array(Set(["Asia/Seoul", "Asia/Tokyo", "UTC", TimeZone.current.identifier, settings.timezone])).sorted(), id: \.self) { Text($0).tag($0) }
                }
                Slider(value: $settings.retention, in: 0.7...0.99, step: 0.01) { Text("기억 목표") }
                Text("기억 목표 \(Int((settings.retention * 100).rounded()))%").font(.subheadline).foregroundStyle(.secondary)
            }
            Section("발음") {
                Toggle("카드 자동 재생", isOn: $settings.autoPlayAudio)
                Slider(value: $settings.speechRate, in: 0.2...0.6, step: 0.05) { Text("읽기 속도") }
                Text("기기 음성의 읽기 속도를 조절합니다.").font(.footnote).foregroundStyle(.secondary)
                Button("일본어 발음 확인") { model.pronounce(Note(id: "preview:voice", kind: .vocabulary, front: "こんにちは")) }
            }
            Section {
                Button(saving ? "저장 중" : "설정 저장") {
                    saving = true
                    let value = settings
                    Task { await model.saveSettings(value); saving = false; saved = model.snapshot.settings == value }
                }.disabled(saving).accessibilityIdentifier("settings.save")
                if saved { Label("기기에 저장했습니다", systemImage: "checkmark.circle").foregroundStyle(.secondary).accessibilityIdentifier("settings.saved") }
            }
            Section("내 콘텐츠") {
                ForEach(model.snapshot.packages.keys.sorted(), id: \.self) { id in
                    LabeledContent(id, value: model.snapshot.packages[id] ?? "")
                }
                Button(model.working ? "자료 확인 중" : "콘텐츠 폴더 가져오기") { importing = true }.disabled(model.working)
                Text("manifest.json, 콘텐츠 JSON, media 폴더가 포함된 자료를 선택하세요. 진도와 북마크를 보존합니다.").font(.footnote).foregroundStyle(.secondary)
            }
            Section("저장과 개인정보") {
                Text("학습과 발음은 기기에서 동작합니다. 진도는 이 기기에 저장되며 앱을 삭제하면 함께 삭제될 수 있습니다.").font(.footnote).foregroundStyle(.secondary)
            }
        }
        .navigationTitle("설정")
        .onAppear { settings = model.snapshot.settings }
        .onDisappear { model.audio.stop() }
        .fileImporter(isPresented: $importing, allowedContentTypes: [.folder]) { result in
            switch result { case .success(let url): Task { await model.importFolder(url) }; case .failure(let error): model.error = error.localizedDescription }
        }
    }
}

struct StatisticsView: View {
    @EnvironmentObject var model: AppModel
    private func localDate(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.locale = .current
        formatter.dateStyle = .medium
        formatter.timeStyle = .short
        formatter.timeZone = TimeZone(identifier: model.snapshot.settings.timezone) ?? .current
        return formatter.string(from: date)
    }
    var body: some View {
        let snapshot = model.snapshot
        let now = Date()
        let validReviews = snapshot.reviews.filter { $0.receipt.reviewedAt <= now }
        let studied = snapshot.notes.values.filter { !$0.kind.isKana && snapshot.progress[$0.id]?.lastRating != nil }.count
        let kanaStudied = snapshot.notes.values.filter { $0.kind.isKana && snapshot.progress[$0.id]?.lastRating != nil }.count
        let statistics = StudyStatistics(reviews: validReviews, timezone: TimeZone(identifier: snapshot.settings.timezone) ?? .current, now: now)
        let today = statistics.todayReviews
        List {
            Section("내 학습") {
                LabeledContent("학습한 단어·문법", value: "\(studied)장")
                LabeledContent("연습한 가나", value: "\(kanaStudied)자")
                LabeledContent("단어·문법 복습", value: "\(model.dueCount)장")
                LabeledContent("오늘 평가(전체)", value: "\(today.count)개")
                LabeledContent("전체 평가", value: "\(validReviews.count)개")
                LabeledContent("완료한 연습(전체)", value: "\(snapshot.sessions.values.filter { $0.complete && !$0.items.isEmpty }.count)회")
                LabeledContent("연속 학습", value: "\(statistics.streak)일")
                LabeledContent("최근 학습", value: statistics.lastStudiedAt.map(localDate) ?? "아직 없음")
            }
            Section {
                LabeledContent("최근 7일 답변", value: "\(statistics.answers7Days)개")
                LabeledContent("최근 7일 고유 카드", value: "\(statistics.uniqueCards7Days)장")
                LabeledContent("최근 30일 답변", value: "\(statistics.answers30Days)개")
                LabeledContent("최근 30일 고유 카드", value: "\(statistics.uniqueCards30Days)장")
            } header: { Text("최근 학습(전체)") } footer: {
                Text("오늘을 포함한 7일·30일이며 가나와 오답 보강도 포함합니다. 날짜 기준: \(snapshot.settings.timezone). 오늘 미학습이면 어제부터 연속 학습일을 계산합니다.")
            }
            Section("오늘의 평가(전체)") {
                ForEach(StudyRating.allCases, id: \.self) { rating in LabeledContent(rating.label, value: "\(today.filter { $0.request.rating == rating }.count)개") }
                LabeledContent("즉시 보강", value: "\(today.filter(\.receipt.reinforcement).count)개")
            }
            Section("최근 기록(전체)") {
                ForEach(Array(validReviews.suffix(50).reversed().enumerated()), id: \.element.request.key) { _, review in
                    VStack(alignment: .leading, spacing: 6) {
                        Text(snapshot.notes[review.request.noteID]?.title ?? "보존된 카드 기록").font(.headline).lineLimit(1)
                        Text("\(review.request.rating.label)\(review.receipt.reinforcement ? " · 보강" : "") · \(localDate(review.receipt.reviewedAt))").font(.caption).foregroundStyle(.secondary)
                    }
                }
            }
        }.navigationTitle("학습 기록")
    }
}
