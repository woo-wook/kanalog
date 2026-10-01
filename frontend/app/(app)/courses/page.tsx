"use client";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api, type Curriculum } from "@/api";
import { nextCurriculumLesson } from "@/curriculum";
import { LevelJourney } from "@/curriculum-ui";
import { Loading, ErrorMessage } from "@/shell";

export default function CoursesPage() {
  const query = useQuery({
    queryKey: ["curriculum"],
    queryFn: () => api<Curriculum>("/curriculum"),
  });
  if (query.isPending) return <Loading />;
  if (query.error) return <ErrorMessage error={query.error} />;
  const next = nextCurriculumLesson(query.data);
  return (
    <div className="mx-auto min-w-0 max-w-3xl space-y-7">
      <header>
        <p className="text-xs font-semibold tracking-wide text-primary">
          나의 일본어 커리큘럼
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
          학습 코스
        </h1>
        <p className="muted mt-3 text-sm leading-relaxed">
          문자 읽기부터 고급 어휘와 문법까지, 작은 레슨을 하나씩 이어가세요.
        </p>
      </header>
      {next && (
        <section
          aria-label="이어서 학습"
          className="surface overflow-hidden border-primary/20 bg-primary/5 p-5 sm:p-6"
        >
          <p className="text-xs font-semibold text-primary">
            {next.level.title} · {next.unit.title}
          </p>
          <h2 className="mt-3 text-xl font-semibold tracking-tight">
            {next.lesson.title}
          </h2>
          <p className="muted mt-2 text-sm">
            {next.lesson.totalCards}장 · 첫 연습 {next.lesson.completedCards}/
            {next.lesson.totalCards}
          </p>
          <Link
            href={`/study?lessonId=${next.lesson.id}`}
            className="btn btn-primary mt-5 w-full sm:w-auto"
          >
            이어서 학습 <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </section>
      )}
      <section aria-label="전체 학습 단계">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold">왕초보부터 고급까지</h2>
          <span className="muted text-xs">
            {query.data.levels.length}개 레벨
          </span>
        </div>
        <LevelJourney
          levels={query.data.levels}
          recommendedKey={query.data.recommendedLevelKey}
        />
      </section>
      <p className="muted text-xs leading-relaxed">
        첫 연습은 보통·쉬움으로 한 번 이상 평가한 카드 수입니다. 첫 연습을 마친
        뒤에도 복습으로 계속 익혀요. 원하는 레벨과 레슨을 자유롭게 선택할 수
        있습니다.
      </p>
    </div>
  );
}
