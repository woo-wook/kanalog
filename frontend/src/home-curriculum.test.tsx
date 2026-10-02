import { cleanup, render, screen, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, expect, it, vi } from "vitest";
import HomePage from "../app/(app)/page";

vi.mock("./api", () => ({ api: vi.fn() }));
afterEach(cleanup);

const lesson = {
  id: "next-lesson",
  courseId: "vocab",
  kind: "vocabulary",
  title: "단어 1",
  position: 0,
  optional: false,
  totalCards: 20,
  studiedCards: 5,
  completedCards: 3,
  dueCount: 1,
  selected: true,
  completed: false,
};
const unit = {
  key: "n3-unit-1",
  title: "단어와 문장 01",
  goal: "읽기와 뜻 연결",
  position: 0,
  optional: false,
  lessons: [lesson],
  totalCards: 20,
  studiedCards: 5,
  completedCards: 3,
  completedLessons: 0,
  completed: false,
};
const level = {
  key: "n3",
  title: "중급",
  subtitle: "문장 이해의 폭 넓히기",
  jlptLevel: "N3",
  position: 3,
  goal: "문맥에서 표현 이해하기",
  outcomes: [],
  units: [unit],
  totalCards: 20,
  studiedCards: 5,
  completedCards: 3,
  totalLessons: 1,
  completedLessons: 0,
  dueCount: 1,
  available: true,
  completed: false,
};
function mount(levels: unknown[], recommendedLessonId: string | null) {
  const client = new QueryClient({
    defaultOptions: { queries: { staleTime: Infinity } },
  });
  client.setQueryData(["dashboard"], {
    dueCount: 1,
    newRemaining: 10,
    dailyNewRemaining: 10,
    studiedCardsToday: 1,
    answersToday: 2,
    streak: 1,
    selectedDeckId: null,
  });
  client.setQueryData(["courses"], []);
  client.setQueryData(["curriculum"], {
    version: "test",
    levels,
    recommendedLevelKey: recommendedLessonId ? "n3" : null,
    recommendedLessonId,
  });
  render(
    <QueryClientProvider client={client}>
      <HomePage />
    </QueryClientProvider>,
  );
}

it("홈은 서버가 추천한 현재 레벨의 레슨과 실제 단원 진도를 보여준다", () => {
  mount([level], lesson.id);
  expect(screen.getByRole("link", { name: /이어서 학습/ })).toHaveAttribute(
    "href",
    "/study?lessonId=next-lesson",
  );
  expect(
    within(
      screen.getByRole("region", { name: "이어서 학습할 단계" }),
    ).getByText("중급"),
  ).toBeVisible();
  expect(
    screen.getByRole("progressbar", { name: "현재 단원 첫 연습 진행" }),
  ).toHaveAttribute("value", "3");
});

it("가져온 레슨이 없으면 가짜 시작 버튼을 만들지 않는다", () => {
  mount([], null);
  expect(
    screen.queryByRole("link", { name: /레슨 시작|이어서 학습/ }),
  ).not.toBeInTheDocument();
  expect(
    screen.getByRole("link", { name: /전체 레벨과 커리큘럼/ }),
  ).toHaveAttribute("href", "/courses");
});

it("가나 이어서 학습과 재연습은 행별 레슨 대신 단일 코스를 연다", () => {
  const kana = {
    ...lesson,
    kind: "hiragana",
    title: "히라가나",
    courseId: "hira",
  };
  mount(
    [{ ...level, key: "starter", units: [{ ...unit, lessons: [kana] }] }],
    kana.id,
  );
  expect(screen.getByRole("link", { name: /이어서 학습/ })).toHaveAttribute(
    "href",
    "/courses/hira",
  );
  expect(screen.getByRole("link", { name: /1.*복습/ })).toHaveAttribute(
    "href",
    "/courses/hira",
  );
});
