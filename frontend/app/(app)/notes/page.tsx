"use client";
import { FormEvent, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, json, type Note, type Page } from "@/api";
import { Loading, ErrorMessage } from "@/shell";
export default function NotesPage() {
  const client = useQueryClient(),
    [input, setInput] = useState(""),
    [query, setQuery] = useState(""),
    [page, setPage] = useState(0),
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
  const notes = useQuery({
    queryKey: ["notes", query, page],
    queryFn: () =>
      api<Page<Note>>(
        `/notes?query=${encodeURIComponent(query)}&page=${page}&size=20`,
      ),
  });
  function search(e: FormEvent) {
    e.preventDefault();
    setPage(0);
    setQuery(input);
  }
  async function save(e: FormEvent) {
    e.preventDefault();
    setMessage("");
    try {
      if (editing) await api(`/notes/${editing.id}`, json("PATCH", form));
      else await api("/notes", json("POST", form));
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
    }
  }
  function edit(note: Note) {
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
    try {
      await api(`/notes/${note.id}`, json("PATCH", { [field]: !note[field] }));
      client.invalidateQueries({ queryKey: ["notes"] });
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "변경하지 못했습니다.");
    }
  }
  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">단어장</h1>
          <p className="muted mt-2">
            일본어 표기, 가나, 한국어 뜻으로 찾을 수 있습니다.
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => {
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
          내 단어 추가
        </button>
      </div>
      <form onSubmit={search} className="mt-6 flex gap-2">
        <input
          className="field"
          aria-label="단어 검색"
          placeholder="단어·읽기·뜻 검색"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button className="btn btn-primary">검색</button>
      </form>
      {message && (
        <p role="status" className="mt-4 text-sm">
          {message}
        </p>
      )}
      {(creating || editing) && (
        <form onSubmit={save} className="surface mt-5 grid gap-4 p-5">
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
              <input
                className="field mt-2"
                required={["japanese", "reading", "meaning"].includes(field)}
                value={form[field]}
                onChange={(e) => setForm({ ...form, [field]: e.target.value })}
              />
            </label>
          ))}
          <div className="flex gap-2">
            <button className="btn btn-primary">저장</button>
            <button
              type="button"
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
          <div className="mt-5 space-y-3">
            {notes.data.content.length === 0 ? (
              <div className="surface p-6">
                <p>검색 결과가 없습니다.</p>
              </div>
            ) : (
              notes.data.content.map((note) => (
                <article className="surface p-5" key={note.id}>
                  <div className="flex justify-between gap-2">
                    <div>
                      <h2 className="jp text-2xl font-semibold">
                        {note.japanese ?? note.front}
                      </h2>
                      <p className="jp muted mt-1">{note.reading}</p>
                    </div>
                    <button
                      className="text-sm text-[#2e7167]"
                      onClick={() => patch(note, "bookmarked")}
                      aria-label={
                        note.bookmarked ? "북마크 해제" : "북마크 추가"
                      }
                    >
                      {note.bookmarked ? "★" : "☆"}
                    </button>
                  </div>
                  <p className="mt-3 font-semibold">{note.meaning}</p>
                  {note.example && <p className="jp mt-3">{note.example}</p>}
                  {note.exampleMeaning && (
                    <p className="muted mt-1 text-sm">{note.exampleMeaning}</p>
                  )}
                  {note.memo && (
                    <p className="mt-3 rounded-xl bg-[#f4f7f4] p-3 text-sm">
                      {note.memo}
                    </p>
                  )}
                  <div className="mt-4 flex gap-2">
                    {(!note.source || note.source === "PERSONAL") && (
                      <button className="btn" onClick={() => edit(note)}>
                        수정
                      </button>
                    )}
                    <button
                      className="btn"
                      onClick={() => patch(note, "excluded")}
                    >
                      {note.excluded ? "학습 재개" : "학습에서 제외"}
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>
          <div className="mt-5 flex items-center justify-center gap-3">
            <button
              className="btn"
              disabled={page === 0}
              onClick={() => setPage(page - 1)}
            >
              이전
            </button>
            <span className="text-sm">
              {page + 1} / {Math.max(1, notes.data.totalPages)}
            </span>
            <button
              className="btn"
              disabled={page + 1 >= notes.data.totalPages}
              onClick={() => setPage(page + 1)}
            >
              다음
            </button>
          </div>
        </>
      )}
    </div>
  );
}
