import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, expect, it, vi } from "vitest";
import StudyPage from "../app/(app)/study/page";
import { api, type Settings } from "./api";

const voice = vi.hoisted(() => ({ generate: vi.fn(), cancel: vi.fn() }));
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
  useGeneratedAudio: () => ({ ...voice, busy: false }),
}));
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

it("자동재생이 막히면 준비된 음성을 터치로 재생하고 다음 카드도 자동으로 듣는다", async () => {
  vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
  const play = vi
    .spyOn(HTMLMediaElement.prototype, "play")
    .mockRejectedValueOnce(
      new DOMException("사용자 터치 필요", "NotAllowedError"),
    )
    .mockResolvedValue(undefined);
  voice.generate.mockResolvedValue("blob:prepared-audio");
  const settings: Settings = {
    audioEngine: "SUPERTONIC",
    supertonicVoice: "F1",
    dailyNewLimit: 10,
    showReadingHint: false,
    showHangulHint: false,
    autoPlayAudio: true,
    allowAudioBeforeReveal: true,
    ttsFallback: false,
    playbackSpeed: 1,
    timezone: "Asia/Seoul",
  };
  const client = new QueryClient({
    defaultOptions: { queries: { staleTime: Infinity } },
  });
  client.setQueryData(["settings"], settings);
  const cards = ["ア", "イ"].map((front, i) => ({
    id: `card-${i}`,
    version: 0,
    kind: "katakana",
    front,
    reading: "a",
    meaning: "아",
  }));
  vi.mocked(api).mockImplementation(async (path) =>
    path === "/study/reviews"
      ? { due: "2026-10-02T00:00:00Z", version: 1 }
      : { id: "session", cards, answered: 0 },
  );
  render(
    <QueryClientProvider client={client}>
      <StudyPage />
    </QueryClientProvider>,
  );
  await userEvent.click(
    await screen.findByRole("button", { name: "자동재생 시작" }),
  );
  expect(voice.generate).toHaveBeenCalledTimes(1);
  expect(play).toHaveBeenCalledTimes(2);
  await act(async () => {
    client.setQueryData(["settings"], { ...settings, dailyNewLimit: 11 });
  });
  await userEvent.click(screen.getByRole("button", { name: /정답 보기/ }));
  expect(voice.generate).toHaveBeenCalledTimes(1);
  await userEvent.click(screen.getByRole("button", { name: /보통/ }));
  await waitFor(() => expect(voice.generate).toHaveBeenCalledTimes(2));
  expect(play).toHaveBeenCalledTimes(3);
  expect(
    screen.queryByRole("button", { name: "자동재생 시작" }),
  ).not.toBeInTheDocument();
});
