import { expect, it } from "vitest";
import type { Curriculum, CurriculumLevel, CurriculumUnit } from "./api";
import { nextCurriculumLesson } from "./curriculum";

const unit: CurriculumUnit = {
  key: "sounds",
  title: "가타카나 첫걸음",
  goal: "기본 소리를 읽어요",
  position: 0,
  optional: false,
  totalCards: 10,
  studiedCards: 5,
  completedCards: 5,
  completedLessons: 1,
  completed: false,
  lessons: [
    {
      id: "first",
      courseId: "kana",
      kind: "katakana",
      title: "아행",
      position: 0,
      optional: false,
      totalCards: 5,
      studiedCards: 5,
      completedCards: 5,
      dueCount: 0,
      selected: false,
      completed: true,
    },
    {
      id: "next",
      courseId: "kana",
      kind: "katakana",
      title: "카행",
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
  dueCount: 0,
  available: true,
  completed: false,
};
const curriculum: Curriculum = {
  version: "1",
  levels: [level],
  recommendedLevelKey: "starter",
  recommendedLessonId: "next",
};

it("locates the server's recommended lesson with its level and unit", () => {
  const result = nextCurriculumLesson(curriculum);
  expect(result?.level.key).toBe("starter");
  expect(result?.unit.key).toBe("sounds");
  expect(result?.lesson.id).toBe("next");
});
it("does not invent a recommendation for missing or unavailable content", () => {
  expect(
    nextCurriculumLesson({ ...curriculum, recommendedLessonId: "missing" }),
  ).toBeNull();
  expect(
    nextCurriculumLesson({
      ...curriculum,
      levels: [{ ...level, available: false }],
    }),
  ).toBeNull();
  expect(
    nextCurriculumLesson({ ...curriculum, recommendedLessonId: null }),
  ).toBeNull();
});
it("does not recommend an excluded empty lesson", () => {
  const empty = {
    ...unit,
    lessons: unit.lessons.map((l) => ({ ...l, totalCards: 0 })),
  };
  expect(
    nextCurriculumLesson({
      ...curriculum,
      levels: [{ ...level, units: [empty] }],
    }),
  ).toBeNull();
});
