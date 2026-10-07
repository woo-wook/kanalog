import Link from "next/link";
import { ArrowRight, Check, ChevronRight } from "lucide-react";
import type { CurriculumLevel, CurriculumUnit } from "./api";

export function LevelSelector({
  levels,
  selectedKey,
}: {
  levels: CurriculumLevel[];
  selectedKey: string;
}) {
  return (
    <nav
      aria-label="커리큘럼 레벨 선택"
      className="flex max-w-full gap-2 overflow-x-auto pb-3"
    >
      {levels.map((level) => {
        const classes = `flex min-h-12 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-semibold ${level.key === selectedKey ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground hover:border-primary/40"}`;
        const content = (
          <>
            <span className="text-xs opacity-80">
              {String(level.position + 1).padStart(2, "0")}
            </span>
            {level.title}
          </>
        );
        return level.available ? (
          <Link
            key={level.key}
            href={`/courses/levels/${level.key}`}
            aria-current={level.key === selectedKey ? "page" : undefined}
            className={classes}
          >
            {content}
          </Link>
        ) : (
          <span
            key={level.key}
            aria-disabled="true"
            className={`${classes} opacity-60`}
            title="아직 가져온 학습 데이터가 없어요"
          >
            {content}
          </span>
        );
      })}
    </nav>
  );
}

export function LevelJourney({
  levels,
  recommendedKey,
}: {
  levels: CurriculumLevel[];
  recommendedKey?: string | null;
}) {
  return (
    <ol
      aria-label="왕초보부터 고급까지 학습 단계"
      className="grid min-w-0 gap-3"
    >
      {levels.map((level) => {
        const current = level.key === recommendedKey;
        return (
          <li key={level.key} className="min-w-0" data-level-key={level.key}>
            <article
              aria-label={`${level.title} 레벨`}
              className={`surface min-w-0 overflow-hidden p-5 sm:p-6 ${current ? "border-primary/35" : ""}`}
            >
              <div className="flex min-w-0 items-start gap-4">
                <span
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-sm font-semibold tabular-nums ${current || level.completed ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground"}`}
                >
                  {level.completed ? (
                    <Check className="h-5 w-5" aria-label="첫 연습 완료" />
                  ) : (
                    String(level.position + 1).padStart(2, "0")
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <h3 className="text-lg font-semibold tracking-tight">
                      {level.title}
                    </h3>
                    <span className="muted text-xs">
                      {level.jlptLevel ?? "문자 기초"}
                    </span>
                    {current && (
                      <span className="text-xs font-medium text-primary">
                        이어서 학습할 단계
                      </span>
                    )}
                  </div>
                  <p className="muted mt-1 text-sm">{level.subtitle}</p>
                  <p className="mt-3 text-sm leading-relaxed">{level.goal}</p>
                  {level.available ? (
                    <>
                      <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
                        <p className="muted text-xs sm:text-sm">
                          첫 연습 {level.completedCards}/{level.totalCards}장 ·
                          레슨 {level.completedLessons}/{level.totalLessons}개
                        </p>
                        <Link
                          href={`/courses/levels/${level.key}`}
                          aria-label={`${level.title} 코스 보기`}
                          className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-primary"
                        >
                          코스 보기{" "}
                          <ChevronRight
                            className="h-4 w-4"
                            aria-hidden="true"
                          />
                        </Link>
                      </div>
                      <progress
                        aria-label={`${level.title} 첫 연습 진행`}
                        value={level.completedCards}
                        max={Math.max(level.totalCards, 1)}
                        className="mt-2 h-1.5 w-full"
                      />
                    </>
                  ) : (
                    <p className="muted mt-4 text-sm">
                      아직 가져온 학습 데이터가 없어요
                    </p>
                  )}
                </div>
              </div>
            </article>
          </li>
        );
      })}
    </ol>
  );
}

export function UnitPath({
  unit,
  number,
  currentLessonId,
  openOptional = false,
}: {
  unit: CurriculumUnit;
  number: number;
  currentLessonId?: string | null;
  openOptional?: boolean;
}) {
  const content = (
    <section
      aria-label={`단원 ${number} · ${unit.title}`}
      className="surface min-w-0 overflow-hidden p-5 sm:p-6"
      data-unit-key={unit.key}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-primary">
            {unit.optional
              ? "선택 연습"
              : `단원 ${String(number).padStart(2, "0")}`}
          </p>
          <h2 className="mt-2 text-lg font-semibold tracking-tight">
            {unit.title}
          </h2>
          <p className="muted mt-2 text-sm leading-relaxed">{unit.goal}</p>
        </div>
        <span className="muted shrink-0 pt-1 text-xs tabular-nums">
          {unit.completedLessons}/
          {unit.lessons.filter((l) => l.totalCards > 0).length} 레슨
        </span>
      </div>
      <ol aria-label={`${unit.title} 레슨 순서`} className="mt-5">
        {unit.lessons
          .filter((lesson) => lesson.totalCards > 0)
          .map((lesson, index, lessons) => {
            const current = lesson.id === currentLessonId;
            const repeat = lesson.completed && lesson.dueCount === 0;
            const action = repeat
              ? "다시 연습"
              : current
                ? "이어서 학습"
                : lesson.completed
                  ? "복습하기"
                  : "레슨 시작";
            return (
              <li
                key={lesson.id}
                className="relative flex min-w-0 gap-3 pb-4 last:pb-0"
                data-lesson-id={lesson.id}
              >
                {index < lessons.length - 1 && (
                  <div
                    aria-hidden="true"
                    className="absolute bottom-0 left-[17px] top-9 w-px bg-border"
                  />
                )}
                <span
                  className={`relative z-10 mt-3 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-xs font-semibold ${current ? "border-primary bg-primary text-primary-foreground" : lesson.completed ? "border-primary/20 bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground"}`}
                >
                  {lesson.completed ? (
                    <Check className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    index + 1
                  )}
                </span>
                <Link
                  href={`/study?lessonId=${lesson.id}${repeat ? "&practice=1" : ""}`}
                  aria-label={`${lesson.title} · ${action}`}
                  aria-current={current ? "step" : undefined}
                  className={`min-w-0 flex-1 rounded-2xl border p-4 transition-colors hover:border-primary/40 ${current ? "border-primary/30 bg-primary/5" : "border-transparent bg-secondary/60"}`}
                >
                  <div className="flex min-w-0 items-start justify-between gap-2">
                    <div className="min-w-0">
                      {current && (
                        <p className="mb-1 text-xs font-semibold text-primary">
                          지금 학습할 레슨
                        </p>
                      )}
                      <h3 className="break-words text-sm font-semibold sm:text-base">
                        {lesson.title}
                      </h3>
                      <p className="muted mt-2 text-xs leading-relaxed">
                        {lesson.totalCards}장 · 첫 연습 {lesson.completedCards}/
                        {lesson.totalCards}
                      </p>
                      {lesson.completed ? (
                        <p className="mt-1 text-xs text-primary">
                          첫 연습 완료
                          {lesson.dueCount > 0
                            ? ` · 복습 ${lesson.dueCount}장`
                            : " · 지금 다시 연습할 수 있어요"}
                        </p>
                      ) : (
                        lesson.dueCount > 0 && (
                          <p className="muted mt-1 text-xs">
                            복습 {lesson.dueCount}장
                          </p>
                        )
                      )}
                    </div>
                    <ArrowRight
                      className={`mt-1 h-4 w-4 shrink-0 ${current ? "text-primary" : "text-muted-foreground"}`}
                      aria-hidden="true"
                    />
                  </div>
                  <p
                    className={`mt-3 text-xs font-semibold ${current ? "text-primary" : "text-muted-foreground"}`}
                  >
                    {action}
                  </p>
                </Link>
              </li>
            );
          })}
      </ol>
    </section>
  );
  return unit.optional ? (
    <details className="min-w-0" open={openOptional}>
      <summary className="min-h-11 cursor-pointer py-3 text-sm font-semibold">
        선택 연습 · {unit.title}
      </summary>
      <div className="mt-2">{content}</div>
    </details>
  ) : (
    content
  );
}

export function UnitJourney({
  units,
  currentLessonId,
}: {
  units: CurriculumUnit[];
  currentLessonId?: string | null;
}) {
  const recommended = units.find((unit) =>
    unit.lessons.some(
      (lesson) => lesson.id === currentLessonId && lesson.totalCards > 0,
    ),
  );
  const core = units.filter((unit) => !unit.optional && unit.totalCards > 0);
  const expanded =
    recommended ?? core.find((unit) => !unit.completed) ?? core[0];
  return (
    <div className="space-y-4">
      {units.map((unit, index) => {
        const path = (
          <UnitPath
            unit={unit}
            number={index + 1}
            currentLessonId={currentLessonId}
            openOptional={unit.key === recommended?.key}
          />
        );
        if (unit.optional || unit.key === expanded?.key)
          return <div key={unit.key}>{path}</div>;
        const total = unit.lessons.filter(
          (lesson) => lesson.totalCards > 0,
        ).length;
        return (
          <details key={unit.key} className="surface min-w-0 overflow-hidden">
            <summary className="min-h-16 cursor-pointer px-5 py-4 sm:px-6">
              <span className="ml-1 text-xs font-semibold text-primary">
                단원 {String(index + 1).padStart(2, "0")}
              </span>
              <span className="ml-3 text-sm font-semibold">{unit.title}</span>
              <span className="muted mt-2 block text-xs">
                레슨 {unit.completedLessons}/{total}개
              </span>
              {unit.completed && (
                <span className="mt-1 block text-xs text-primary">
                  첫 연습 완료
                </span>
              )}
            </summary>
            {path}
          </details>
        );
      })}
    </div>
  );
}
