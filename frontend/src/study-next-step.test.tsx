import { cleanup, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, expect, it, vi } from "vitest";
import { StudyNextStep } from "./study-next-step";
vi.mock("./api", () => ({ api: vi.fn() }));
afterEach(cleanup);
function mount(current: string, recommended: string | null) {
  const client = new QueryClient({
    defaultOptions: { queries: { staleTime: Infinity } },
  });
  client.setQueryData(["curriculum"], {
    version: "test",
    recommendedLevelKey: "starter",
    recommendedLessonId: recommended,
    levels: [
      {
        key: "starter",
        title: "왕초보",
        subtitle: "문자 익히기",
        position: 0,
        available: true,
        units: [
          {
            key: "kata",
            title: "가타카나 시작",
            position: 0,
            lessons: [
              {
                id: "next",
                title: "카 행",
                totalCards: 5,
                studiedCards: 0,
                completedCards: 0,
              },
            ],
          },
        ],
      },
    ],
  });
  render(
    <QueryClientProvider client={client}>
      <StudyNextStep lessonId={current} />
    </QueryClientProvider>,
  );
}
it("학습 완료 뒤 다음 레슨의 경로와 레벨을 보여준다", () => {
  mount("previous", "next");
  expect(screen.getByRole("link", { name: /다음 레슨 학습/ })).toHaveAttribute(
    "href",
    "/study?lessonId=next",
  );
  expect(screen.getByText("왕초보 · 가타카나 시작")).toBeVisible();
});
it("현재 레슨에 첫 연습이 남았다면 완료로 표시하지 않고 단원 진도로 연결한다", () => {
  mount("next", "next");
  expect(
    screen.queryByRole("link", { name: /다음 레슨 학습/ }),
  ).not.toBeInTheDocument();
  expect(screen.getByRole("link", { name: "단원 진도 보기" })).toHaveAttribute(
    "href",
    "/courses/levels/starter",
  );
  expect(screen.getByText(/첫 연습 0\/5장/)).toBeVisible();
});
