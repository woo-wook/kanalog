import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { CurriculumLevel } from "./api";

export function KanaCourses({ level }: { level: CurriculumLevel }) {
  return (
    <section aria-label="가나 학습 코스" className="grid gap-3 sm:grid-cols-2">
      {["hiragana", "katakana"].map((kind) => {
        const lessons = level.units
          .flatMap((u) => u.lessons)
          .filter((l) => l.kind === kind);
        const courseId = lessons[0]?.courseId;
        if (!courseId) return null;
        const title = kind === "hiragana" ? "히라가나" : "가타카나";
        const basic = lessons.filter((l) => !l.optional);
        const total = basic.reduce((n, l) => n + l.totalCards, 0);
        const completed = basic.reduce((n, l) => n + l.completedCards, 0);
        const retry = lessons.reduce((n, l) => n + l.dueCount, 0);
        return (
          <article key={kind} className="surface min-w-0 p-5 sm:p-6">
            <p
              className="jp text-4xl font-semibold text-primary"
              aria-hidden="true"
            >
              {kind === "hiragana" ? "あ" : "ア"}
            </p>
            <h2 className="mt-4 text-xl font-semibold">{title}</h2>
            <p className="muted mt-2 text-sm">
              행 구분 없이 전체 연습 · 포함할 분류만 선택
            </p>
            <p className="muted mt-4 text-xs">
              기본 문자 첫 연습 {completed}/{total}개
              {retry > 0 && ` · 다시 연습 ${retry}개`}
            </p>
            <progress
              aria-label={`${title} 첫 연습 진행`}
              value={completed}
              max={Math.max(total, 1)}
              className="mt-2 h-2 w-full"
            />
            <Link
              href={`/courses/${courseId}`}
              className="btn btn-primary mt-5 w-full"
              aria-label={`${title} 연습`}
            >
              연습하기 <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </article>
        );
      })}
    </section>
  );
}
