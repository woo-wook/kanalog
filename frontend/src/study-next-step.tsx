"use client";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api, type Curriculum } from "./api";
import { nextCurriculumLesson, lessonHref } from "./curriculum";
import { ErrorMessage, Loading } from "./shell";

export function StudyNextStep({ lessonId }: { lessonId: string | null }) {
  const query = useQuery({
    queryKey: ["curriculum"],
    queryFn: () => api<Curriculum>("/curriculum"),
  });
  if (query.isPending) return <Loading />;
  if (query.error) return <ErrorMessage error={query.error} />;
  const next = nextCurriculumLesson(query.data);
  if (!next) return null;
  const same = next.lesson.id === lessonId;
  return (
    <section
      className="mt-6 rounded-2xl bg-secondary p-5 text-left"
      aria-label="다음 학습 단계"
    >
      <p className="text-xs font-semibold text-primary">
        {next.level.title} · {next.unit.title}
      </p>
      <h2 className="mt-2 text-lg font-semibold">
        {same ? "지금 레슨을 조금씩 이어가세요" : next.lesson.title}
      </h2>
      {same ? (
        <>
          <p className="muted mt-2 text-sm">
            첫 연습 {next.lesson.completedCards}/{next.lesson.totalCards}장 ·
            일일 한도와 복습 시각에 맞춰 이어갑니다.
          </p>
          <Link className="btn mt-4" href={`/courses/levels/${next.level.key}`}>
            단원 진도 보기
          </Link>
        </>
      ) : (
        <Link className="btn btn-primary mt-4" href={lessonHref(next.lesson)}>
          다음 레슨 학습 <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      )}
    </section>
  );
}
