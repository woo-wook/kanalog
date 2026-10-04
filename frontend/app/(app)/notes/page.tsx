"use client";
import { FormEvent, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, json, type Note, type Page, type Settings } from "@/api";
import { Loading, ErrorMessage } from "@/shell";
import { NoteEntry } from "@/note-entry";
import { Plus, Search } from "lucide-react";
import { useNoteAudio } from "@/use-note-audio";
const categories = [
  ["", "전체"],
  ["vocabulary", "단어"],
  ["grammar", "문법"],
  ["kana", "가나"],
] as const;
export default function NotesPage() {
  const client = useQueryClient(),
    [input, setInput] = useState(""),
    [query, setQuery] = useState(""),
    [page, setPage] = useState(0),
    [kind, setKind] = useState(""),
    [pending, setPending] = useState(false),
    [creating, setCreating] = useState(false),
    [editing, setEditing] = useState<Note | null>(null),
    [form, setForm] = useState({
      japanese: "",
      reading: "",
      meaning: "",
      example: "",
      exampleMeaning: "",
      memo: "",
    }),
    [message, setMessage] = useState("");
  const settings = useQuery({
    queryKey: ["settings"],
    queryFn: () => api<Settings>("/settings"),
  });
  const { attachAudio, onPlaying, onEnded, onError, ...audio } = useNoteAudio(
    settings.data,
  );
  const notes = useQuery({
    queryKey: ["notes", query, page, kind],
    queryFn: () =>
      api<Page<Note>>(
        `/notes?query=${encodeURIComponent(query)}&page=${page}&size=20&kind=${kind}`,
      ),
  });
  function search(e: FormEvent) {
    e.preventDefault();
    audio.stop();
    setPage(0);
    setQuery(input);
  }
  async function save(e: FormEvent) {
    e.preventDefault();
    if (pending) return;
    setPending(true);
    setMessage("");
    try {
      if (editing) await api(`/notes/${editing.id}`, json("PATCH", form));
      else {
        await api("/notes", json("POST", form));
        setKind("vocabulary");
        setPage(0);
        setInput("");
        setQuery("");
      }
      setCreating(false);
      setEditing(null);
      setForm({
        japanese: "",
        reading: "",
        meaning: "",
        example: "",
        exampleMeaning: "",
        memo: "",
      });
      client.invalidateQueries({ queryKey: ["notes"] });
      setMessage("단어를 저장했습니다.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "저장하지 못했습니다.",
      );
    } finally {
      setPending(false);
    }
  }
  function edit(note: Note) {
    audio.stop();
    setEditing(note);
    setCreating(false);
    setForm({
      japanese: note.japanese ?? note.front ?? "",
      reading: note.reading ?? "",
      meaning: note.meaning ?? "",
      example: note.example ?? "",
      exampleMeaning: note.exampleMeaning ?? "",
      memo: note.memo ?? "",
    });
  }
  async function patch(note: Note, field: "bookmarked" | "excluded") {
    if (pending) return;
    setPending(true);
    setMessage("");
    try {
      await api(`/notes/${note.id}`, json("PATCH", { [field]: !note[field] }));
      await client.invalidateQueries({ queryKey: ["notes"] });
      if (field === "excluded") {
        for (const key of ["courses", "curriculum", "dashboard"])
          client.invalidateQueries({ queryKey: [key] });
      }
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "변경하지 못했습니다.");
    } finally {
      setPending(false);
    }
  }
  return (
    <div>
      <audio
        ref={attachAudio}
        preload="none"
        className="hidden"
        aria-label="단어장 발음 오디오"
        onPlaying={onPlaying}
        onEnded={onEnded}
        onError={onError}
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            단어장
          </h1>
          <p className="muted mt-1.5 text-sm">
            단어와 문형을 찾고, 필요한 설명만 펼쳐 보세요.
          </p>
        </div>
        <button
          className="btn btn-primary text-sm"
          disabled={pending}
          onClick={() => {
            audio.stop();
            setCreating(true);
            setEditing(null);
            setForm({
              japanese: "",
              reading: "",
              meaning: "",
              example: "",
              exampleMeaning: "",
              memo: "",
            });
          }}
        >
          <Plus size={17} aria-hidden="true" />내 단어 추가
        </button>
      </div>
      <form onSubmit={search} className="notes-search mt-6 flex min-w-0 gap-2">
        <div className="relative min-w-0 flex-1">
          <Search
            size={18}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            className="field pl-10"
            aria-label="단어 검색"
            placeholder="단어·읽기·뜻 검색"
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
        </div>
        <button className="btn btn-primary shrink-0 text-sm">검색</button>
      </form>
      <div
        className="mt-4 flex rounded-xl bg-secondary p-1"
        role="group"
        aria-label="단어장 분류"
      >
        {categories.map(([value, label]) => (
          <button
            type="button"
            key={value}
            aria-pressed={kind === value}
            className={`min-h-11 min-w-0 flex-1 rounded-lg px-2 text-sm font-medium transition-colors ${kind === value ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            onClick={() => {
              audio.stop();
              setPage(0);
              setKind(value);
            }}
          >
            {label}
          </button>
        ))}
      </div>
      {message && (
        <p role="status" className="mt-4 text-sm">
          {message}
        </p>
      )}
      {settings.error && (
        <div className="surface mt-4 p-4">
          <ErrorMessage error={settings.error} />
          <button
            type="button"
            className="btn mt-2 text-sm"
            onClick={() => settings.refetch()}
          >
            음성 설정 다시 불러오기
          </button>
        </div>
      )}
      {(creating || editing) && (
        <form onSubmit={save} className="note-form surface mt-5 grid gap-4 p-5">
          <h2 className="text-xl font-bold">
            {editing ? "내 단어 수정" : "내 단어 추가"}
          </h2>
          {(
            [
              ["japanese", "일본어 표기"],
              ["reading", "가나 읽기"],
              ["meaning", "한국어 뜻"],
              ["example", "예문"],
              ["exampleMeaning", "예문 해석"],
              ["memo", "개인 메모"],
            ] as const
          ).map(([field, label]) => (
            <label key={field} className="block text-sm font-semibold">
              {label}
              {["japanese", "reading"].includes(field) ? (
                <input
                  className="field mt-2 text-base"
                  required
                  autoFocus={field === "japanese"}
                  disabled={pending}
                  value={form[field]}
                  onChange={(e) =>
                    setForm({ ...form, [field]: e.target.value })
                  }
                />
              ) : (
                <textarea
                  className="field mt-2 resize-y text-base"
                  rows={field === "meaning" || field === "memo" ? 3 : 2}
                  required={field === "meaning"}
                  disabled={pending}
                  value={form[field]}
                  onChange={(e) =>
                    setForm({ ...form, [field]: e.target.value })
                  }
                />
              )}
            </label>
          ))}
          <div className="flex gap-2">
            <button className="btn btn-primary" disabled={pending}>
              {pending ? "저장 중…" : "저장"}
            </button>
            <button
              type="button"
              disabled={pending}
              className="btn"
              onClick={() => {
                setCreating(false);
                setEditing(null);
              }}
            >
              취소
            </button>
          </div>
        </form>
      )}
      {notes.isPending ? (
        <Loading />
      ) : notes.error ? (
        <div className="mt-5">
          <ErrorMessage error={notes.error} />
        </div>
      ) : (
        <>
          <p
            className="mt-5 text-xs font-medium text-muted-foreground"
            role="status"
          >
            {query ? "검색 결과" : "보관한 항목"}{" "}
            {notes.data.totalElements.toLocaleString()}개
          </p>
          <div className="mt-3 grid items-start gap-3 md:grid-cols-2">
            {notes.data.content.length === 0 ? (
              <div className="surface col-span-full p-8 text-center">
                <Search
                  size={24}
                  className="mx-auto mb-3 text-muted-foreground"
                  aria-hidden="true"
                />
                <p className="font-medium">검색 결과가 없습니다.</p>
                <p className="muted mt-2 text-sm">
                  다른 표기·읽기·뜻으로 검색해 보세요.
                </p>
              </div>
            ) : (
              notes.data.content.map((note) => (
                <NoteEntry
                  note={note}
                  key={note.id}
                  onPatch={patch}
                  onEdit={edit}
                  pending={pending}
                  audio={audio}
                  settings={settings.data}
                />
              ))
            )}
          </div>
          <div className="mt-5 flex items-center justify-center gap-3">
            <button
              className="btn"
              disabled={page === 0}
              onClick={() => {
                audio.stop();
                setPage(page - 1);
              }}
            >
              이전
            </button>
            <span className="text-sm">
              {page + 1} / {Math.max(1, notes.data.totalPages)}
            </span>
            <button
              className="btn"
              disabled={page + 1 >= notes.data.totalPages}
              onClick={() => {
                audio.stop();
                setPage(page + 1);
              }}
            >
              다음
            </button>
          </div>
        </>
      )}
    </div>
  );
}
