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
  useSearchParams: () =>
    new URLSearchParams("kana=both&groups=semiVoiced&size=10&practice=1"),
}));
vi.mock("./use-generated-audio", () => ({
  useGeneratedAudio: () => ({
    generate: vi.fn(),
    cancel: vi.fn(),
    busy: false,
  }),
}));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.restoreAllMocks();
});
it("섞기 선택으로 세션을 만들고 자유 연습 결과를 저장한 뒤 새 세션으로 다시 섞는다", async () => {
  vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
  const client = new QueryClient({
    defaultOptions: { queries: { staleTime: Infinity } },
  });
  client.setQueryData(["settings"], {
    audioEngine: "ORIGINAL",
    autoPlayAudio: false,
    allowAudioBeforeReveal: false,
  });
  vi.mocked(api).mockImplementation(async (path) =>
    path === "/study/reviews"
      ? { due: null, version: 3, state: "PRACTICED" }
      : {
          id: "session",
          cards: [
            {
              id: "card",
              version: 3,
              front: "ぱ",
              kind: "hiragana",
              meaning: "파",
            },
          ],
          answered: 0,
          lessonTitle: "가나 자유 연습",
          practice: true,
        },
  );
  render(
    <QueryClientProvider client={client}>
      <StudyPage />
    </QueryClientProvider>,
  );
  await screen.findByRole("button", { name: /정답 보기/ });
  const start = vi
    .mocked(api)
    .mock.calls.find(([path]) => path === "/study/sessions")!;
  expect(JSON.parse(start[1]!.body as string)).toEqual({
    kana: {
      scripts: ["hiragana", "katakana"],
      groups: ["semiVoiced"],
      size: 10,
      practice: true,
    },
  });
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: /정답 보기/ }));
  await user.click(screen.getByRole("button", { name: /^보통/ }));
  await screen.findByRole("heading", { name: "자유 연습을 마쳤습니다" });
  expect(screen.getByText(/복습 일정과 코스 진도는 그대로/)).toBeVisible();
  expect(
    screen.queryByRole("button", { name: "복습할 카드 다시 확인" }),
  ).not.toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "다시 섞어 연습" }));
  await screen.findByRole("button", { name: /정답 보기/ });
  await waitFor(() =>
    expect(
      vi.mocked(api).mock.calls.filter(([path]) => path === "/study/sessions"),
    ).toHaveLength(2),
  );
});

it("카드가 없는 진입을 완료로 표시하지 않고 같은 범위 자유 연습으로 전환한다", async () => {
  vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
  const client = new QueryClient({
    defaultOptions: { queries: { staleTime: Infinity } },
  });
  client.setQueryData(["settings"], {
    audioEngine: "ORIGINAL",
    autoPlayAudio: false,
  });
  vi.mocked(api)
    .mockResolvedValueOnce({
      id: "empty",
      cards: [],
      answered: 0,
      practice: false,
      queueInfo: {
        eligibleCards: 10,
        unseenCards: 6,
        newRemaining: 0,
        reason: "DAILY_LIMIT",
      },
    })
    .mockResolvedValueOnce({
      id: "repeat",
      cards: [{ id: "c", front: "ぱ", kind: "hiragana", version: 0 }],
      answered: 0,
      practice: true,
    });
  render(
    <QueryClientProvider client={client}>
      <StudyPage />
    </QueryClientProvider>,
  );
  await screen.findByRole("heading", { name: "지금 예정된 카드가 없습니다" });
  expect(screen.queryByText("이번 학습을 마쳤습니다")).not.toBeInTheDocument();
  expect(screen.getByText(/오늘 새 카드 한도를 모두 사용/)).toBeVisible();
  await userEvent.click(
    screen.getByRole("button", { name: "같은 범위 자유 연습" }),
  );
  await screen.findByRole("button", { name: /정답 보기/ });
  const starts = vi
    .mocked(api)
    .mock.calls.filter(([path]) => path === "/study/sessions");
  expect(JSON.parse(starts[1]![1]!.body as string).practice).toBe(true);
});

it("다른 탭에서 새 카드 한도를 사용한 경우 상태 충돌로 오인하지 않고 연습을 제공한다", async () => {
  vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
  const client = new QueryClient({
    defaultOptions: { queries: { staleTime: Infinity } },
  });
  client.setQueryData(["settings"], {
    audioEngine: "ORIGINAL",
    autoPlayAudio: false,
  });
  vi.mocked(api).mockImplementation(async (path) => {
    if (path === "/study/reviews")
      throw Object.assign(new Error("오늘 새 카드 한도에 도달했습니다"), {
        status: 409,
        code: "NEW_LIMIT",
      });
    return {
      id: "s",
      cards: [{ id: "c", front: "ぱ", kind: "hiragana", version: 0 }],
      answered: 0,
      practice: false,
    };
  });
  render(
    <QueryClientProvider client={client}>
      <StudyPage />
    </QueryClientProvider>,
  );
  await userEvent.click(
    await screen.findByRole("button", { name: /정답 보기/ }),
  );
  await userEvent.click(screen.getByRole("button", { name: /^보통/ }));
  await screen.findByText("오늘 새 카드 한도에 도달했습니다");
  expect(
    screen.queryByText(/다른 화면에서 이 카드가 변경/),
  ).not.toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "같은 범위 자유 연습" }),
  ).toBeVisible();
  expect(
    screen.getByRole("button", { name: "현재 상태로 다시 불러오기" }),
  ).toBeVisible();
});
