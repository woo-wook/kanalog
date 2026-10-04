import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, expect, it, vi } from "vitest";
import { PracticeLauncher } from "./practice-launcher";
import { api } from "./api";
vi.mock("./api", () => ({
  api: vi.fn(),
  json: (method: string, body: unknown) => ({
    method,
    body: JSON.stringify(body),
  }),
}));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
it("선택한 레벨 전체에서 단어와 문법을 연습하고 전체 복습은 새 카드를 섞지 않는다", async () => {
  const client = new QueryClient({
    defaultOptions: { queries: { staleTime: Infinity } },
  });
  client.setQueryData(["settings"], { practiceLevel: "N5" });
  client.setQueryData(
    ["study-options"],
    [
      { level: "N5", kind: "vocabulary", total: 779, studied: 20, due: 3 },
      { level: "N5", kind: "grammar", total: 99, studied: 7, due: 2 },
      { level: "N4", kind: "vocabulary", total: 100, studied: 5, due: 1 },
    ],
  );
  vi.mocked(api).mockResolvedValue({ practiceLevel: "N4" });
  render(
    <QueryClientProvider client={client}>
      <PracticeLauncher />
    </QueryClientProvider>,
  );
  expect(screen.getByRole("link", { name: /단어 연습/ })).toHaveAttribute(
    "href",
    "/study?level=N5&kind=vocabulary",
  );
  expect(screen.getByRole("link", { name: /문법 연습/ })).toHaveAttribute(
    "href",
    "/study?level=N5&kind=grammar",
  );
  expect(screen.getByRole("link", { name: /N5 전체 복습/ })).toHaveAttribute(
    "href",
    "/study?level=N5&mode=review",
  );
  expect(screen.getByRole("link", { name: /모든 레벨 복습/ })).toHaveAttribute(
    "href",
    "/study?level=all&mode=review",
  );
  await userEvent
    .setup()
    .selectOptions(screen.getByLabelText("내 학습 레벨"), "N4");
  await waitFor(() =>
    expect(screen.getByRole("link", { name: /단어 연습/ })).toHaveAttribute(
      "href",
      "/study?level=N4&kind=vocabulary",
    ),
  );
  expect(vi.mocked(api).mock.calls[0]![0]).toBe("/settings");
  expect(JSON.parse(vi.mocked(api).mock.calls[0]![1]!.body as string)).toEqual({
    practiceLevel: "N4",
  });
  expect(
    screen.queryByRole("link", { name: /문법 연습/ }),
  ).not.toBeInTheDocument();
});
