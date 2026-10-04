"use client";
import Link from "next/link";
import { ArrowRight, CalendarDays, Repeat2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api, type Dashboard, type Curriculum } from "@/api";
import { nextCurriculumLesson, lessonHref } from "@/curriculum";
import { PracticeLauncher } from "@/practice-launcher";
import { Loading, ErrorMessage } from "@/shell";

export default function HomePage() {
  const dashboard = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => api<Dashboard>("/dashboard"),
  });
  const curriculum = useQuery({
    queryKey: ["curriculum"],
    queryFn: () => api<Curriculum>("/curriculum"),
  });
  if (dashboard.isPending || curriculum.isPending) return <Loading />;
  if (dashboard.error || curriculum.error)
    return <ErrorMessage error={dashboard.error ?? curriculum.error} />;
  const d = dashboard.data;
  const next = nextCurriculumLesson(curriculum.data);
  const due = curriculum.data.levels.flatMap((level) =>
    level.units.flatMap((unit) =>
      unit.lessons
        .filter((lesson) => lesson.dueCount > 0)
        .map((lesson) => ({ level, unit, lesson })),
    ),
  );
  const dueCount = d.dueCount;
  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold text-primary">나의 일본어 여정</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
          오늘도 한 레슨씩
        </h1>
        <p className="muted mt-2 text-sm">
          내 레벨 전체 연습과 단계별 코스를 함께 이어가세요.
        </p>
      </header>
      <PracticeLauncher dueCount={d.dueCount} />
      <section
        className="surface overflow-hidden"
        aria-label="이어서 학습할 단계"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-primary/5 px-5 py-4 sm:px-7">
          <p className="text-sm font-semibold text-primary">
            {next ? `LEVEL ${next.level.position + 1}` : "학습 커리큘럼"}
          </p>
          {next && (
            <Link
              className="text-sm font-medium text-primary"
              href={`/courses/levels/${next.level.key}`}
            >
              레벨 진도 보기 →
            </Link>
          )}
        </div>
        <div className="p-5 sm:p-7">
          {next ? (
            <>
              <p className="text-sm font-semibold text-primary">
                {next.level.title}
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight">
                {next.level.subtitle}
              </h2>
              <p className="muted mt-3 text-sm leading-relaxed">
                {next.level.goal}
              </p>
              <div className="mt-6 rounded-2xl bg-secondary p-4 sm:p-5">
                <p className="text-xs font-semibold text-muted-foreground">
                  {next.unit.optional
                    ? "선택 단원"
                    : `단원 ${next.unit.position + 1}`}{" "}
                  · {next.unit.title}
                </p>
                <h3 className="mt-2 text-lg font-semibold">
                  {next.lesson.title}
                </h3>
                <progress
                  className="mt-4 h-2 w-full"
                  aria-label="현재 단원 첫 연습 진행"
                  value={next.unit.completedCards}
                  max={Math.max(next.unit.totalCards, 1)}
                />
                <p className="muted mt-2 text-xs">
                  첫 연습 {next.unit.completedCards}/{next.unit.totalCards}장 ·
                  레슨 {next.unit.completedLessons}/
                  {next.unit.lessons.filter((l) => l.totalCards > 0).length}개
                </p>
                <Link
                  className="btn btn-primary mt-5 w-full justify-center sm:w-auto"
                  href={lessonHref(next.lesson)}
                >
                  {next.lesson.dueCount > 0 && next.lesson.completed
                    ? "복습 이어가기"
                    : next.lesson.studiedCards
                      ? "이어서 학습"
                      : "레슨 시작"}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            </>
          ) : (
            <>
              <h2 className="text-xl font-semibold">
                다음 학습 경로를 살펴보세요
              </h2>
              <p className="muted mt-3 text-sm">
                가져온 학습 데이터와 완료한 레슨을 기준으로 단계가 표시됩니다.
              </p>
            </>
          )}
          <Link
            className="mt-5 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-primary"
            href="/courses"
          >
            전체 레벨과 커리큘럼{" "}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </section>
      <section
        className="grid grid-cols-2 gap-3 sm:grid-cols-4"
        aria-label="오늘의 학습 현황"
      >
        {[
          ["복습할 카드", dueCount],
          ["오늘 남은 새 카드", d.dailyNewRemaining ?? d.newRemaining],
          ["학습한 카드", d.studiedCardsToday],
          ["답변 횟수", d.answersToday],
        ].map(([label, value]) => (
          <div key={label} className="surface p-4 sm:p-5">
            <p className="muted text-xs sm:text-sm">{label}</p>
            <strong className="mt-3 block text-2xl font-semibold tabular-nums">
              {value}
            </strong>
          </div>
        ))}
      </section>
      {due.length > 0 && (
        <section className="surface p-5 sm:p-6">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <Repeat2 className="h-4 w-4 text-primary" aria-hidden="true" />
            기억을 다시 꺼내는 시간
          </h2>
          <div className="mt-4 space-y-3">
            {due.slice(0, 4).map(({ level, lesson }) => (
              <Link
                className="flex items-center justify-between gap-3 rounded-xl bg-secondary p-4"
                key={lesson.id}
                href={lessonHref(lesson)}
              >
                <span className="min-w-0 text-sm">
                  <span className="muted block text-xs">{level.title}</span>
                  {lesson.title}
                </span>
                <span className="shrink-0 text-xs font-semibold text-primary">
                  {lesson.dueCount}장 복습
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}
      <p className="muted flex items-start gap-2 text-xs leading-relaxed">
        <CalendarDays
          className="mt-0.5 h-3.5 w-3.5 shrink-0"
          aria-hidden="true"
        />
        하루 새 카드 한도는 모든 레벨에 함께 적용됩니다. 연속 학습 {d.streak}일
      </p>
    </div>
  );
}
