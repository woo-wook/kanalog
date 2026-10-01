import { expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

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
