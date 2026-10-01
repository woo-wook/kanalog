import { TTS_WORKER_PATH } from "./tts-version";

type Progress = (message: string) => void;
type Pending = {
  resolve: (blob: Blob) => void;
  reject: (error: Error) => void;
  progress?: Progress;
  cleanup: () => void;
  touch: () => void;
};

export class BrowserTts {
  private worker?: Worker;
  private nextId = 0;
  private pending = new Map<number, Pending>();
  constructor(
    private factory = () => new Worker(TTS_WORKER_PATH, { type: "module" }),
  ) {}

  generate(
    text: string,
    voice: string,
    signal?: AbortSignal,
    progress?: Progress,
  ): Promise<Blob> {
    if (!text.trim() || text.length > 500)
      return Promise.reject(
        new Error("음성으로 읽을 일본어는 1~500자여야 합니다."),
      );
    if (signal?.aborted)
      return Promise.reject(new DOMException("취소됨", "AbortError"));
    if (!this.worker) {
      this.worker = this.factory();
      this.worker.onmessage = ({ data }) => {
        const entry = this.pending.get(data.id);
        if (!entry) return;
        if (data.type === "progress") {
          entry.touch();
          entry.progress?.(data.message);
          return;
        }
        entry.cleanup();
        this.pending.delete(data.id);
        if (data.type === "result")
          entry.resolve(new Blob([data.wav], { type: "audio/wav" }));
        else
          entry.reject(
            new Error(data.message || "음성을 생성하지 못했습니다."),
          );
      };
      this.worker.onerror = () =>
        this.dispose(
          new Error("음성 모델을 불러오지 못했습니다. 다시 눌러 주세요."),
        );
    }
    const id = ++this.nextId;
    return new Promise((resolve, reject) => {
      const abort = () => {
        this.worker?.postMessage({ type: "cancel", id });
        const entry = this.pending.get(id);
        entry?.cleanup();
        this.pending.delete(id);
        reject(new DOMException("취소됨", "AbortError"));
      };
      const expire = () => {
        this.dispose(
          new Error(
            "음성 준비가 중단됐습니다. 연결 상태를 확인하고 다시 눌러 주세요.",
          ),
        );
      };
      let timeout = setTimeout(expire, 180_000);
      this.pending.set(id, {
        resolve,
        reject,
        progress,
        touch: () => {
          clearTimeout(timeout);
          timeout = setTimeout(expire, 180_000);
        },
        cleanup: () => {
          clearTimeout(timeout);
          signal?.removeEventListener("abort", abort);
        },
      });
      signal?.addEventListener("abort", abort, { once: true });
      this.worker!.postMessage({ type: "generate", id, text, voice });
    });
  }

  dispose(reason: Error = new DOMException("취소됨", "AbortError")) {
    this.worker?.terminate();
    this.worker = undefined;
    for (const entry of this.pending.values()) {
      entry.cleanup();
      entry.reject(reason);
    }
    this.pending.clear();
  }
}

let client: BrowserTts | undefined;
export function browserTts() {
  return (client ??= new BrowserTts());
}
