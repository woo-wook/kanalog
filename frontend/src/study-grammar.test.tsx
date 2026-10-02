import { act, cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, expect, it, vi } from "vitest";
import StudyPage from "../app/(app)/study/page";
import { api } from "./api";
const voice = vi.hoisted(() => ({ generate: vi.fn(), cancel: vi.fn() }));
vi.mock("./api", () => ({
  api: vi.fn(),
  json: (method: string, body: unknown) => ({
    method,
    body: JSON.stringify(body),
  }),
}));
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams("lessonId=grammar"),
}));
vi.mock("./use-generated-audio", () => ({
  useGeneratedAudio: () => ({ ...voice, busy: false }),
}));
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});
function mount() {
  vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
  const client = new QueryClient({
    defaultOptions: { queries: { staleTime: Infinity } },
  });
  client.setQueryData(["settings"], {
    audioEngine: "SUPERTONIC",
    autoPlayAudio: true,
    allowAudioBeforeReveal: true,
  });
  vi.mocked(api).mockImplementation(async (path) =>
    path === "/study/reviews"
      ? { version: 0, state: "PRACTICED" }
      : {
          id: "session",
          answered: 0,
          practice: true,
          cards: [0, 1].map((i) => ({
            id: `grammar-${i}`,
            version: 0,
            kind: "grammar",
            front: `문법 질문 ${i + 1}`,
            meaning: "あの本です。\n저 책입니다.\n추가 설명입니다.",
            explanation: "\u2063",
          })),
        },
  );
  render(
    <QueryClientProvider client={client}>
      <StudyPage />
    </QueryClientProvider>,
  );
}
it("음성 없는 문법을 자동 재생하려 하지 않고 내용 없는 설명 상자를 만들지 않는다", async () => {
  mount();
  await screen.findByRole("heading", { name: "문법 질문 1" });
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 20));
  });
  expect(
    screen.queryAllByText(/읽을 일본어가 없습니다|재생할 음성이 없습니다/),
  ).toHaveLength(0);
  expect(voice.generate).not.toHaveBeenCalled();
  await userEvent.click(screen.getByRole("button", { name: /정답 보기/ }));
  expect(screen.getByRole("region", { name: "정답과 해설" })).toBeVisible();
  expect(screen.queryByText("예문과 설명 더 보기")).not.toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "문법 질문 1" })).toHaveClass(
    "study-prompt-grammar",
  );
});
it("긴 해설을 스크롤한 후 다음 카드는 맨 위 질문부터 표시한다", async () => {
  mount();
  await screen.findByRole("heading", { name: "문법 질문 1" });
  await userEvent.click(screen.getByRole("button", { name: /정답 보기/ }));
  const panel = screen.getByRole("article", { name: "학습 카드" });
  panel.scrollTop = 160;
  await userEvent.click(screen.getByRole("button", { name: /^보통/ }));
  await screen.findByRole("heading", { name: "문법 질문 2" });
  expect(panel.scrollTop).toBe(0);
  expect(
    screen.queryByRole("region", { name: "정답과 해설" }),
  ).not.toBeInTheDocument();
});
