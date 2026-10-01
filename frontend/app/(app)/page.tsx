"use client";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { api, type Dashboard, type Deck } from "@/api";
import { Loading, ErrorMessage } from "@/shell";
export default function HomePage() {
  const dashboard = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => api<Dashboard>("/dashboard"),
  });
  const decks = useQuery({
    queryKey: ["decks"],
    queryFn: () => api<Deck[]>("/decks"),
  });
  if (dashboard.isPending || decks.isPending) return <Loading />;
  if (dashboard.error || decks.error)
    return <ErrorMessage error={dashboard.error ?? decks.error} />;
  const d = dashboard.data;
  const selected =
    decks.data.find((deck) => deck.id === d.selectedDeckId) ||
    decks.data.find((deck) => deck.selected);
  return (
    <div className="space-y-7">
      <div>
        <p className="text-sm font-semibold text-[#2e7167]">오늘의 학습</p>
        <h1 className="mt-1 text-3xl font-bold">조금씩, 꾸준히</h1>
        <p className="muted mt-2">
          처음이라면 N5 어휘 덱에서 하루 새 카드 5~10장으로 시작하세요.
        </p>
      </div>
      <section
        className="grid grid-cols-2 gap-3 sm:grid-cols-4"
        aria-label="오늘의 학습 현황"
      >
        {[
          ["복습할 카드", d.dueCount],
          ["남은 새 카드", d.newRemaining],
          ["학습한 카드", d.studiedCardsToday],
          ["답변 횟수", d.answersToday],
        ].map(([label, value]) => (
          <div key={label} className="surface p-4">
            <p className="muted text-sm">{label}</p>
            <strong className="mt-3 block text-3xl">{value}</strong>
          </div>
        ))}
      </section>
      <section className="surface p-6">
        <p className="muted text-sm">연속 학습</p>
        <p className="mt-1 text-xl font-bold">{d.streak}일</p>
        <div className="mt-6 border-t pt-5">
          <p className="muted text-sm">선택한 덱</p>
          <h2 className="mt-1 text-xl font-semibold">
            {selected?.title ?? "아직 선택한 덱이 없습니다"}
          </h2>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              className="btn btn-primary"
              href={selected ? `/study?deckId=${selected.id}` : "/decks"}
            >
              {selected ? "학습 시작" : "덱 선택"}
            </Link>
            <Link className="btn" href="/decks">
              덱 살펴보기
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
