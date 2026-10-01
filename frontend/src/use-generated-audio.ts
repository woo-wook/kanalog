"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { browserTts } from "./browser-tts";
import { serverSpeech } from "./server-speech";
import { usesServerSpeech } from "./audio-runtime";

export function useGeneratedAudio() {
  const request = useRef<AbortController | null>(null);
  const url = useRef<string | null>(null);
  const [busy, setBusy] = useState(false);
  const cleanup = useCallback(() => {
    request.current?.abort();
    request.current = null;
    if (url.current) URL.revokeObjectURL(url.current);
    url.current = null;
  }, []);
  const cancel = useCallback(() => {
    cleanup();
    setBusy(false);
  }, [cleanup]);
  useEffect(() => cleanup, [cleanup]);
  const generate = useCallback(
    async (
      text: string,
      voice: string,
      progress: (message: string) => void,
    ) => {
      cleanup();
      const controller = new AbortController();
      request.current = controller;
      setBusy(true);
      try {
        let audio: Blob;
        if (usesServerSpeech(navigator)) {
          progress("음성 준비 중…");
          audio = await serverSpeech(text, voice, controller.signal);
        } else {
          audio = await browserTts().generate(
            text,
            voice,
            controller.signal,
            progress,
          );
        }
        if (controller.signal.aborted) return;
        url.current = URL.createObjectURL(audio);
        return url.current;
      } catch (error) {
        if (controller.signal.aborted) return;
        throw error;
      } finally {
        if (request.current === controller) setBusy(false);
      }
    },
    [cleanup],
  );
  return { generate, cancel, busy };
}
