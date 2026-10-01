import { expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import { TTS_WORKER_PATH } from "./tts-version";

it("배포마다 달라지는 worker 주소가 실제 번들의 코드 해시와 일치한다", () => {
  const bundle = readFileSync(resolve("public/tts/worker.js"));
  const hash = createHash("sha256").update(bundle).digest("hex").slice(0, 16);
  expect(TTS_WORKER_PATH).toBe(`/tts/worker.${hash}.js`);
  expect(readFileSync(resolve("public", TTS_WORKER_PATH.slice(1)))).toEqual(
    bundle,
  );
});

it("worker가 요청하는 실제 ONNX 런타임 모듈과 WASM을 함께 제공한다", () => {
  const bundle = readFileSync(resolve("public/tts/worker.js"), "utf8");
  const modules = [
    ...new Set(bundle.match(/ort-wasm-simd-threaded(?:\.[a-z]+)?\.mjs/g)),
  ];
  expect(modules.length).toBeGreaterThan(0);
  for (const moduleName of modules) {
    expect(
      existsSync(resolve("public/tts/runtime", moduleName)),
      moduleName,
    ).toBe(true);
    const wasm = moduleName.replace(/\.mjs$/, ".wasm");
    expect(existsSync(resolve("public/tts/runtime", wasm)), wasm).toBe(true);
  }
});
