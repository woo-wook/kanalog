"use client";
import { useQuery } from "@tanstack/react-query";
import { api, type Stats } from "@/api";
import { Loading, ErrorMessage } from "@/shell";
export default function StatsPage() {
  const query = useQuery({
    queryKey: ["stats"],
    queryFn: () => api<Stats>("/stats"),
  });
  if (query.isPending) return <Loading />;
  if (query.error) return <ErrorMessage error={query.error} />;
  const s = query.data;
  const items = [
    ["최근 7일 답변", s.answers7Days],
    ["최근 7일 고유 카드", s.uniqueCards7Days],
    ["최근 30일 답변", s.answers30Days],
    ["최근 30일 고유 카드", s.uniqueCards30Days],
    ["한 번 이상 학습한 카드", s.learnedCards],
    ["미학습 카드", s.unseenCards],
    ["복습 예정 카드", s.dueCount],
    ["연속 학습일", s.streak],
  ];
  return (
    <div>
      <h1 className="text-3xl font-bold">학습 통계</h1>
      <p className="muted mt-2">
        학습한 카드는 한 번 이상 답변한 카드입니다. 답변 횟수와 구분해
        표시합니다.
      </p>
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {items.map(([label, value]) => (
          <div key={label} className="surface p-4">
            <p className="muted text-sm">{label}</p>
            <strong className="mt-3 block text-2xl">{value ?? 0}</strong>
          </div>
        ))}
      </div>
      <section className="surface mt-6 p-5">
        <h2 className="text-xl font-bold">덱별 진행</h2>
        {s.decks?.length ? (
          <div className="mt-4 space-y-4">
            {s.decks.map((deck) => (
              <div key={deck.deckId}>
                <div className="flex justify-between gap-3 text-sm">
                  <span>{deck.title}</span>
                  <span>
                    {deck.studiedCards}/{deck.totalCards}장
                  </span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#e8efeb]">
                  <div
                    className="h-full bg-[#2e7167]"
                    style={{
                      width: `${deck.totalCards ? Math.min(100, (deck.studiedCards / deck.totalCards) * 100) : 0}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="muted mt-3">학습한 덱이 없습니다.</p>
        )}
      </section>
    </div>
  );
}
