import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { useGeneratedAudio } from "./use-generated-audio";
import { browserTts } from "./browser-tts";
import { serverSpeech } from "./server-speech";
import { usesServerSpeech } from "./audio-runtime";

vi.mock("./browser-tts", () => ({ browserTts: vi.fn() }));
vi.mock("./server-speech", () => ({ serverSpeech: vi.fn() }));
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it("데스크톱으로 표시되는 iPad도 서버 음성을 사용하고 실제 PC는 기존 경로를 유지한다", () => {
  expect(
    usesServerSpeech({
      userAgent: "Mozilla/5.0 (Macintosh) Safari/605.1",
      platform: "MacIntel",
      maxTouchPoints: 5,
    }),
  ).toBe(true);
  expect(
    usesServerSpeech({
      userAgent: "Mozilla/5.0 (Macintosh) Safari/605.1",
      platform: "MacIntel",
      maxTouchPoints: 0,
    }),
  ).toBe(false);
});

it("iPhone Safari는 401MB 모델이나 worker 없이 서버에서 받은 음성만 재생한다", async () => {
  vi.stubGlobal("navigator", {
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1",
    platform: "iPhone",
    maxTouchPoints: 5,
  });
  vi.mocked(serverSpeech).mockResolvedValue(
    new Blob(["wave"], { type: "audio/wav" }),
  );
  vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:server-wave");
  vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
  const { result } = renderHook(() => useGeneratedAudio());
  let audio;
  await act(async () => {
    audio = await result.current.generate("ア", "F1", vi.fn());
  });
  expect(audio).toBe("blob:server-wave");
  expect(serverSpeech).toHaveBeenCalledWith(
    "ア",
    "F1",
    expect.any(AbortSignal),
  );
  expect(browserTts).not.toHaveBeenCalled();
});
