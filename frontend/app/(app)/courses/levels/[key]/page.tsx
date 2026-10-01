"use client";
import Link from "next/link";
import { ArrowLeft, Check } from "lucide-react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { api, type Curriculum } from "@/api";
import { LevelSelector, UnitJourney } from "@/curriculum-ui";
import { Loading, ErrorMessage } from "@/shell";

export default function CurriculumLevelPage() {
  const { key } = useParams<{ key: string }>();
  const query = useQuery({
    queryKey: ["curriculum"],
    queryFn: () => api<Curriculum>("/curriculum"),
  });
  if (query.isPending) return <Loading />;
  if (query.error) return <ErrorMessage error={query.error} />;
  const level = query.data.levels.find((level) => level.key === key);
  return (
    <div className="mx-auto min-w-0 max-w-3xl space-y-5">
      <Link
        href="/courses"
        className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-primary"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        학습 코스
      </Link>
      <LevelSelector levels={query.data.levels} selectedKey={key} />
      {level ? (
        <>
          <header className="surface min-w-0 p-5 sm:p-6">
            <p className="text-xs font-semibold text-primary">
              레벨 {String(level.position + 1).padStart(2, "0")} ·{" "}
              {level.jlptLevel ?? "문자 기초"}
            </p>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
              {level.title}
            </h1>
            <p className="muted mt-2 text-sm">{level.subtitle}</p>
            <p className="mt-5 font-medium leading-relaxed">{level.goal}</p>
            <ul aria-label="이 레벨에서 연습할 내용" className="mt-3 space-y-2">
              {level.outcomes.map((outcome) => (
                <li
                  key={outcome}
                  className="muted flex items-start gap-2 text-sm leading-relaxed"
                >
                  <Check
                    className="mt-0.5 h-4 w-4 shrink-0 text-primary"
                    aria-hidden="true"
                  />
                  {outcome}
                </li>
              ))}
            </ul>
            {level.available && (
              <div className="mt-5 border-t border-border pt-4">
                <p className="muted text-xs sm:text-sm">
                  첫 연습 {level.completedCards}/{level.totalCards}장 · 레슨{" "}
                  {level.completedLessons}/{level.totalLessons}개
                  {level.dueCount > 0 && ` · 복습 ${level.dueCount}장`}
                </p>
                <progress
                  aria-label={`${level.title} 첫 연습 진행`}
                  value={level.completedCards}
                  max={Math.max(level.totalCards, 1)}
                  className="mt-3 h-2 w-full"
                />
              </div>
            )}
          </header>
          {level.available ? (
            <section
              aria-label={`${level.title} 학습 경로`}
              className="space-y-4"
            >
              <UnitJourney
                key={level.key}
                units={level.units}
                currentLessonId={query.data.recommendedLessonId}
              />
              <p className="muted px-1 text-xs leading-relaxed">
                첫 연습은 보통·쉬움으로 한 번 이상 평가한 기록입니다. 원하는
                레슨부터 시작하거나 마친 레슨을 복습할 수 있어요.
              </p>
            </section>
          ) : (
            <div className="surface p-6">
              <h2 className="font-semibold">
                아직 가져온 학습 데이터가 없어요
              </h2>
              <p className="muted mt-2 text-sm leading-relaxed">
                개인 계정에 해당 급수의 MAX 데이터를 가져오면 어휘와 문법 레슨이
                여기에 연결됩니다.
              </p>
            </div>
          )}
        </>
      ) : (
        <div className="surface p-6">
          <h1 className="text-xl font-semibold">찾을 수 없는 레벨이에요</h1>
          <p className="muted mt-2 text-sm">
            위에서 학습할 레벨을 선택해 주세요.
          </p>
        </div>
      )}
    </div>
  );
}
