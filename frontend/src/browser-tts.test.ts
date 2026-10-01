import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { BrowserTts } from "./browser-tts";

class FakeWorker {
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: (() => void) | null = null;
  postMessage = vi.fn();
  terminate = vi.fn();
  reply(data: unknown) {
    this.onmessage?.({ data } as MessageEvent);
  }
}
let worker: FakeWorker;
beforeEach(() => {
  worker = new FakeWorker();
});
afterEach(() => vi.useRealTimers());

it("다운로드가 진행 중이면 전체 시간이 길어도 준비 작업을 중단하지 않는다", async () => {
  vi.useFakeTimers();
  const client = new BrowserTts(() => worker as unknown as Worker);
  const result = client.generate("ア", "F1").catch((error: Error) => error);
  const id = worker.postMessage.mock.calls[0]![0].id;
  await vi.advanceTimersByTimeAsync(120_000);
  worker.reply({ id, type: "progress", message: "음성 준비 중 · 50%" });
  await vi.advanceTimersByTimeAsync(120_000);
  expect(worker.terminate).not.toHaveBeenCalled();
  worker.reply({ id, type: "result", wav: new ArrayBuffer(128) });
  expect(await result).toBeInstanceOf(Blob);
  client.dispose();
});

it("취소된 생성 결과를 반환하지 않고 다음 요청을 정상 처리한다", async () => {
  const client = new BrowserTts(() => worker as unknown as Worker);
  const signal = new AbortController();
  const first = client.generate("ア", "F1", signal.signal);
  const rejected = expect(first).rejects.toMatchObject({ name: "AbortError" });
  const firstId = worker.postMessage.mock.calls[0]![0].id;
  signal.abort();
  await rejected;
  worker.reply({ id: firstId, type: "result", wav: new ArrayBuffer(44) });
  const second = client.generate("イ", "F1");
  const secondId = worker.postMessage.mock.calls.at(-1)![0].id;
  worker.reply({ id: secondId, type: "result", wav: new ArrayBuffer(128) });
  const audio = await second;
  expect(audio.size).toBe(128);
  expect(audio.type).toBe("audio/wav");
  client.dispose();
  expect(worker.terminate).toHaveBeenCalled();
});

it("모델 실패를 표시하고 새 worker로 재시도한다", async () => {
  const factory = vi.fn(() => worker as unknown as Worker);
  const client = new BrowserTts(factory);
  const first = client.generate("ア", "F1");
  const rejected = expect(first).rejects.toThrow("모델을 불러오지 못했습니다");
  worker.onerror?.();
  await rejected;
  const second = client.generate("ア", "F1");
  expect(factory).toHaveBeenCalledTimes(2);
  const id = worker.postMessage.mock.calls.at(-1)![0].id;
  worker.reply({ id, type: "result", wav: new ArrayBuffer(128) });
  await second;
  client.dispose();
});
