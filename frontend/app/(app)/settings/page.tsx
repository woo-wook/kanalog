"use client";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, json, type Settings } from "@/api";
import { Loading, ErrorMessage } from "@/shell";
import { useGeneratedAudio } from "@/use-generated-audio";
import { useServerVoice } from "@/audio-runtime";
const supertonicVoices = [
  "F1",
  "F2",
  "F3",
  "F4",
  "F5",
  "M1",
  "M2",
  "M3",
  "M4",
  "M5",
];
const toggles: { key: keyof Settings; label: string; help?: string }[] = [
  {
    key: "showFurigana",
    label: "한자 위에 후리가나 표시",
    help: "단어와 예문의 한자 위에 가나 읽기를 표시합니다.",
  },
  {
    key: "showReadingHint",
    label: "정답 전에도 읽기 힌트 표시",
    help: "끄면 단어 카드의 읽기는 힌트를 누르거나 정답을 확인한 뒤 표시됩니다.",
  },
  {
    key: "showHangulHint",
    label: "한글 발음 보조 표시",
    help: "카드와 예문 아래에 표시합니다. 자동 표기는 근사값이며 일본어 읽기·음성과 함께 확인해 주세요.",
  },
  {
    key: "autoPlayAudio",
    label: "카드 음성 자동재생",
    help: "앱을 다시 열거나 새로고침한 뒤에는 처음 한 번 재생 버튼을 눌러야 할 수 있습니다.",
  },
  { key: "allowAudioBeforeReveal", label: "정답 전에 발음 듣기" },
];
export default function SettingsPage() {
  const serverVoice = useServerVoice();
  const client = useQueryClient(),
    query = useQuery({
      queryKey: ["settings"],
      queryFn: () => api<Settings>("/settings"),
    });
  const [draft, setDraft] = useState<Settings | null>(null),
    [saving, setSaving] = useState(false),
    [message, setMessage] = useState(""),
    [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const player = useRef<HTMLAudioElement | null>(null);
  const { generate, cancel, busy } = useGeneratedAudio();
  const [previewUrl, setPreviewUrl] = useState("");
  const [previewMessage, setPreviewMessage] = useState("");
  useEffect(
    () => () => {
      player.current?.pause();
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    },
    [],
  );
  useEffect(() => {
    if (!("speechSynthesis" in window)) return;
    const refresh = () =>
      setVoices(
        window.speechSynthesis
          .getVoices()
          .filter((voice) => voice.lang.toLowerCase().startsWith("ja")),
      );
    refresh();
    window.speechSynthesis.addEventListener("voiceschanged", refresh);
    return () =>
      window.speechSynthesis.removeEventListener("voiceschanged", refresh);
  }, []);
  const value = draft ?? query.data;
  async function preview() {
    if (!value) return;
    player.current?.pause();
    cancel();
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    setPreviewUrl("");
    setPreviewMessage("");
    if (value.audioEngine === "ORIGINAL") {
      setPreviewMessage("기본 음성은 학습 카드의 듣기 버튼으로 확인해 주세요.");
      return;
    }
    if (value.audioEngine === "DEVICE") {
      const voice =
        voices.find((v) => v.voiceURI === value.preferredVoice) ?? voices[0];
      if (!voice) {
        setPreviewMessage("이 기기에는 일본어 음성이 없습니다.");
        return;
      }
      const speech = new SpeechSynthesisUtterance("アイウエオ。こんにちは。");
      speech.lang = "ja-JP";
      speech.voice = voice;
      speech.rate = value.playbackSpeed;
      speech.onstart = () => setPreviewMessage("재생 중");
      speech.onend = () => setPreviewMessage("재생 완료");
      speech.onerror = (event) => {
        if (event.error !== "canceled" && event.error !== "interrupted")
          setPreviewMessage("음성을 재생하지 못했습니다.");
      };
      window.speechSynthesis.speak(speech);
      return;
    }
    try {
      const url = await generate(
        "アイウエオ。こんにちは。",
        value.supertonicVoice,
        setPreviewMessage,
      );
      if (!url || !player.current) return;
      player.current.src = url;
      player.current.playbackRate = value.playbackSpeed;
      setPreviewUrl(url);
      await player.current.play();
    } catch (error) {
      setPreviewMessage(
        error instanceof DOMException && error.name === "NotAllowedError"
          ? "아래 재생 버튼을 눌러 주세요."
          : error instanceof Error
            ? error.message
            : "음성을 재생하지 못했습니다.",
      );
    }
  }
  async function save() {
    if (!value) return;
    setSaving(true);
    setMessage("");
    try {
      const result = await api<Settings>("/settings", json("PATCH", value));
      client.setQueryData(["settings"], result);
      setDraft(null);
      setMessage("설정을 저장했습니다.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "저장하지 못했습니다.");
    } finally {
      setSaving(false);
    }
  }
  function update(patch: Partial<Settings>) {
    if (value) setDraft({ ...value, ...patch });
  }
  return (
    <div className="max-w-2xl">
      <p className="text-xs font-semibold text-primary">나에게 맞는 학습</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
        학습 설정
      </h1>
      <p className="muted mt-2 text-sm leading-relaxed">
        설정은 계정에 저장되어 다른 기기에도 적용됩니다.
      </p>
      {query.isPending ? (
        <Loading />
      ) : query.error ? (
        <ErrorMessage error={query.error} />
      ) : (
        value && (
          <div className="surface mt-6 space-y-6 p-5 sm:p-7">
            <div>
              <label htmlFor="limit" className="block font-semibold">
                하루 새 카드 수
              </label>
              <p className="muted mt-1 text-sm">
                단어가 아니라 카드 기준입니다.
              </p>
              <input
                id="limit"
                type="number"
                min="0"
                max="100"
                className="field mt-2 max-w-32"
                value={value.dailyNewLimit}
                onChange={(e) =>
                  update({ dailyNewLimit: Number(e.target.value) })
                }
              />
            </div>
            <div className="border-t border-border pt-5">
              {toggles.map((item) => (
                <label
                  key={item.key}
                  className="flex cursor-pointer items-start justify-between gap-4 py-3"
                >
                  <span>
                    <span className="block font-medium">{item.label}</span>
                    {item.help && (
                      <span className="muted mt-1 block text-sm">
                        {item.help}
                      </span>
                    )}
                  </span>
                  <input
                    type="checkbox"
                    className="mt-1 h-5 w-5 accent-primary"
                    checked={Boolean(value[item.key])}
                    onChange={(e) => update({ [item.key]: e.target.checked })}
                  />
                </label>
              ))}
            </div>
            <div className="border-t border-border pt-5">
              <label htmlFor="engine" className="block font-semibold">
                음성 엔진
              </label>
              <select
                id="engine"
                className="field mt-2"
                value={value.audioEngine}
                onChange={(e) => {
                  player.current?.pause();
                  cancel();
                  update({
                    audioEngine: e.target.value as Settings["audioEngine"],
                  });
                }}
              >
                <option value="SUPERTONIC">학습 음성 (추천)</option>
                <option value="ORIGINAL">기본 음성</option>
                <option value="DEVICE">기기 음성</option>
              </select>
              {value.audioEngine === "SUPERTONIC" && (
                <>
                  <p className="muted mt-2 text-sm">
                    {serverVoice
                      ? "이 기기에서는 작은 음성 파일만 받아 재생합니다. 인터넷 연결이 필요합니다."
                      : "처음 들을 때 약 401MB의 모델을 불러옵니다. 일본어 읽기로 음성을 생성합니다."}
                  </p>
                  <label
                    htmlFor="supertonic-voice"
                    className="mt-4 block font-semibold"
                  >
                    목소리
                  </label>
                  <select
                    id="supertonic-voice"
                    className="field mt-2"
                    value={value.supertonicVoice}
                    onChange={(e) => {
                      player.current?.pause();
                      cancel();
                      update({ supertonicVoice: e.target.value });
                    }}
                  >
                    {supertonicVoices.map((id) => (
                      <option key={id} value={id}>
                        {id.startsWith("F") ? "여성" : "남성"} {id.slice(1)}
                      </option>
                    ))}
                  </select>
                </>
              )}
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  className="btn"
                  onClick={preview}
                  disabled={busy}
                >
                  음성 미리 듣기
                </button>
                {busy && (
                  <button
                    type="button"
                    className="btn"
                    onClick={() => {
                      cancel();
                      setPreviewMessage("음성 준비를 취소했습니다.");
                    }}
                  >
                    음성 준비 취소
                  </button>
                )}
              </div>
              {previewMessage && (
                <p role="status" className="muted mt-3 text-sm">
                  {previewMessage}
                </p>
              )}
              <audio
                ref={player}
                controls
                aria-label="미리 듣기 오디오"
                className={previewUrl ? "mt-3 w-full" : "hidden"}
                onPlaying={() => setPreviewMessage("재생 중")}
                onEnded={() => setPreviewMessage("재생 완료")}
                onError={() =>
                  setPreviewMessage(
                    "음성을 재생하지 못했습니다. 다시 눌러 주세요.",
                  )
                }
              />
            </div>
            <div className="border-t border-border pt-5">
              <label htmlFor="speed" className="block font-semibold">
                재생 속도
              </label>
              <select
                id="speed"
                className="field mt-2 max-w-40"
                value={value.playbackSpeed}
                onChange={(e) =>
                  update({ playbackSpeed: Number(e.target.value) })
                }
              >
                <option value="0.75">0.75배</option>
                <option value="1">1배</option>
                <option value="1.25">1.25배</option>
              </select>
            </div>
            <div>
              <label htmlFor="voice" className="block font-semibold">
                선호 일본어 음성
              </label>
              <p className="muted mt-1 text-sm">
                이 기기에 없는 음성은 사용 가능한 일본어 음성으로 바뀝니다.
              </p>
              <select
                id="voice"
                className="field mt-2"
                value={value.preferredVoice ?? ""}
                onChange={(e) => update({ preferredVoice: e.target.value })}
              >
                <option value="">자동 선택</option>
                {voices.map((voice) => (
                  <option key={voice.voiceURI} value={voice.voiceURI}>
                    {voice.name} ({voice.lang})
                  </option>
                ))}
                {value.preferredVoice &&
                  !voices.some(
                    (voice) => voice.voiceURI === value.preferredVoice,
                  ) && (
                    <option value={value.preferredVoice}>
                      이 기기에서 사용할 수 없는 저장된 음성
                    </option>
                  )}
              </select>
            </div>
            <div>
              <label htmlFor="timezone" className="block font-semibold">
                시간대
              </label>
              <input
                id="timezone"
                className="field mt-2"
                value={value.timezone}
                onChange={(e) => update({ timezone: e.target.value })}
              />
            </div>
            <button
              className="btn btn-primary"
              onClick={save}
              disabled={saving || !draft}
            >
              {saving ? "저장 중…" : "설정 저장"}
            </button>
            {message && (
              <p role="status" className="text-sm">
                {message}
              </p>
            )}
          </div>
        )
      )}
    </div>
  );
}
