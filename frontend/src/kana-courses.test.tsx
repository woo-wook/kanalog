import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { KanaCourses } from "./kana-courses";
import type { CurriculumLevel } from "./api";
afterEach(cleanup);
it("히라가나와 가타카나 각각 하나의 코스로 표시하고 행별 링크를 만들지 않는다", () => {
  const units = ["hiragana", "katakana"].map((kind) => ({
    key: kind,
    title: kind === "hiragana" ? "히라가나" : "가타카나",
    goal: "",
    position: 0,
    optional: false,
    totalCards: 46,
    studiedCards: 3,
    completedCards: 2,
    completedLessons: 0,
    completed: false,
    lessons: [
      {
        id: `${kind}-row`,
        courseId: kind,
        kind,
        title: "카 행",
        position: 0,
        optional: false,
        totalCards: 46,
        studiedCards: 3,
        completedCards: 2,
        dueCount: 1,
        selected: false,
        completed: false,
      },
    ],
  }));
  render(<KanaCourses level={{ units } as CurriculumLevel} />);
  expect(screen.getAllByRole("link")).toHaveLength(2);
  expect(screen.getByRole("link", { name: "히라가나 연습" })).toHaveAttribute(
    "href",
    "/courses/hiragana",
  );
  expect(screen.getByRole("link", { name: "가타카나 연습" })).toHaveAttribute(
    "href",
    "/courses/katakana",
  );
  expect(screen.queryByText("카 행")).not.toBeInTheDocument();
  expect(screen.getAllByText(/다시 연습 1개/)).toHaveLength(2);
});
