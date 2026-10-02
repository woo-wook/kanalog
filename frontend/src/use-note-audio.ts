"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Settings } from "./api";
import { useGeneratedAudio } from "./use-generated-audio";

export interface NoteSpeechTarget {
  noteId: string;
  key: string;
  text: string | null;
  audioId?: string | null;
}

// One player for the whole notebook: switching entries also cancels pending synthesis.
export function useNoteAudio(settings?: Settings) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const attempt = useRef(0);
  const utterance = useRef<SpeechSynthesisUtterance | null>(null);
  const [active, setActive] = useState<NoteSpeechTarget | null>(null);
  const [message, setMessage] = useState("");
  const [blocked, setBlocked] = useState(false);
  const [hasAudio, setHasAudio] = useState(false);
  const { generate, cancel, busy } = useGeneratedAudio();

  const stop = useCallback(() => {
    attempt.current++;
    const audio = audioRef.current;
    if (audio?.getAttribute("src")) {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
    }
    cancel();
    if (utterance.current && "speechSynthesis" in window)
      window.speechSynthesis.cancel();
    utterance.current = null;
    setActive(null);
    setMessage("");
    setBlocked(false);
    setHasAudio(false);
  }, [cancel]);
  const attachAudio = useCallback(
    (element: HTMLAudioElement | null) => {
      if (!element) stop();
      audioRef.current = element;
    },
    [stop],
  );
  useEffect(() => () => stop(), [stop]);

  const startAudio = useCallback((id: number) => {
    const audio = audioRef.current;
    if (!audio?.getAttribute("src")) return;
    audio
      .play()
      .then(() => {
        if (attempt.current === id) setBlocked(false);
      })
      .catch((reason: unknown) => {
        if (
          attempt.current !== id ||
          (reason instanceof DOMException && reason.name === "AbortError")
        )
          return;
        const denied =
          reason instanceof DOMException && reason.name === "NotAllowedError";
        setBlocked(denied);
        setMessage(
          denied
            ? "음성이 준비됐어요. 재생을 눌러 주세요."
            : "재생하지 못했습니다. 듣기를 다시 눌러 주세요.",
        );
      });
  }, []);
  const resume = useCallback(() => startAudio(attempt.current), [startAudio]);

  const play = useCallback(
    async (target: NoteSpeechTarget, override?: Settings["audioEngine"]) => {
      if (!settings?.audioEngine) return;
      stop();
      const id = attempt.current;
      setActive(target);
      const progress = (text: string) => {
        if (attempt.current === id) setMessage(text);
      };
      const playUrl = (url: string) => {
        if (attempt.current !== id || !audioRef.current) return;
        audioRef.current.src = url;
        audioRef.current.playbackRate = settings.playbackSpeed ?? 1;
        setHasAudio(true);
        progress("음성을 불러오는 중…");
        startAudio(id);
      };
      const engine = override ?? settings.audioEngine;
      if (engine === "ORIGINAL") {
        if (target.audioId) playUrl(`/api/media/${target.audioId}`);
        else
          progress("기본 음성이 없습니다. 설정에서 학습 음성을 선택해 주세요.");
        return;
      }
      if (!target.text) {
        progress("읽을 일본어가 없습니다.");
        return;
      }
      if (engine === "SUPERTONIC") {
        try {
          progress("음성 준비 중…");
          const url = await generate(
            target.text,
            settings.supertonicVoice ?? "F1",
            progress,
          );
          if (url) playUrl(url);
        } catch (error) {
          progress(
            error instanceof Error
              ? error.message
              : "음성을 준비하지 못했습니다. 듣기를 다시 눌러 주세요.",
          );
        }
        return;
      }
      if (!("speechSynthesis" in window)) {
        progress("이 브라우저에서는 기기 음성을 사용할 수 없습니다.");
        return;
      }
      const voices = window.speechSynthesis
        .getVoices()
        .filter((v) => v.lang.toLowerCase().startsWith("ja"));
      const voice =
        voices.find((v) => v.voiceURI === settings.preferredVoice) ?? voices[0];
      if (!voice) {
        progress(
          "일본어 음성을 불러오지 못했습니다. 잠시 후 다시 누르거나 설정에서 학습 음성을 선택해 주세요.",
        );
        return;
      }
      const speech = new SpeechSynthesisUtterance(target.text);
      utterance.current = speech;
      speech.lang = "ja-JP";
      speech.voice = voice;
      speech.rate = settings.playbackSpeed ?? 1;
      speech.onstart = () => progress("재생 중");
      speech.onend = () => progress("재생 완료");
      speech.onerror = (event) => {
        if (event.error !== "canceled" && event.error !== "interrupted")
          progress("기기 음성을 재생하지 못했습니다. 듣기를 다시 눌러 주세요.");
      };
      window.speechSynthesis.speak(speech);
    },
    [settings, stop, generate, startAudio],
  );

  return {
    attachAudio,
    active,
    message,
    blocked,
    hasAudio,
    busy,
    play,
    stop,
    resume,
    enabled: Boolean(settings?.audioEngine),
    engine: settings?.audioEngine,
    onPlaying: () => {
      setBlocked(false);
      setMessage("재생 중");
    },
    onEnded: () => setMessage("재생 완료"),
    onError: () => {
      if (audioRef.current?.getAttribute("src"))
        setMessage("재생하지 못했습니다. 듣기를 다시 눌러 주세요.");
    },
  };
}

export type NoteAudioPlayer = Omit<
  ReturnType<typeof useNoteAudio>,
  "attachAudio" | "onPlaying" | "onEnded" | "onError"
>;
