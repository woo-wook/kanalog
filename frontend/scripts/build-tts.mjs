import { build } from "esbuild";
import { mkdir, copyFile, readFile, rm, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
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
const hash = createHash("sha256").update(bundle).digest("hex").slice(0, 16);
await copyFile(`${output}/worker.js`, `${output}/worker.${hash}.js`);
await writeFile(
  "src/tts-version.ts",
  `// Updated by scripts/build-tts.mjs before dev/build/test.\nexport const TTS_WORKER_PATH = "/tts/worker.${hash}.js";\n`,
);
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
