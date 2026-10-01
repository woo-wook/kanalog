import * as ort from "onnxruntime-web/webgpu";
import {
  loadTextToSpeech,
  loadVoiceStyle,
  writeWavFile,
  type VoiceStyle,
} from "./vendor/supertonic/helper.js";

const scope = self as unknown as {
  location: Location;
  navigator: Navigator & { gpu?: { requestAdapter(): Promise<unknown> } };
  postMessage(data: unknown, transfer?: Transferable[]): void;
  onmessage: ((event: MessageEvent) => void) | null;
};
ort.env.wasm.wasmPaths = new URL("/tts/runtime/", scope.location.origin).href;
// Avoid cross-origin isolation requirements and keep inference off the UI thread.
ort.env.wasm.numThreads = 1;
ort.env.wasm.proxy = false;
ort.env.logLevel = "error";
const assets = "/tts/supertonic";
let engine: Awaited<ReturnType<typeof loadTextToSpeech>> | undefined;
let provider = "WASM";
const styles = new Map<string, VoiceStyle>();
const cancelled = new Set<number>();
let queue = Promise.resolve();
let activeId: number | undefined;
const progress = (id: number, message: string) => {
  if (cancelled.has(id)) throw new DOMException("취소됨", "AbortError");
  scope.postMessage({ type: "progress", id, message });
};

async function initialize(id: number) {
  // Show a useful setup error before loading the runtime/model into memory.
  const response = await fetch(`${assets}/manifest.json`);
  if (!response.ok)
    throw new Error(
      "음성 모델이 준비되지 않았습니다. tools/tts/download.py를 실행해 주세요.",
    );
  const onLoad = (_: string, current: number, total: number) => {
    scope.postMessage({
      type: "progress",
      id,
      message: `Supertonic 3 준비 중 · ${current}/${total} · 처음에는 약 401MB를 불러옵니다.`,
    });
  };
  let gpuAvailable = false;
  try {
    gpuAvailable = Boolean(await scope.navigator.gpu?.requestAdapter());
  } catch {
    /* use WASM */
  }
  if (gpuAvailable) {
    try {
      engine = await loadTextToSpeech(
        `${assets}/onnx`,
        { executionProviders: ["webgpu"], graphOptimizationLevel: "all" },
        onLoad,
      );
      provider = "WebGPU";
    } catch {
      engine = undefined;
    }
  }
  if (!engine) {
    engine = await loadTextToSpeech(
      `${assets}/onnx`,
      { executionProviders: ["wasm"], graphOptimizationLevel: "all" },
      onLoad,
    );
    provider = "WASM";
  }
}

async function generate(job: { id: number; text: string; voice: string }) {
  activeId = job.id;
  try {
    if (cancelled.has(job.id)) return;
    if (
      !job.text.trim() ||
      job.text.length > 500 ||
      !/^[FM][1-5]$/.test(job.voice)
    )
      throw new Error("음성 요청을 확인해 주세요.");
    if (!engine) await initialize(job.id);
    progress(job.id, `Supertonic 3 음성 생성 중 · ${provider}`);
    let style = styles.get(job.voice);
    if (!style) {
      style = await loadVoiceStyle([
        `${assets}/voice_styles/${job.voice}.json`,
      ]);
      styles.set(job.voice, style);
    }
    const { wav } = await engine!.textToSpeech.call(
      job.text,
      "ja",
      style,
      8,
      1,
      0.3,
      (step, total) =>
        progress(
          job.id,
          `Supertonic 3 음성 생성 중 · ${step}/${total} · ${provider}`,
        ),
    );
    if (cancelled.has(job.id)) return;
    if (!wav.length || wav.some((sample) => !Number.isFinite(sample)))
      throw new Error(
        "음성을 생성하지 못했습니다. 다른 목소리로 다시 시도해 주세요.",
      );
    const buffer = writeWavFile(wav, engine!.cfgs.ae.sample_rate);
    scope.postMessage({ type: "result", id: job.id, wav: buffer }, [buffer]);
  } catch (error) {
    if (!cancelled.has(job.id))
      scope.postMessage({
        type: "error",
        id: job.id,
        message:
          error instanceof Error
            ? error.message
            : "음성을 생성하지 못했습니다. 다시 눌러 주세요.",
      });
  } finally {
    cancelled.delete(job.id);
    activeId = undefined;
  }
}

scope.onmessage = ({ data }) => {
  if (data.type === "cancel") {
    // Only retain IDs which have a queued/in-progress generation.
    if (activeId === data.id || queued.has(data.id)) cancelled.add(data.id);
    return;
  }
  if (data.type !== "generate") return;
  queued.add(data.id);
  queue = queue.then(async () => {
    queued.delete(data.id);
    await generate(data);
  });
};
const queued = new Set<number>();
