type Progress = (message: string) => void;
type Pending = {
  resolve: (blob: Blob) => void;
  reject: (error: Error) => void;
  progress?: Progress;
  cleanup: () => void;
};

export class BrowserTts {
  private worker?: Worker;
  private nextId = 0;
  private pending = new Map<number, Pending>();
  constructor(
    private factory = () => new Worker("/tts/worker.js", { type: "module" }),
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
      const timeout = setTimeout(() => {
        this.dispose(
          new Error(
            "음성 준비가 오래 걸립니다. 다시 시도하거나 MAX 음성을 들어 주세요.",
          ),
        );
      }, 180_000);
      this.pending.set(id, {
        resolve,
        reject,
        progress,
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
