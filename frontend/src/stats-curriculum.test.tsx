import { cleanup, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, expect, it, vi } from "vitest";
import StatsPage from "../app/(app)/stats/page";
vi.mock("./api", () => ({ api: vi.fn() }));
afterEach(cleanup);
it("레벨 통계는 한 번 본 수 대신 실제 첫 연습 진도를 표시한다", () => {
  const client = new QueryClient({
    defaultOptions: { queries: { staleTime: Infinity } },
  });
  client.setQueryData(["stats"], { learnedCards: 5 });
  client.setQueryData(["courses"], []);
  client.setQueryData(["curriculum"], {
    levels: [
      {
        key: "n5",
        title: "입문",
        position: 1,
        available: true,
        totalCards: 20,
        studiedCards: 5,
        completedCards: 3,
        completedLessons: 0,
        totalLessons: 1,
      },
    ],
  });
  render(
    <QueryClientProvider client={client}>
      <StatsPage />
    </QueryClientProvider>,
  );
  expect(
    screen.getByRole("region", { name: "레벨별 첫 연습 진도" }),
  ).toBeVisible();
  expect(
    screen.getByRole("progressbar", { name: "입문 첫 연습 진행" }),
  ).toHaveAttribute("value", "3");
  expect(screen.getByText("3/20장")).toBeVisible();
});
