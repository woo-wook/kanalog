import { build } from "esbuild";
import { mkdir, copyFile, readFile, rm } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";

const require = createRequire(import.meta.url);
const output = resolve("public/tts");
await mkdir(output, { recursive: true });
await build({
  entryPoints: ["src/tts-worker.ts"],
  outfile: `${output}/worker.js`,
  bundle: true,
  format: "esm",
  platform: "browser",
  target: "es2022",
  minify: true,
  conditions: ["onnxruntime-web-use-extern-wasm"],
  legalComments: "linked",
});
const runtime = dirname(require.resolve("onnxruntime-web"));
// Runtime variants change between ORT versions; derive the files from the pinned bundle.
const bundle = await readFile(`${output}/worker.js`, "utf8");
const modules = [
  ...new Set(bundle.match(/ort-wasm-simd-threaded(?:\.[a-z]+)?\.mjs/g)),
];
if (!modules.length) throw new Error("Unable to locate the ONNX WASM module");
await rm(`${output}/runtime`, { recursive: true, force: true });
await mkdir(`${output}/runtime`, { recursive: true });
for (const moduleName of modules) {
  for (const name of [moduleName, moduleName.replace(/\.mjs$/, ".wasm")]) {
    await copyFile(`${runtime}/${name}`, `${output}/runtime/${name}`);
  }
}
await copyFile(
  "src/vendor/supertonic/LICENSE",
  `${output}/Supertonic-source-LICENSE`,
);
