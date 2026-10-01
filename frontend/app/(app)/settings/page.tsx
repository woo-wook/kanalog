"use client";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, json, type Settings } from "@/api";
import { Loading, ErrorMessage } from "@/shell";
const toggles: { key: keyof Settings; label: string; help?: string }[] = [
  { key: "showReadingHint", label: "가나 읽기를 처음부터 표시" },
  {
    key: "showHangulHint",
    label: "한글 발음 보조 표시",
    help: "일본어 발음의 근사 표기입니다.",
  },
  { key: "autoPlayAudio", label: "카드 음성 자동재생" },
  { key: "allowAudioBeforeReveal", label: "정답 전에 발음 듣기" },
  {
    key: "ttsFallback",
    label: "원본 음성이 없을 때 브라우저 일본어 음성 사용",
  },
];
export default function SettingsPage() {
  const client = useQueryClient(),
    query = useQuery({
      queryKey: ["settings"],
      queryFn: () => api<Settings>("/settings"),
    });
  const [draft, setDraft] = useState<Settings | null>(null),
    [saving, setSaving] = useState(false),
    [message, setMessage] = useState(""),
    [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  useEffect(() => {
    if (!("speechSynthesis" in window)) return;
    const refresh = () => setVoices(window.speechSynthesis.getVoices()
      .filter((voice) => voice.lang.toLowerCase().startsWith("ja")));
    refresh();
    window.speechSynthesis.addEventListener("voiceschanged", refresh);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", refresh);
  }, []);
  const value = draft ?? query.data;
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
      <h1 className="text-3xl font-bold">학습 설정</h1>
      <p className="muted mt-2">
        설정은 계정에 저장되어 다른 기기에도 적용됩니다.
      </p>
      {query.isPending ? (
        <Loading />
      ) : query.error ? (
        <ErrorMessage error={query.error} />
      ) : (
        value && (
          <div className="surface mt-6 space-y-6 p-6">
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
            <div className="border-t pt-5">
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
                    className="mt-1 h-5 w-5 accent-[#2e7167]"
                    checked={Boolean(value[item.key])}
                    onChange={(e) => update({ [item.key]: e.target.checked })}
                  />
                </label>
              ))}
            </div>
            <div className="border-t pt-5">
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
                {value.preferredVoice && !voices.some((voice) => voice.voiceURI === value.preferredVoice) && (
                  <option value={value.preferredVoice}>이 기기에서 사용할 수 없는 저장된 음성</option>
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
