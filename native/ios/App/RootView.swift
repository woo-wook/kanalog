import SwiftUI
import KanalogCore

struct RootView: View {
    @EnvironmentObject var model: AppModel
    var body: some View {
        Group {
            if model.loading { VStack(spacing: 18) { ProgressView(); Text("기기에서 학습 자료를 준비하고 있습니다.").foregroundStyle(.secondary) }.padding() }
            else if model.store == nil { ContentUnavailableView { Label("저장소를 열 수 없습니다", systemImage: "externaldrive.badge.exclamationmark") } description: { Text(model.error ?? "저장 파일을 확인해 주세요.") } actions: { Button("다시 시도") { Task { await model.load() } } } }
            else {
                TabView {
                    NavigationStack { HomeView() }.tabItem { Label("학습", systemImage: "square.stack.fill") }
                    NavigationStack { LibraryView() }.tabItem { Label("단어장", systemImage: "books.vertical.fill") }
                    NavigationStack { StatisticsView() }.tabItem { Label("기록", systemImage: "chart.bar.fill") }
                    NavigationStack { SettingsView() }.tabItem { Label("설정", systemImage: "gearshape.fill") }
                }
                .sheet(item: $model.currentSession) { _ in NavigationStack { StudyView() }.environmentObject(model) }
            }
        }
        .tint(KanalogTheme.primary)
        .alert("확인해 주세요", isPresented: Binding(get: { model.error != nil && model.store != nil && model.currentSession == nil }, set: { if !$0 { model.error = nil } })) {
            Button("확인", role: .cancel) { model.error = nil }
        } message: { Text(model.error ?? "") }
    }
}

struct HomeView: View {
    @EnvironmentObject var model: AppModel
    @State private var kanaKinds: Set<ContentKind> = [.hiragana]
    @State private var groups = Set(KanaGroup.allCases)
    @State private var level = "N5"
    @State private var kind: ContentKind = .vocabulary
    var body: some View {
        Form {
            Section {
                Text("오늘도 한 걸음").font(.title2.bold())
                Text("단어·문법 복습 \(model.dueCount)장 · 기기에서 바로 학습").foregroundStyle(.secondary)
                Button("지금 복습") { Task { await model.start(StudyScope(kinds: [.vocabulary, .grammar], reviewOnly: true)) } }.disabled(model.working)
                if let recent = model.snapshot.sessions.values.filter({ !$0.complete }).max(by: { $0.createdAt < $1.createdAt }) {
                    Button("이어서 학습 · \(recent.answered)/\(recent.items.count)") { model.resume(recent) }
                }
            }
            Section("가나 전체 섞어 연습") {
                Toggle("히라가나", isOn: selected(.hiragana)).accessibilityIdentifier("kana.hiragana")
                Toggle("가타카나", isOn: selected(.katakana)).accessibilityIdentifier("kana.katakana")
                ForEach(KanaGroup.allCases, id: \.self) { group in Toggle(group.label, isOn: groupBinding(group)) }
                let count = model.snapshot.notes.values.filter { kanaKinds.contains($0.kind) && $0.group.map(groups.contains) == true && model.snapshot.progress[$0.id]?.excluded != true }.count
                Button("선택한 \(count)자 연습") { Task { await model.start(StudyScope(kinds: kanaKinds, groups: groups)) } }
                    .disabled(count == 0 || model.working).accessibilityIdentifier("kana.practice.start")
                NavigationLink("가나 참고표") { KanaReferenceView() }
            }
            Section("레벨 전체 학습") {
                Picker("급수", selection: $level) { ForEach(["N5", "N4", "N3", "N2", "N1"], id: \.self) { Text($0).tag($0) } }
                Picker("유형", selection: $kind) { Text("단어").tag(ContentKind.vocabulary); Text("문법").tag(ContentKind.grammar) }.pickerStyle(.segmented)
                let count = model.snapshot.notes.values.filter { $0.level == level && $0.kind == kind }.count
                Text("전체 \(count)장 · 복습 우선 · 새 카드 \(model.snapshot.settings.newCardsPerDay)장/일").font(.subheadline).foregroundStyle(.secondary)
                Button("\(level) \(kind.label) 학습") { Task { await model.start(StudyScope(kinds: [kind], levels: [level])) } }.disabled(count == 0 || model.working)
                if count == 0 { Text("설정에서 개인 콘텐츠 폴더를 가져오면 학습할 수 있습니다.").font(.footnote).foregroundStyle(.secondary) }
            }
        }
        .navigationTitle("Kanalog")
    }
    private func selected(_ kind: ContentKind) -> Binding<Bool> { Binding(get: { kanaKinds.contains(kind) }, set: { if $0 { kanaKinds.insert(kind) } else { kanaKinds.remove(kind) } }) }
    private func groupBinding(_ group: KanaGroup) -> Binding<Bool> { Binding(get: { groups.contains(group) }, set: { if $0 { groups.insert(group) } else { groups.remove(group) } }) }
}
extension ContentKind {
    var label: String { switch self { case .hiragana: "히라가나"; case .katakana: "가타카나"; case .vocabulary: "단어"; case .grammar: "문법" } }
}
extension KanaGroup {
    var label: String { switch self { case .basic: "기본"; case .voiced: "탁음"; case .semiVoiced: "반탁음"; case .yoon: "요음" } }
}
