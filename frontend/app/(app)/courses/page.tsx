"use client";
import Link from "next/link";
import { ArrowRight, BookOpen, Languages } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api, type Course } from "@/api";
import { Loading, ErrorMessage } from "@/shell";
export default function CoursesPage() {
  const query = useQuery({
    queryKey: ["courses"],
    queryFn: () => api<Course[]>("/courses"),
  });
  if (query.isPending) return <Loading />;
  if (query.error) return <ErrorMessage error={query.error} />;
  const introductory = query.data.filter(
    (c) => c.kind === "katakana" || c.kind === "hiragana",
  );
  const beginner = query.data.filter((c) => c.level === "N5");
  const advanced = query.data.filter((c) => c.level && c.level !== "N5");
  function cards(courses: Course[]) {
    return (
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {courses.map((course) => {
          const core = course.lessons.filter((l) => !l.optional);
          const total = core.reduce((n, l) => n + l.totalCards, 0);
          const completed = core.reduce((n, l) => n + l.completedCards, 0);
          const kana = course.kind === "katakana" || course.kind === "hiragana";
          return (
            <article
              key={course.id}
              data-course-kind={course.kind}
              className="surface flex flex-col p-5 transition-colors hover:border-primary/30 sm:p-6"
            >
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                {kana ? (
                  <Languages className="h-5 w-5" aria-hidden="true" />
                ) : (
                  <BookOpen className="h-5 w-5" aria-hidden="true" />
                )}
              </div>
              <p className="text-xs font-semibold text-primary">
                {kana
                  ? "문자 기초"
                  : `${course.level} · ${course.kind === "grammar" ? "문법" : "어휘"}`}
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight">
                {course.title}
              </h2>
              {kana && (
                <p className="jp mt-4 rounded-xl bg-secondary px-4 py-3 text-2xl tracking-wider text-primary">
                  {course.kind === "katakana"
                    ? "ア イ ウ エ オ"
                    : "あ い う え お"}
                </p>
              )}
              <p className="muted mt-4 text-sm">
                {kana
                  ? `기본 ${total}자 + 선택 확장`
                  : `${core.length}개 레슨 · ${total}장`}
              </p>
              <p className="muted mt-2 text-sm">
                첫 연습 {completed}/{total}
                {course.dueCount > 0 && ` · 복습 ${course.dueCount}장`}
              </p>
              <progress
                aria-label={`${course.title} 첫 연습 진행`}
                value={completed}
                max={Math.max(total, 1)}
                className="mt-3 h-2 w-full accent-primary"
              />
              <Link
                className="btn mt-5 w-full justify-between"
                href={`/courses/${course.id}`}
              >
                코스 보기
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </article>
          );
        })}
      </div>
    );
  }
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          학습 코스
        </h1>
        <p className="muted mt-2">
          가타카나부터 시작하고, 히라가나를 익힌 뒤 단어와 문법으로 이어가세요.
        </p>
      </div>
      <section aria-label="문자 기초 코스">
        <h2 className="text-base font-semibold">1. 문자부터 익히기</h2>
        {cards(introductory)}
      </section>
      <section aria-label="기초 일본어 코스">
        <h2 className="text-base font-semibold">2. 기초 단어와 문법</h2>
        {beginner.length ? (
          cards(beginner)
        ) : (
          <p className="surface muted mt-4 p-5">
            개인 계정에 MAX 데이터를 가져오면 기초 코스가 준비됩니다.
          </p>
        )}
      </section>
      {advanced.length > 0 && (
        <details className="surface p-5">
          <summary className="cursor-pointer font-semibold">
            이어서 학습하기 · N4~N1
          </summary>
          {cards(advanced)}
        </details>
      )}
      <p className="muted text-sm">
        첫 연습은 보통·쉬움으로 한 번 이상 평가한 카드 수입니다. 이후에도 복습이
        계속됩니다.
      </p>
    </div>
  );
}
