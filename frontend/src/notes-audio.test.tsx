import { act, cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import NotesPage from "../app/(app)/notes/page";
import type { Note } from "./api";

const voice = vi.hoisted(() => ({ generate: vi.fn(), cancel: vi.fn() }));
vi.mock("./api", () => ({ api: vi.fn(), json: vi.fn() }));
vi.mock("./use-generated-audio", () => ({
  useGeneratedAudio: () => ({ ...voice, busy: false }),
}));
beforeEach(() => {
  vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
  vi.spyOn(HTMLMediaElement.prototype, "load").mockImplementation(() => {});
  vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
  voice.generate.mockResolvedValue("blob:fixture");
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.resetAllMocks();
  vi.unstubAllGlobals();
});

const grammar: Note = {
  id: "grammar",
  kind: "grammar",
  front: "この本は田中さんのです。",
  meaning: "이 책은 다나카 씨의 것입니다.\n설명입니다.",
  source: "JLPT MAX",
};
const word: Note = {
  id: "word",
  kind: "vocabulary",
  japanese: "本",
  reading: "ほん",
  meaning: "책",
  example: "本を読みます。",
  exampleMeaning: "책을 읽습니다.",
  source: "PERSONAL",
};
function mount(notes = [grammar, word], engine = "SUPERTONIC") {
  const client = new QueryClient({
    defaultOptions: { queries: { staleTime: Infinity, retry: false } },
  });
  client.setQueryData(["settings"], {
    audioEngine: engine,
    supertonicVoice: "M1",
    playbackSpeed: 0.8,
  });
  client.setQueryData(["notes", "", 0, ""], {
    content: notes,
    totalPages: 1,
    totalElements: notes.length,
  });
  return render(
    <QueryClientProvider client={client}>
      <NotesPage />
    </QueryClientProvider>,
  );
}
it("단어장 상세에서 문법 예문·단어 읽기·단어 예문만 선택한 목소리로 합성한다", async () => {
  mount();
  const grammarEntry = screen.getAllByRole("article")[0]!;
  await userEvent.click(within(grammarEntry).getByText("예문·설명 보기"));
  await userEvent.click(
    within(grammarEntry).getByRole("button", { name: "예문 듣기" }),
  );
  expect(voice.generate).toHaveBeenLastCalledWith(
    grammar.front,
    "M1",
    expect.any(Function),
  );
  const wordEntry = screen.getAllByRole("article")[1]!;
  await userEvent.click(within(wordEntry).getByText("뜻·예문 보기"));
  await userEvent.click(
    within(wordEntry).getByRole("button", { name: "단어 듣기" }),
  );
  expect(voice.generate).toHaveBeenLastCalledWith(
    "ほん",
    "M1",
    expect.any(Function),
  );
  await userEvent.click(
    within(wordEntry).getByRole("button", { name: "예문 듣기" }),
  );
  expect(voice.generate).toHaveBeenLastCalledWith(
    word.example,
    "M1",
    expect.any(Function),
  );
  expect(screen.getByLabelText("단어장 발음 오디오")).toHaveProperty(
    "playbackRate",
    0.8,
  );
});
it("Safari 재생 차단 후에는 준비된 파일을 다시 합성하지 않고 재생한다", async () => {
  vi.mocked(HTMLMediaElement.prototype.play).mockRejectedValueOnce(
    new DOMException("gesture", "NotAllowedError"),
  );
  mount([grammar]);
  await userEvent.click(screen.getByText("예문·설명 보기"));
  await userEvent.click(screen.getByRole("button", { name: "예문 듣기" }));
  await userEvent.click(
    await screen.findByRole("button", { name: "준비된 음성 재생" }),
  );
  expect(voice.generate).toHaveBeenCalledTimes(1);
  expect(HTMLMediaElement.prototype.play).toHaveBeenCalledTimes(2);
});
it("다른 항목·상세 접기·페이지 이동은 이전 요청을 취소하고 늦은 음성을 무시한다", async () => {
  let complete: (url: string) => void = () => {};
  voice.generate.mockImplementationOnce(
    () =>
      new Promise<string>((resolve) => {
        complete = resolve;
      }),
  );
  mount();
  const entries = screen.getAllByRole("article");
  await userEvent.click(within(entries[0]!).getByText("예문·설명 보기"));
  await userEvent.click(
    within(entries[0]!).getByRole("button", { name: "예문 듣기" }),
  );
  await userEvent.click(within(entries[1]!).getByText("뜻·예문 보기"));
  await userEvent.click(
    within(entries[1]!).getByRole("button", { name: "단어 듣기" }),
  );
  const audio = screen.getByLabelText("단어장 발음 오디오");
  expect(audio).toHaveAttribute("src", "blob:fixture");
  await act(async () => complete("blob:obsolete"));
  expect(audio).toHaveAttribute("src", "blob:fixture");
  await userEvent.click(entries[1]!.querySelector("summary")!);
  expect(audio).not.toHaveAttribute("src");
  expect(HTMLMediaElement.prototype.pause).toHaveBeenCalled();
  await userEvent.click(entries[1]!.querySelector("summary")!);
  await userEvent.click(
    within(entries[1]!).getByRole("button", { name: "단어 듣기" }),
  );
  await userEvent.click(screen.getByRole("button", { name: "단어" }));
  expect(audio).not.toHaveAttribute("src");
  expect(voice.cancel).toHaveBeenCalled();
});
it("단어장을 떠날 때 이미 재생한 음성도 멈춘다", async () => {
  const view = mount([word]);
  await userEvent.click(screen.getByText("뜻·예문 보기"));
  await userEvent.click(screen.getByRole("button", { name: "단어 듣기" }));
  vi.mocked(HTMLMediaElement.prototype.pause).mockClear();
  view.unmount();
  expect(HTMLMediaElement.prototype.pause).toHaveBeenCalledTimes(1);
});
it("합성 실패 후 듣기를 다시 누르면 재시도하고 기본 음성 선택은 합성하지 않는다", async () => {
  voice.generate.mockRejectedValueOnce(new Error("음성 준비 실패"));
  const view = mount([word]);
  await userEvent.click(screen.getByText("뜻·예문 보기"));
  await userEvent.click(screen.getByRole("button", { name: "단어 듣기" }));
  expect(screen.getByText("음성 준비 실패")).toBeVisible();
  await userEvent.click(screen.getByRole("button", { name: "단어 듣기" }));
  expect(screen.getByLabelText("단어장 발음 오디오")).toHaveAttribute(
    "src",
    "blob:fixture",
  );
  view.unmount();
  voice.generate.mockClear();
  mount([{ ...word, audioId: "private-media" }], "ORIGINAL");
  await userEvent.click(screen.getByText("뜻·예문 보기"));
  await userEvent.click(screen.getByRole("button", { name: "단어 듣기" }));
  expect(screen.getByLabelText("단어장 발음 오디오")).toHaveAttribute(
    "src",
    "/api/media/private-media",
  );
  expect(voice.generate).not.toHaveBeenCalled();
});
it("기기 음성은 일본어 목소리만 사용하며 음성 목록 지연 시 재시도한다", async () => {
  const japanese = { lang: "ja-JP", voiceURI: "japanese" };
  const device = {
    getVoices: vi
      .fn()
      .mockReturnValue([{ lang: "en-US", voiceURI: "english" }]),
    speak: vi.fn(),
    cancel: vi.fn(),
  };
  vi.stubGlobal("speechSynthesis", device);
  vi.stubGlobal(
    "SpeechSynthesisUtterance",
    class {
      constructor(public text: string) {}
    },
  );
  mount([word], "DEVICE");
  await userEvent.click(screen.getByText("뜻·예문 보기"));
  await userEvent.click(screen.getByRole("button", { name: "단어 듣기" }));
  expect(device.speak).not.toHaveBeenCalled();
  expect(screen.getByText(/일본어 음성을 불러오지 못했습니다/)).toBeVisible();
  device.getVoices.mockReturnValue([japanese]);
  await userEvent.click(screen.getByRole("button", { name: "단어 듣기" }));
  expect(device.speak).toHaveBeenCalledWith(
    expect.objectContaining({
      text: "ほん",
      lang: "ja-JP",
      voice: japanese,
      rate: 0.8,
    }),
  );
  expect(voice.generate).not.toHaveBeenCalled();
  await userEvent.click(screen.getByRole("button", { name: "재생 중지" }));
  expect(device.cancel).toHaveBeenCalled();
});
