import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, expect, it, vi } from "vitest";
import StudyPage from "../app/(app)/study/page";
import { api } from "./api";
vi.mock("./api", () => ({
  api: vi.fn(),
  json: (method: string, body: unknown) => ({
    method,
    body: JSON.stringify(body),
  }),
}));
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams("level=N5&kind=vocabulary"),
}));
vi.mock("./use-generated-audio", () => ({
  useGeneratedAudio: () => ({
    generate: vi.fn(),
    cancel: vi.fn(),
    busy: false,
  }),
}));
vi.mock("./study-next-step", () => ({ StudyNextStep: () => null }));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.restoreAllMocks();
});
it("레벨 범위로 학습하고 다시 카드를 서버의 재연습 상태로 한 번 더 제출한 후 마친다", async () => {
  vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
  const card = {
    id: "card",
    version: 0,
    front: "猫",
    meaning: "고양이",
    kind: "vocabulary",
  };
  const retryCard = {
    ...card,
    version: 1,
    reinforcement: true,
    retryVersion: 1,
  };
  vi.mocked(api).mockImplementation(async (path, options) => {
    if (path === "/study/sessions")
      return {
        id: "session",
        cards: [card],
        answered: 0,
        lessonTitle: "N5 · 단어 연습",
      };
    if (path === "/study/reviews") {
      const body = JSON.parse(options!.body as string);
      return body.reinforcement
        ? { version: 1, state: "REINFORCED" }
        : { version: 1, due: "2026-10-05T00:00:00Z", retryCard };
    }
    return {};
  });
  const client = new QueryClient({
    defaultOptions: { queries: { staleTime: Infinity } },
  });
  client.setQueryData(["settings"], {
    audioEngine: "ORIGINAL",
    autoPlayAudio: false,
  });
  render(
    <QueryClientProvider client={client}>
      <StudyPage />
    </QueryClientProvider>,
  );
  await screen.findByRole("button", { name: /정답 보기/ });
  expect(
    JSON.parse(
      vi
        .mocked(api)
        .mock.calls.find(([path]) => path === "/study/sessions")![1]!
        .body as string,
    ),
  ).toEqual({
    levelScope: { level: "N5", kind: "vocabulary", reviewOnly: false },
  });
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: /정답 보기/ }));
  await user.click(screen.getByRole("button", { name: /^다시/ }));
  await screen.findByText("한 번 더 기억해 보기");
  expect(
    screen.queryByRole("heading", { name: "이번 학습을 마쳤습니다" }),
  ).not.toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: /정답 보기/ }));
  await user.click(screen.getByRole("button", { name: /^보통/ }));
  await screen.findByRole("heading", { name: "이번 학습을 마쳤습니다" });
  const calls = vi
    .mocked(api)
    .mock.calls.filter(([path]) => path === "/study/reviews");
  expect(calls).toHaveLength(2);
  expect(JSON.parse(calls[1]![1]!.body as string)).toMatchObject({
    reinforcement: true,
    retryVersion: 1,
    version: 1,
  });
  await waitFor(() => expect(screen.getByText(/내일도 복습/)).toBeVisible());
});
