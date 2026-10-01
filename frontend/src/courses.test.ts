import { expect, it } from "vitest";
import type { Course, Lesson } from "./api";
import { recommendLesson } from "./courses";

const lesson = (id: string, completed: boolean, optional = false): Lesson => ({
  id,
  title: id,
  position: 0,
  optional,
  totalCards: 5,
  studiedCards: completed ? 5 : 0,
  completedCards: completed ? 5 : 0,
  dueCount: 0,
  selected: false,
  completed,
});
const course = (id: string, lessons: Lesson[], position: number): Course => ({
  id,
  title: id,
  description: "",
  kind: id,
  level: null,
  position,
  totalCards: 46,
  studiedCards: 0,
  completedCards: 0,
  dueCount: 0,
  lessons,
  recommendedLessonId: null,
});
it("recommends hiragana after basic katakana without requiring optional expansions", () => {
  const courses = [
    course(
      "katakana",
      [lesson("basic", true), lesson("extra", false, true)],
      0,
    ),
    course("hiragana", [lesson("hira-first", false)], 1),
  ];
  expect(recommendLesson(courses, "basic")?.lesson.id).toBe("hira-first");
});
it("keeps a chosen unfinished lesson and prioritizes its due review", () => {
  const vowels = lesson("vowels", false);
  const words = lesson("words", false);
  const courses = [
    course("katakana", [vowels], 0),
    course("vocabulary", [words], 2),
  ];
  expect(recommendLesson(courses, "words")?.lesson.id).toBe("words");
  words.completed = true;
  words.dueCount = 1;
  expect(recommendLesson(courses, "words")?.lesson.id).toBe("words");
  words.dueCount = 0;
  expect(recommendLesson(courses, "words")?.lesson.id).toBe("vowels");
});
it("does not recommend a lesson with every card suspended", () => {
  const empty = { ...lesson("excluded", false), totalCards: 0 };
  const courses = [course("katakana", [empty, lesson("next", false)], 0)];
  expect(recommendLesson(courses, "excluded")?.lesson.id).toBe("next");
});
