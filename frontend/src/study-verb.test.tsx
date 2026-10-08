import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, expect, it, vi } from "vitest";
import StudyPage from "../app/(app)/study/page";
import { api, type VerbConjugation } from "./api";
const voice = vi.hoisted(() => ({ generate: vi.fn(), cancel: vi.fn() }));

vi.mock("./api", () => ({
  api: vi.fn(),
  json: (method: string, body: unknown) => ({
    method,
    body: JSON.stringify(body),
  }),
}));
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams("deckId=verbs"),
}));
vi.mock("./use-generated-audio", () => ({
  useGeneratedAudio: () => ({ ...voice, busy: false }),
}));
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

it("활용형 듣기는 원형 음성 대신 선택한 합성 음성에 활용형만 전달한다", async () => {
  vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
  voice.generate.mockResolvedValue(null);
  const client = new QueryClient({
    defaultOptions: { queries: { staleTime: Infinity } },
  });
  client.setQueryData(["settings"], {
    audioEngine: "SUPERTONIC",
    supertonicVoice: "F2",
    autoPlayAudio: false,
    showFurigana: true,
    showHangulHint: false,
    allowAudioBeforeReveal: false,
  });
  vi.mocked(api).mockResolvedValue({
    id: "session",
    answered: 0,
    cards: [
      {
        id: "card",
        version: 0,
        kind: "vocabulary",
        front: "書く",
        meaning: "쓰다",
        audioId: "original-word-audio",
        verbConjugation: {
          verbClass: "GODAN",
          classLabel: "5단 동사",
          dictionaryForm: "書く",
          dictionaryReading: "かく",
          rule: "어미가 바뀝니다.",
          forms: [
            {
              key: "masu",
              label: "ます형",
              group: "BASIC",
              description: "공손한 표현",
              japanese: "書きます",
              reading: "かきます",
              stem: "書き",
              suffix: "ます",
            },
          ],
        },
      },
    ],
  });
  render(
    <QueryClientProvider client={client}>
      <StudyPage />
    </QueryClientProvider>,
  );
  await screen.findByRole("heading", { name: "書く" });
  await userEvent.click(screen.getByRole("button", { name: /정답 보기/ }));
  await userEvent.click(
    screen.getByRole("button", { name: "書きます 활용형 듣기" }),
  );
  expect(voice.generate).toHaveBeenCalledWith(
    "かきます",
    "F2",
    expect.any(Function),
  );
});

it("학습 카드에서는 정답 보기 전 활용형을 숨기고 평가 버튼은 유지한다", async () => {
  vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
  const conjugation: VerbConjugation = {
    verbClass: "GODAN",
    classLabel: "5단 동사",
    dictionaryForm: "書く",
    dictionaryReading: "かく",
    rule: "어미가 바뀝니다.",
    forms: [
      {
        key: "masu",
        label: "ます형",
        group: "BASIC",
        description: "공손한 표현",
        japanese: "書きます",
        reading: "かきます",
        stem: "書き",
        suffix: "ます",
      },
    ],
  };
  const client = new QueryClient({
    defaultOptions: { queries: { staleTime: Infinity } },
  });
  client.setQueryData(["settings"], {
    audioEngine: "ORIGINAL",
    autoPlayAudio: false,
    showFurigana: true,
    showHangulHint: false,
    allowAudioBeforeReveal: false,
  });
  vi.mocked(api).mockResolvedValue({
    id: "session",
    answered: 0,
    cards: [
      {
        id: "card",
        version: 0,
        kind: "vocabulary",
        front: "書く",
        meaning: "쓰다",
        verbConjugation: conjugation,
      },
    ],
  });
  render(
    <QueryClientProvider client={client}>
      <StudyPage />
    </QueryClientProvider>,
  );
  await screen.findByRole("heading", { name: "書く" });
  expect(
    screen.queryByRole("region", { name: "동사 활용" }),
  ).not.toBeInTheDocument();
  expect(screen.queryByText("書きます")).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: /정답 보기/ }));
  expect(screen.getByRole("region", { name: "동사 활용" })).toBeVisible();
  expect(screen.getByRole("region", { name: "동사 활용" })).toHaveTextContent(
    "書きます",
  );
  expect(screen.getByRole("group", { name: "기억 정도 평가" })).toBeVisible();
  expect(
    screen.queryByRole("button", { name: "書きます 활용형 듣기" }),
  ).not.toBeInTheDocument();
});
