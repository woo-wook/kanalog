import SwiftUI
import KanalogCore

struct LibraryView: View {
    @EnvironmentObject var model: AppModel
    @State private var query = ""
    @State private var kind: ContentKind?
    @State private var bookmarked = false
    @State private var results: [Note] = []
    @State private var adding = false
    var body: some View {
        List {
            Section {
                Picker("유형", selection: $kind) {
                    Text("전체").tag(nil as ContentKind?)
                    ForEach(ContentKind.allCases, id: \.self) { Text($0.label).tag(Optional($0)) }
                }
                Toggle("북마크만", isOn: $bookmarked)
                Text("\(results.count)개").font(.caption).foregroundStyle(.secondary)
            }
            ForEach(results) { note in
                NavigationLink { NoteDetailView(noteID: note.id) } label: {
                    VStack(alignment: .leading, spacing: 6) {
                        HStack { Text(note.title).font(.headline).lineLimit(2); Spacer(); if model.snapshot.progress[note.id]?.bookmarked == true { Image(systemName: "bookmark.fill").foregroundStyle(KanalogTheme.primary) } }
                        if let reading = note.reading, reading != note.title { Text(reading).font(.subheadline).foregroundStyle(.secondary).lineLimit(1) }
                        if let meaning = note.meaning {
                            let structured = note.kind == .grammar ? GrammarAnswer.parse(meaning, front: note.front) : nil
                            Text(structured?.translation ?? meaning).font(.subheadline).foregroundStyle(.secondary).lineLimit(2)
                        }
                        if model.snapshot.progress[note.id]?.excluded == true { Label("학습 제외", systemImage: "minus.circle").font(.caption).foregroundStyle(.secondary) }
                    }.padding(.vertical, 4)
                }.accessibilityIdentifier("library.note.\(note.id)")
            }
        }
        .navigationTitle("단어장")
        .searchable(text: $query, prompt: "일본어, 읽기, 한국어 뜻")
        .toolbar { Button { adding = true } label: { Image(systemName: "plus") }.accessibilityLabel("개인 단어 추가").accessibilityIdentifier("library.personal.add") }
        .sheet(isPresented: $adding) { NavigationStack { PersonalNoteEditor() }.environmentObject(model) }
        .task(id: "\(query)|\(kind?.rawValue ?? "")|\(bookmarked)|\(model.snapshot.reviews.count)|\(model.snapshot.progress.values.filter(\.bookmarked).count)|\(model.snapshot.notes.count)") {
            let search = query, selectedKind = kind, onlySaved = bookmarked
            do {
                let found = try await model.perform { try $0.search(search, kind: selectedKind, bookmarkedOnly: onlySaved) }
                if !Task.isCancelled { results = found }
            } catch { if !Task.isCancelled { model.error = error.localizedDescription } }
        }
    }
}

struct NoteDetailView: View {
    @EnvironmentObject var model: AppModel
    let noteID: String
    @State private var memo = ""
    @State private var editing = false
    var body: some View {
        if let note = model.snapshot.notes[noteID] {
            ScrollView {
                VStack(alignment: .leading, spacing: 22) {
                    NoteCard(note: note, revealed: true)
                    Button { model.pronounce(note) } label: { Label("발음 듣기", systemImage: "speaker.wave.2") }.buttonStyle(.bordered)
                    Toggle("북마크", isOn: Binding(get: { model.snapshot.progress[noteID]?.bookmarked == true }, set: { value in Task { await model.flags(noteID, bookmarked: value) } }))
                    Toggle("학습 제외", isOn: Binding(get: { model.snapshot.progress[noteID]?.excluded == true }, set: { value in Task { await model.flags(noteID, excluded: value) } }))
                    Text("내 메모").font(.headline)
                    TextEditor(text: $memo).frame(minHeight: 100).padding(6).background(Color.secondary.opacity(0.08), in: RoundedRectangle(cornerRadius: 12))
                    Button("메모 저장") { Task { await model.flags(noteID, memo: memo) } }.buttonStyle(.bordered)
                    if let progress = model.snapshot.progress[noteID], let card = progress.card {
                        Text("다음 복습: \(card.due.formatted(date: .abbreviated, time: .shortened))").font(.subheadline).foregroundStyle(.secondary)
                    }
                    if model.snapshot.notePackages[noteID] == "personal" { Button("개인 단어 수정") { editing = true } }
                }.padding(24)
            }
            .navigationTitle(note.kind.label).navigationBarTitleDisplayMode(.inline)
            .onAppear { memo = model.snapshot.progress[noteID]?.memo ?? "" }
            .onDisappear { model.audio.stop() }
            .sheet(isPresented: $editing) { NavigationStack { PersonalNoteEditor(existing: note) }.environmentObject(model) }
        }
    }
}

struct PersonalNoteEditor: View {
    @EnvironmentObject var model: AppModel
    @Environment(\.dismiss) var dismiss
    var existing: Note?
    @State private var front = ""
    @State private var reading = ""
    @State private var meaning = ""
    @State private var level = "N5"
    @State private var saving = false
    var body: some View {
        Form {
            TextField("일본어 단어", text: $front).textInputAutocapitalization(.never).accessibilityIdentifier("personal.front")
            TextField("읽기", text: $reading).textInputAutocapitalization(.never).accessibilityIdentifier("personal.reading")
            TextField("한국어 뜻", text: $meaning, axis: .vertical).accessibilityIdentifier("personal.meaning")
            Picker("급수", selection: $level) { ForEach(["N5", "N4", "N3", "N2", "N1"], id: \.self) { Text($0).tag($0) } }
        }
        .navigationTitle(existing == nil ? "개인 단어 추가" : "개인 단어 수정")
        .toolbar {
            ToolbarItem(placement: .cancellationAction) { Button("취소") { dismiss() }.disabled(saving) }
            ToolbarItem(placement: .confirmationAction) {
                Button("저장") {
                    saving = true
                    var note = existing ?? Note(id: "personal:\(UUID().uuidString):front", kind: .vocabulary, front: front)
                    note.front = front.trimmingCharacters(in: .whitespacesAndNewlines)
                    note.reading = reading.isEmpty ? nil : reading
                    note.meaning = meaning.isEmpty ? nil : meaning
                    note.level = level
                    // Keep the supplied classification and other original metadata when editing.
                    if note.front != existing?.front || note.reading != existing?.reading { note.readingGuide = nil }
                    let updated = note
                    Task { if await model.savePersonal(updated) { dismiss() }; saving = false }
                }.disabled(front.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || saving).accessibilityIdentifier("personal.save")
            }
        }
        .onAppear { if let existing { front = existing.front; reading = existing.reading ?? ""; meaning = existing.meaning ?? ""; level = existing.level ?? "N5" } }
    }
}

struct KanaReferenceView: View {
    @EnvironmentObject var model: AppModel
    var body: some View {
        List {
            ForEach(KanaGroup.allCases, id: \.self) { group in
                Section(group.label) {
                    let hira = model.snapshot.notes.values.filter { $0.kind == .hiragana && $0.group == group }.sorted { $0.id < $1.id }
                    ForEach(hira) { note in
                        let kata = model.snapshot.notes.values.first { $0.kind == .katakana && $0.front.applyingTransform(.hiraganaToKatakana, reverse: true) == note.front }
                        HStack {
                            Text(note.front).font(.title).frame(minWidth: 55)
                            Text(kata?.front ?? "").font(.title).frame(minWidth: 55)
                            Text(note.readingGuide?.hangul ?? note.meaning ?? "").foregroundStyle(.secondary)
                            Spacer()
                            Button { model.pronounce(note) } label: { Image(systemName: "speaker.wave.2") }.accessibilityLabel("\(note.front) 발음")
                        }
                    }
                }
            }
        }.navigationTitle("가나 참고표").onDisappear { model.audio.stop() }
    }
}
