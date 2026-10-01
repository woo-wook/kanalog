"use client";
import Link from "next/link";
import { ArrowLeft, Check } from "lucide-react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { api, type Course } from "@/api";
import { Loading, ErrorMessage } from "@/shell";
export default function CoursePage() {
  const { id } = useParams<{ id: string }>();
  const query = useQuery({
    queryKey: ["courses", id],
    queryFn: () => api<Course>(`/courses/${id}`),
  });
  if (query.isPending) return <Loading />;
  if (query.error) return <ErrorMessage error={query.error} />;
  const course = query.data;
  const basic = course.lessons.filter((l) => !l.optional),
    optional = course.lessons.filter((l) => l.optional);
  function lessons(items: Course["lessons"]) {
    return (
      <div className="mt-4 grid gap-3">
        {items.map((lesson) => (
          <article
            className="surface flex flex-wrap items-center justify-between gap-4 p-4 sm:p-5"
            key={lesson.id}
            data-lesson-id={lesson.id}
          >
            <div className="flex min-w-0 items-start gap-3">
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-semibold tabular-nums ${lesson.completed ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground"}`}
              >
                {lesson.completed ? (
                  <Check className="h-4 w-4" aria-label="첫 연습 완료" />
                ) : (
                  lesson.position + 1
                )}
              </span>
              <div className="min-w-0">
                <h2 className="font-bold">{lesson.title}</h2>
                <p className="muted mt-2 text-sm">
                  {lesson.totalCards}장 · 첫 연습 {lesson.completedCards}/
                  {lesson.totalCards}
                  {lesson.dueCount > 0 && ` · 복습 ${lesson.dueCount}장`}
                </p>
                {lesson.completed && (
                  <p className="mt-1 text-xs text-primary">
                    첫 연습 완료 · 복습으로 계속 익혀요
                  </p>
                )}
              </div>
            </div>
            <Link
              className={`btn ${lesson.id === course.recommendedLessonId ? "btn-primary" : ""}`}
              href={`/study?lessonId=${lesson.id}`}
            >
              레슨 시작
            </Link>
          </article>
        ))}
      </div>
    );
  }
  return (
    <div>
      <Link
        className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-primary"
        href="/courses"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        학습 코스
      </Link>
      <h1 className="mt-5 text-2xl font-semibold tracking-tight sm:text-3xl">
        {course.title}
      </h1>
      <p className="muted mt-3 leading-relaxed">{course.description}</p>
      <p className="muted mt-2 text-sm">
        순서대로 조금씩 연습하거나 필요한 레슨을 골라 시작할 수 있습니다.
      </p>
      <section className="mt-7">
        <h2 className="text-base font-semibold">
          {optional.length > 0 ? "기본 문자" : "레슨"}
        </h2>
        {lessons(basic)}
      </section>
      {optional.length > 0 && (
        <details className="mt-7">
          <summary className="cursor-pointer font-semibold">
            추가 연습 · 탁음·반탁음·요음
          </summary>
          {lessons(optional)}
        </details>
      )}
    </div>
  );
}
