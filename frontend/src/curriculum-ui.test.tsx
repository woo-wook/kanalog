import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import userEvent from "@testing-library/user-event";
import type { CurriculumLevel, CurriculumUnit } from "./api";
import {
  LevelJourney,
  LevelSelector,
  UnitJourney,
  UnitPath,
} from "./curriculum-ui";

afterEach(cleanup);
const unit: CurriculumUnit = {
  key: "first",
  title: "가타카나 첫걸음",
  goal: "다섯 소리씩 읽어요",
  position: 0,
  optional: false,
  totalCards: 10,
  studiedCards: 5,
  completedCards: 5,
  completedLessons: 1,
  completed: false,
  lessons: [
    {
      id: "done",
      title: "아행",
      courseId: "kana",
      kind: "katakana",
      position: 0,
      optional: false,
      totalCards: 5,
      studiedCards: 5,
      completedCards: 5,
      dueCount: 2,
      selected: false,
      completed: true,
    },
    {
      id: "current",
      title: "카행",
      courseId: "kana",
      kind: "katakana",
      position: 1,
      optional: false,
      totalCards: 5,
      studiedCards: 0,
      completedCards: 0,
      dueCount: 0,
      selected: true,
      completed: false,
    },
  ],
};
const level: CurriculumLevel = {
  key: "starter",
  title: "왕초보",
  subtitle: "문자부터 차근차근",
  jlptLevel: null,
  position: 0,
  goal: "일본어 문자를 읽어요",
  outcomes: ["가타카나 읽기"],
  units: [unit],
  totalCards: 10,
  studiedCards: 5,
  completedCards: 5,
  totalLessons: 2,
  completedLessons: 1,
  dueCount: 2,
  available: true,
  completed: false,
};

it("shows truthful level progress and navigable levels without invented locks", () => {
  render(
    <LevelJourney
      levels={[
        level,
        {
          ...level,
          key: "n5",
          title: "입문",
          position: 1,
          available: false,
          totalCards: 0,
          totalLessons: 0,
        },
      ]}
      recommendedKey="starter"
    />,
  );
  expect(
    screen.getByRole("link", { name: /왕초보.*코스 보기/ }),
  ).toHaveAttribute("href", "/courses/levels/starter");
  expect(
    screen.getByRole("progressbar", { name: "왕초보 첫 연습 진행" }),
  ).toHaveAttribute("value", "5");
  expect(screen.getByText("첫 연습 5/10장 · 레슨 1/2개")).toBeVisible();
  expect(screen.getByText("아직 가져온 학습 데이터가 없어요")).toBeVisible();
  expect(
    screen.queryByRole("link", { name: /입문.*코스 보기/ }),
  ).not.toBeInTheDocument();
});
it("labels the selected level and keeps the complete curriculum visible", () => {
  render(
    <LevelSelector
      levels={[level, { ...level, key: "n5", title: "입문", position: 1 }]}
      selectedKey="starter"
    />,
  );
  expect(screen.getByRole("link", { name: /왕초보/ })).toHaveAttribute(
    "aria-current",
    "page",
  );
  expect(screen.getByRole("link", { name: /입문/ })).toHaveAttribute(
    "href",
    "/courses/levels/n5",
  );
});
it("shows an unavailable level in the selector without a dead navigation control", () => {
  render(
    <LevelSelector
      levels={[
        level,
        { ...level, key: "n1", title: "고급", position: 5, available: false },
      ]}
      selectedKey="starter"
    />,
  );
  expect(screen.getByText("고급")).toHaveAttribute("aria-disabled", "true");
  expect(screen.queryByRole("link", { name: /고급/ })).not.toBeInTheDocument();
});
it("shows the current step, finished first practice and real review counts", () => {
  render(<UnitPath unit={unit} number={1} currentLessonId="current" />);
  const panel = screen.getByRole("region", {
    name: "단원 1 · 가타카나 첫걸음",
  });
  expect(
    within(panel).getByRole("link", { name: /카행.*이어서 학습/ }),
  ).toHaveAttribute("href", "/study?lessonId=current");
  expect(within(panel).getByText("지금 학습할 레슨")).toBeVisible();
  expect(within(panel).getByText("첫 연습 완료 · 복습 2장")).toBeVisible();
  expect(
    within(panel).getByRole("link", { name: /아행.*복습하기/ }),
  ).toHaveAttribute("href", "/study?lessonId=done");
});
it("keeps optional units in an honest separate disclosure and excludes empty lessons", () => {
  render(
    <UnitPath unit={{ ...unit, optional: true, lessons: [] }} number={2} />,
  );
  expect(screen.getByText("선택 연습 · 가타카나 첫걸음")).toBeVisible();
  expect(screen.queryByRole("link")).not.toBeInTheDocument();
});
it("아직 복습 시각이 아닌 완료 레슨은 빈 큐 대신 바로 자유 연습으로 연다", () => {
  render(
    <UnitPath
      unit={{ ...unit, lessons: [{ ...unit.lessons[0]!, dueCount: 0 }] }}
      number={1}
    />,
  );
  expect(screen.getByRole("link", { name: /아행.*다시 연습/ })).toHaveAttribute(
    "href",
    "/study?lessonId=done&practice=1",
  );
});
it("expands the current unit while keeping later units compact and freely expandable", async () => {
  const later = {
    ...unit,
    key: "later",
    title: "히라가나 첫걸음",
    position: 1,
    lessons: [{ ...unit.lessons[1]!, id: "future", title: "히라가나 아행" }],
  };
  render(<UnitJourney units={[unit, later]} currentLessonId="current" />);
  expect(screen.getByRole("link", { name: /카행.*이어서 학습/ })).toBeVisible();
  expect(screen.getByRole("link", { name: /히라가나 아행/ })).not.toBeVisible();
  await userEvent.click(
    screen.getByText("히라가나 첫걸음", { selector: "summary span" }),
  );
  expect(screen.getByRole("link", { name: /히라가나 아행/ })).toBeVisible();
});
it("opens the first incomplete core unit when a different level is selected", () => {
  const finished = {
    ...unit,
    key: "finished",
    title: "기본 읽기",
    completed: true,
    completedLessons: 2,
    lessons: unit.lessons.map((l) => ({
      ...l,
      id: `done-${l.id}`,
      completed: true,
    })),
  };
  render(
    <UnitJourney units={[finished, unit]} currentLessonId="another-level" />,
  );
  const current = screen.getByRole("region", {
    name: "단원 2 · 가타카나 첫걸음",
  });
  expect(within(current).getByRole("link", { name: /카행/ })).toBeVisible();
  expect(
    within(
      screen.getByRole("region", { name: "단원 1 · 기본 읽기" }),
    ).getByRole("link", { name: /아행.*복습하기/ }),
  ).not.toBeVisible();
  expect(
    screen.getByText("첫 연습 완료", { selector: "summary span" }),
  ).toBeVisible();
});
it("opens the recommended optional unit without making optional practice mandatory", () => {
  const optional = {
    ...unit,
    key: "extra",
    optional: true,
    lessons: [{ ...unit.lessons[1]!, id: "extra" }],
  };
  render(<UnitJourney units={[unit, optional]} currentLessonId="extra" />);
  expect(screen.getByRole("link", { name: /카행.*이어서 학습/ })).toBeVisible();
  expect(screen.getByText("선택 연습 · 가타카나 첫걸음")).toBeVisible();
});
