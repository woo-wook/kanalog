"use client";
import Link from "next/link";
import { ArrowRight, BookOpen, CalendarDays, Repeat2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api, type Dashboard, type Course } from "@/api";
import { recommendLesson } from "@/courses";
import { Loading, ErrorMessage } from "@/shell";
export default function HomePage() {
  const dashboard = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => api<Dashboard>("/dashboard"),
  });
  const courses = useQuery({
    queryKey: ["courses"],
    queryFn: () => api<Course[]>("/courses"),
  });
  if (dashboard.isPending || courses.isPending) return <Loading />;
  if (dashboard.error || courses.error)
    return <ErrorMessage error={dashboard.error ?? courses.error} />;
  const d = dashboard.data;
  const next = recommendLesson(courses.data, d.activeLessonId);
  const due = courses.data.flatMap((course) =>
    course.lessons
      .filter((l) => l.dueCount > 0)
      .map((lesson) => ({ course, lesson })),
  );
  const dueCount = due.reduce((sum, item) => sum + item.lesson.dueCount, 0);
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold text-primary">오늘의 학습</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
          문자부터 차근차근
        </h1>
        <p className="muted mt-2">
          가타카나 → 히라가나 → 기초 단어와 문법. 작은 레슨으로 하나씩 익혀요.
        </p>
      </div>
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
            <p className="muted text-sm">{label}</p>
            <strong className="mt-3 block text-3xl font-semibold tabular-nums">
              {value}
            </strong>
          </div>
        ))}
      </section>
      <section className="surface overflow-hidden p-5 sm:p-7">
        <div className="mb-5 flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <BookOpen className="h-4 w-4" aria-hidden="true" />
          </span>
          오늘 한 걸음
        </div>
        <p className="text-sm font-semibold text-primary">
          {next?.lesson.studiedCards ? "이어서 연습" : "추천 레슨"}
        </p>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight">
          {next?.course.title ?? "학습 코스를 준비하고 있습니다"}
        </h2>
        {next && (
          <>
            <p className="mt-2 text-base font-medium">{next.lesson.title}</p>
            <progress
              className="mt-5 h-2 w-full"
              aria-label="추천 레슨 첫 연습 진행"
              value={next.lesson.completedCards}
              max={Math.max(next.lesson.totalCards, 1)}
            />
            <p className="muted mt-2 text-sm">
              이번 레슨 {next.lesson.totalCards}장 · 첫 연습{" "}
              {next.lesson.completedCards}/{next.lesson.totalCards}
            </p>
          </>
        )}
        <div className="mt-6 flex flex-wrap gap-3">
          {next && (
            <Link
              className="btn btn-primary"
              href={`/study?lessonId=${next.lesson.id}`}
            >
              {next.lesson.studiedCards ? "이어서 학습" : "레슨 시작"}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          )}
          <Link className="btn" href="/courses">
            전체 코스 보기
          </Link>
        </div>
        <p className="muted mt-5 flex items-start gap-2 border-t border-border pt-4 text-xs leading-relaxed">
          <CalendarDays
            className="mt-0.5 h-3.5 w-3.5 shrink-0"
            aria-hidden="true"
          />
          하루 새 카드 한도는 모든 코스에 함께 적용됩니다. 연속 학습 {d.streak}
          일
        </p>
      </section>
      {due.length > 0 && (
        <section className="surface p-6">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <Repeat2 className="h-4 w-4 text-primary" aria-hidden="true" />
            복습이 있는 레슨
          </h2>
          <div className="mt-4 space-y-3">
            {due.slice(0, 4).map(({ course, lesson }) => (
              <Link
                className="flex items-center justify-between gap-3 rounded-xl bg-secondary p-4"
                key={lesson.id}
                href={`/study?lessonId=${lesson.id}`}
              >
                <span>
                  {course.title} · {lesson.title}
                </span>
                <span className="shrink-0 text-sm text-primary">
                  {lesson.dueCount}장 복습
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
