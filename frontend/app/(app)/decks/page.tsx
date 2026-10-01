"use client";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type Deck } from "@/api";
import { Loading, ErrorMessage } from "@/shell";
export default function DecksPage() {
  const client = useQueryClient(),
    decks = useQuery({
      queryKey: ["decks"],
      queryFn: () => api<Deck[]>("/decks"),
    });
  const select = useMutation({
    mutationFn: (id: string) => api(`/decks/${id}/select`, { method: "POST" }),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["decks"] });
      client.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
  return (
    <div>
      <h1 className="text-3xl font-bold">내 덱</h1>
      <p className="muted mt-2">선택한 덱의 카드만 새 학습에 추가됩니다.</p>
      {decks.isPending ? (
        <Loading />
      ) : decks.error ? (
        <ErrorMessage error={decks.error} />
      ) : decks.data.length === 0 ? (
        <div className="surface mt-6 p-6">
          <p>아직 가져온 덱이 없습니다.</p>
          <p className="muted mt-2 text-sm">
            관리자 CLI로 JLPT MAX 덱을 가져오면 여기에 표시됩니다.
          </p>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {decks.data.map((deck) => (
            <article key={deck.id} className="surface p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold text-[#2e7167]">
                    {deck.level || "급수 미지정"} ·{" "}
                    {deck.kind?.toLowerCase() === "grammar" ? "문법" : "어휘"}
                  </p>
                  <h2 className="mt-1 text-xl font-bold">{deck.title}</h2>
                </div>
                {deck.selected && (
                  <span className="rounded-full bg-[#e8f2ed] px-3 py-1 text-xs font-semibold text-[#205d51]">
                    선택됨
                  </span>
                )}
              </div>
              <p className="muted mt-4 text-sm">
                학습 카드 {deck.totalCards}장 · 학습함 {deck.studiedCards}장 ·
                미학습 {deck.unseenCards}장
              </p>
              <div className="mt-5 flex gap-2">
                <button
                  className="btn"
                  disabled={select.isPending || deck.selected}
                  onClick={() => select.mutate(deck.id)}
                >
                  {deck.selected ? "선택됨" : "이 덱 선택"}
                </button>
                <Link
                  className="btn btn-primary"
                  href={`/study?deckId=${deck.id}`}
                >
                  학습
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
      {select.error && (
        <div className="mt-4">
          <ErrorMessage error={select.error} />
        </div>
      )}
    </div>
  );
}
