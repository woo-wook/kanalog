import { cleanup, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import SettingsPage from "../app/(app)/settings/page";
import StudyPage from "../app/(app)/study/page";
import NotesPage from "../app/(app)/notes/page";
import { api } from "./api";
import userEvent from "@testing-library/user-event";
import { within } from "@testing-library/react";

vi.mock("./api", () => ({
  api: vi.fn(),
  json: (method: string, body: unknown) => ({
    method,
    body: JSON.stringify(body),
  }),
}));
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams("deckId=fixture"),
}));
vi.mock("./use-generated-audio", () => ({
  useGeneratedAudio: () => ({
    generate: vi.fn(),
    cancel: vi.fn(),
    busy: false,
  }),
}));
beforeEach(() =>
  vi
    .spyOn(HTMLMediaElement.prototype, "pause")
    .mockImplementation(() => undefined),
);
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

it("음성 설정은 공급자 출처 대신 학습자가 선택할 재생 방식으로 표시한다", () => {
  const client = new QueryClient({
    defaultOptions: { queries: { staleTime: Infinity } },
  });
  client.setQueryData(["settings"], {
    audioEngine: "SUPERTONIC",
    supertonicVoice: "F1",
    dailyNewLimit: 10,
    showReadingHint: false,
    showHangulHint: false,
    autoPlayAudio: false,
    allowAudioBeforeReveal: true,
    ttsFallback: false,
    playbackSpeed: 1,
    timezone: "Asia/Seoul",
  });
  render(
    <QueryClientProvider client={client}>
      <SettingsPage />
    </QueryClientProvider>,
  );
  expect(
    screen.getByRole("option", { name: "학습 음성 (추천)" }),
  ).toBeVisible();
  expect(screen.getByRole("option", { name: "기본 음성" })).toBeVisible();
  expect(screen.queryByText(/Supertonic|MAX|출처/)).not.toBeInTheDocument();
});

it("학습 화면은 출처 문구 없이 발음 듣기와 기본 음성 버튼을 제공한다", async () => {
  const client = new QueryClient({
    defaultOptions: { queries: { staleTime: Infinity } },
  });
  client.setQueryData(["settings"], {
    audioEngine: "SUPERTONIC",
    allowAudioBeforeReveal: true,
  });
  vi.mocked(api).mockResolvedValue({
    id: "session",
    answered: 0,
    cards: [
      {
        id: "card",
        version: 0,
        kind: "vocabulary",
        front: "試験",
        reading: "しけん",
        meaning: "시험",
        audioId: "fixture-audio",
      },
    ],
  });
  render(
    <QueryClientProvider client={client}>
      <StudyPage />
    </QueryClientProvider>,
  );
  expect(
    await screen.findByRole("button", { name: "단어 발음 듣기" }),
  ).toBeVisible();
  expect(screen.getByRole("button", { name: "기본 음성 듣기" })).toBeVisible();
  expect(screen.queryByText(/Supertonic|MAX|출처/)).not.toBeInTheDocument();
});

it("단어장은 출처를 표시하지 않으면서 가져온 단어의 편집 제한을 유지한다", () => {
  const client = new QueryClient({
    defaultOptions: { queries: { staleTime: Infinity } },
  });
  client.setQueryData(["notes", "", 0, ""], {
    content: [
      {
        id: "imported",
        japanese: "試験",
        reading: "しけん",
        meaning: "시험",
        source: "JLPT MAX",
      },
    ],
    number: 0,
    totalPages: 1,
    totalElements: 1,
  });
  render(
    <QueryClientProvider client={client}>
      <NotesPage />
    </QueryClientProvider>,
  );
  expect(screen.getByText("試験")).toBeVisible();
  expect(screen.queryByText(/출처|JLPT MAX/)).not.toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "수정" }),
  ).not.toBeInTheDocument();
});

it("가나 정답의 근사 발음은 카드 안에 표시하고 평가는 별도 하단 영역에 둔다", async () => {
  const client = new QueryClient({
    defaultOptions: { queries: { staleTime: Infinity } },
  });
  client.setQueryData(["settings"], {
    showHangulHint: true,
    audioEngine: "SUPERTONIC",
    allowAudioBeforeReveal: true,
  });
  vi.mocked(api).mockResolvedValue({
    id: "session",
    answered: 0,
    cards: [
      {
        id: "kana",
        version: 0,
        kind: "katakana",
        front: "ア",
        reading: "a",
        meaning: "아",
        hangulHint: "아",
      },
    ],
  });
  render(
    <QueryClientProvider client={client}>
      <StudyPage />
    </QueryClientProvider>,
  );
  const reveal = await screen.findByRole("button", { name: /정답 보기/ });
  expect(screen.queryByText("아")).not.toBeInTheDocument();
  await userEvent.click(reveal);
  const card = screen.getByRole("article");
  expect(within(card).getByText("근사 발음")).toBeVisible();
  expect(within(card).getByText("아")).toBeVisible();
  const actions = screen.getByRole("group", { name: "기억 정도 평가" });
  expect(within(actions).getAllByRole("button")).toHaveLength(4);
  expect(card.contains(actions)).toBe(false);
});
