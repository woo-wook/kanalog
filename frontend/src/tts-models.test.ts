// @vitest-environment node
import { afterEach, expect, it, vi } from "vitest";
import { downloadModel } from "./tts-models";

afterEach(() => vi.unstubAllGlobals());

it("모델을 청크로 읽고 실제 다운로드 크기를 표시한다", async () => {
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(new Uint8Array([1, 2]));
      controller.enqueue(new Uint8Array([3, 4]));
      controller.close();
    },
  });
  const fetcher = vi.fn().mockResolvedValue(new Response(stream));
  vi.stubGlobal("fetch", fetcher);
  const progress = vi.fn();
  expect(
    await downloadModel(
      "/model.onnx",
      { bytes: 4, sha256: "fixture-hash" },
      progress,
    ),
  ).toEqual(new Uint8Array([1, 2, 3, 4]));
  expect(fetcher.mock.calls[0]![0]).toBe("/model.onnx?v=fixture-hash");
  expect(progress.mock.calls).toEqual([
    [0, 4],
    [2, 4],
    [4, 4],
  ]);
});

it("중단되거나 크기가 다른 파일은 추론에 전달하지 않는다", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(new Response(new Uint8Array([1, 2]))),
  );
  await expect(
    downloadModel("/model.onnx", { bytes: 4, sha256: "hash" }, vi.fn()),
  ).rejects.toThrow("다운로드가 중단");
  await expect(
    downloadModel("/model.onnx", { bytes: 0, sha256: "hash" }, vi.fn()),
  ).rejects.toThrow("음성 파일 정보");
});

it("파일 HTTP 오류를 사용자 오류로 반환하고 다음 시도에서 다시 받는다", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValueOnce(new Response("missing", { status: 404 }))
      .mockResolvedValueOnce(new Response(new Uint8Array([1, 2]))),
  );
  const file = { bytes: 2, sha256: "hash" };
  await expect(downloadModel("/model.onnx", file, vi.fn())).rejects.toThrow(
    "음성 파일을 받지 못했습니다",
  );
  expect(await downloadModel("/model.onnx", file, vi.fn())).toEqual(
    new Uint8Array([1, 2]),
  );
});
