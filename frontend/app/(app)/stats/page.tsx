"use client";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { api, type Stats, type Curriculum } from "@/api";
import { Loading, ErrorMessage } from "@/shell";
export default function StatsPage() {
  const query = useQuery({
    queryKey: ["stats"],
    queryFn: () => api<Stats>("/stats"),
  });
  const curriculum = useQuery({
    queryKey: ["curriculum"],
    queryFn: () => api<Curriculum>("/curriculum"),
  });
  if (query.isPending || curriculum.isPending) return <Loading />;
  if (query.error || curriculum.error)
    return <ErrorMessage error={query.error ?? curriculum.error} />;
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
      <p className="text-xs font-semibold text-primary">쌓여가는 학습</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
        학습 통계
      </h1>
      <p className="muted mt-2 text-sm leading-relaxed">
        학습한 카드는 한 번 이상 답변한 카드입니다. 답변 횟수와 구분해
        표시합니다.
      </p>
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {items.map(([label, value]) => (
          <div key={label} className="surface p-4">
            <p className="muted text-sm">{label}</p>
            <strong className="mt-3 block text-2xl font-semibold tabular-nums">
              {value ?? 0}
            </strong>
          </div>
        ))}
      </div>
      <section className="surface mt-6 p-5" aria-label="레벨별 첫 연습 진도">
        <h2 className="text-xl font-semibold tracking-tight">
          레벨별 첫 연습 진도
        </h2>
        <p className="muted mt-2 text-sm">
          기본 레슨에서 보통·쉬움으로 한 번 이상 평가한 카드입니다. 선택 단원과
          복습은 별도로 이어갑니다.
        </p>
        {curriculum.data.levels.length ? (
          <div className="mt-4 space-y-4">
            {curriculum.data.levels.map((level) => (
              <div key={level.key}>
                <div className="flex justify-between gap-3 text-sm">
                  {level.available ? (
                    <Link
                      className="font-medium text-primary"
                      href={`/courses/levels/${level.key}`}
                    >
                      {level.title}
                    </Link>
                  ) : (
                    <span>{level.title}</span>
                  )}
                  <span>
                    {level.available
                      ? `${level.completedCards}/${level.totalCards}장`
                      : "학습 데이터 없음"}
                  </span>
                </div>
                {level.available && (
                  <progress
                    className="mt-2 h-2 w-full"
                    aria-label={`${level.title} 첫 연습 진행`}
                    value={level.completedCards}
                    max={Math.max(level.totalCards, 1)}
                  />
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="muted mt-3">학습 코스가 없습니다.</p>
        )}
      </section>
    </div>
  );
}
