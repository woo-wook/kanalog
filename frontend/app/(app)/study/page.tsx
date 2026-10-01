"use client";
import Link from "next/link";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  api,
  json,
  type Rating,
  type Settings,
  type StudyCard,
  type StudySession,
  type ReviewResult,
  type ApiError,
} from "@/api";
import { Loading, ErrorMessage } from "@/shell";
const ratings: { value: Rating; label: string }[] = [
  { value: "AGAIN", label: "다시" },
  { value: "HARD", label: "어려움" },
  { value: "GOOD", label: "보통" },
  { value: "EASY", label: "쉬움" },
];
function StudyContent() {
  const params = useSearchParams(),
    deckId = params.get("deckId");
  const queryClient = useQueryClient();
  const settings = useQuery({
    queryKey: ["settings"],
    queryFn: () => api<Settings>("/settings"),
  });
  const [session, setSession] = useState<StudySession | null>(null),
    [loading, setLoading] = useState(true),
    [startError, setStartError] = useState<unknown>(null),
    [index, setIndex] = useState(0),
    [revealed, setRevealed] = useState(false),
    [hint, setHint] = useState(false),
    [saving, setSaving] = useState(false),
    [error, setError] = useState<unknown>(null),
    [audioMessage, setAudioMessage] = useState(""),
    [retry, setRetry] = useState<{ rating: Rating; key: string } | null>(null),
    [uniqueCards, setUniqueCards] = useState<string[]>([]),
    [nextDue, setNextDue] = useState<string | null>(null),
    [refreshing, setRefreshing] = useState(false),
    [counts, setCounts] = useState<Record<Rating, number>>({
      AGAIN: 0,
      HARD: 0,
      GOOD: 0,
      EASY: 0,
    });
  const audio = useRef<HTMLAudioElement | null>(null);
  const savingRef = useRef(false);
  const started = useRef(false);
  useEffect(() => {
    if (started.current || !deckId) return;
    started.current = true;
    api<StudySession>("/study/sessions", json("POST", { deckId }))
      .then(setSession)
      .catch(setStartError)
      .finally(() => setLoading(false));
  }, [deckId]);
  const card = session?.cards[index];
  const stopAudio = useCallback(() => {
    audio.current?.pause();
    if (audio.current) audio.current.currentTime = 0;
    if (typeof window !== "undefined" && "speechSynthesis" in window)
      window.speechSynthesis.cancel();
  }, []);
  useEffect(() => () => stopAudio(), [stopAudio]);
  const play = useCallback(
    (item: StudyCard, example?: { audioId?: string | null; japanese?: string | null }) => {
      stopAudio();
      setAudioMessage("");
      const id = example ? example.audioId : item.audioId;
      const text = example ? example.japanese : item.front;
      if (id) {
        const player = new Audio(`/api/media/${id}`);
        player.playbackRate = settings.data?.playbackSpeed ?? 1;
        audio.current = player;
        player
          .play()
          .catch(() =>
            setAudioMessage("음성을 재생할 수 없습니다. 파일을 확인해 주세요."),
          );
        return;
      }
      if (
        !settings.data?.ttsFallback ||
        !text ||
        !("speechSynthesis" in window)
      ) {
        setAudioMessage("이 항목의 음성을 사용할 수 없습니다.");
        return;
      }
      const voices = window.speechSynthesis.getVoices();
      const japaneseVoices = voices.filter((v) => v.lang.toLowerCase().startsWith("ja"));
      const voice = japaneseVoices.find((v) => v.voiceURI === settings.data?.preferredVoice)
        ?? japaneseVoices[0];
      if (!voice) {
        if (voices.length === 0) {
          setAudioMessage("음성 목록을 불러오는 중입니다. 잠시 후 다시 눌러 주세요.");
          window.speechSynthesis.addEventListener(
            "voiceschanged",
            () => setAudioMessage("음성 목록이 준비되었습니다. 다시 눌러 주세요."),
            { once: true },
          );
        } else {
          setAudioMessage("이 기기에는 일본어 음성이 없습니다. 원본 음성이 있는 카드를 이용해 주세요.");
        }
        return;
      }
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.voice = voice;
      utterance.lang = "ja-JP";
      utterance.rate = settings.data.playbackSpeed;
      window.speechSynthesis.speak(utterance);
    },
    [settings.data, stopAudio],
  );
  useEffect(() => {
    if (
      card &&
      settings.data?.autoPlayAudio &&
      settings.data.allowAudioBeforeReveal
    ) {
      const timer = setTimeout(() => play(card), 0);
      return () => clearTimeout(timer);
    }
  }, [
    card,
    settings.data?.autoPlayAudio,
    settings.data?.allowAudioBeforeReveal,
    play,
  ]);
  const submit = useCallback(
    async (rating: Rating, existingKey?: string) => {
      if (!session || !card || savingRef.current) return;
      const key = existingKey ?? crypto.randomUUID();
      savingRef.current = true;
      setRetry({ rating, key });
      setSaving(true);
      setError(null);
      try {
        const result = await api<ReviewResult>(
          "/study/reviews",
          json("POST", {
            sessionId: session.id,
            cardId: card.id,
            version: card.version,
            rating,
            idempotencyKey: key,
          }),
        );
        setCounts((previous) => ({
          ...previous,
          [rating]: previous[rating] + 1,
        }));
        setUniqueCards((previous) => previous.includes(card.id) ? previous : [...previous, card.id]);
        setNextDue(result.due);
        setIndex((previous) => previous + 1);
        setRevealed(false);
        setHint(false);
        setRetry(null);
        stopAudio();
        queryClient.invalidateQueries({ queryKey: ["dashboard"] });
        queryClient.invalidateQueries({ queryKey: ["stats"] });
        queryClient.invalidateQueries({ queryKey: ["decks"] });
      } catch (e) {
        setError(e);
      } finally {
        savingRef.current = false;
        setSaving(false);
      }
    },
    [session, card, stopAudio, queryClient],
  );
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (
        target.isContentEditable ||
        ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) ||
        e.altKey ||
        e.ctrlKey ||
        e.metaKey
      )
        return;
      if (e.code === "Space" && !revealed && card) {
        e.preventDefault();
        setRevealed(true);
      } else if (
        revealed &&
        card &&
        !saving &&
        /^[1-4]$/.test(e.key) &&
        !retry
      ) {
        e.preventDefault();
        submit(ratings[Number(e.key) - 1]!.value);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [revealed, card, saving, retry, submit]);
  if (!deckId) return <ErrorMessage error={new Error("덱을 선택해 주세요.")} />;
  if (loading || settings.isPending) return <Loading />;
  if (startError || settings.error)
    return <ErrorMessage error={startError ?? settings.error} />;
  if (!session)
    return <ErrorMessage error={new Error("학습 세션을 만들지 못했습니다.")} />;
  if (!card) {
    const answerCount = Object.values(counts).reduce((a, b) => a + b, 0);
    const refreshDue = async () => {
      setRefreshing(true);
      setError(null);
      try {
        const current = await api<StudySession>(`/study/sessions/${session.id}`);
        setSession(current);
        setIndex(0);
      } catch (e) {
        setError(e);
      } finally {
        setRefreshing(false);
      }
    };
    return (
      <div className="surface mx-auto max-w-2xl p-7 text-center">
        <h1 className="text-2xl font-bold">이번 학습을 마쳤습니다</h1>
        <p className="muted mt-4">
          학습한 고유 카드 {uniqueCards.length}장 · 답변 {answerCount}회
        </p>
        <div className="mt-5 grid grid-cols-4 gap-2 text-sm">
          {ratings.map((r) => (
            <div key={r.value} className="rounded-xl bg-[#f3f6f3] p-3">
              {r.label}
              <strong className="mt-1 block text-xl">{counts[r.value]}</strong>
            </div>
          ))}
        </div>
        <p className="muted mt-5 text-sm">
          다시 평가한 카드는 복습 시각이 되면 같은 세션에서 이어서 학습할 수 있습니다.
        </p>
        {nextDue && <p className="muted mt-2 text-sm">최근 카드의 다음 복습: {new Date(nextDue).toLocaleString("ko-KR")}</p>}
        <button className="btn mt-5" onClick={refreshDue} disabled={refreshing}>
          {refreshing ? "확인 중…" : "복습할 카드 다시 확인"}
        </button>
        {error !== null && <p role="alert" className="mt-3 text-sm text-[#993d36]">복습 카드를 불러오지 못했습니다. 다시 눌러 주세요.</p>}
        <div className="mt-6 flex justify-center gap-3">
          <Link className="btn btn-primary" href="/">
            홈으로
          </Link>
          <Link className="btn" href="/stats">
            통계 보기
          </Link>
        </div>
      </div>
    );
  }
  const canHearBefore = revealed || settings.data?.allowAudioBeforeReveal;
  const hasSound = Boolean(card.audioId || settings.data?.ttsFallback);
  const examples = card.examples?.length ? card.examples : card.example
    ? [{ japanese: card.example, korean: card.exampleMeaning, audioId: card.exampleAudioId }]
    : [];
  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-5 flex items-center justify-between text-sm muted">
        <span>{card.kind.toLowerCase() === "grammar" ? "문법 회상" : "어휘 인식"}</span>
        <span>
          {index + 1} / {session.cards.length}
        </span>
      </div>
      <article className="surface min-h-[360px] p-6 sm:p-9">
        <div className="text-center">
          <p className="muted text-sm">
            {revealed ? "정답" : "일본어를 보고 뜻을 떠올려 보세요"}
          </p>
          <h1 className="jp mt-7 text-5xl font-semibold leading-tight sm:text-6xl">
            {card.front}
          </h1>
          {card.reading &&
            (revealed || settings.data?.showReadingHint || hint) && (
              <p className="jp mt-4 text-xl text-[#536b60]">{card.reading}</p>
            )}
          {!revealed && card.reading && !settings.data?.showReadingHint && (
            <button
              onClick={() => setHint(true)}
              className="mt-4 text-sm font-semibold text-[#2e7167]"
            >
              읽기 힌트 보기
            </button>
          )}
          {revealed && settings.data?.showHangulHint && card.hangulHint && (
            <p className="muted mt-2 text-sm">
              한글 발음 보조: {card.hangulHint}{" "}
              <span className="text-xs">(근사 표기)</span>
            </p>
          )}
        </div>
        {canHearBefore && hasSound && (
          <div className="mt-5 text-center">
            <button
              type="button"
              className="btn"
              onClick={() => play(card)}
              aria-label="단어 발음 듣기"
            >
              ▶ 발음 듣기
            </button>
          </div>
        )}
        {audioMessage && (
          <p role="status" className="muted mt-3 text-center text-sm">
            {audioMessage}
          </p>
        )}
        {revealed && (
          <div className="mt-8 border-t border-[#dce4df] pt-6">
            <h2 className="text-2xl font-bold">
              {card.meaning || "뜻 정보 없음"}
            </h2>
            {card.partOfSpeech && (
              <p className="muted mt-2 text-sm">품사: {card.partOfSpeech}</p>
            )}
            {examples.map((example, exampleIndex) => (
              <div key={exampleIndex} className="mt-5 rounded-xl bg-[#f4f7f4] p-4">
                <p className="jp text-lg">{example.japanese}</p>
                {"reading" in example && example.reading && (
                  <p className="jp muted mt-2">{example.reading}</p>
                )}
                {example.korean && <p className="muted mt-2">{example.korean}</p>}
                {example.audioId && (
                  <button
                    className="mt-3 text-sm font-semibold text-[#2e7167]"
                    onClick={() => play(card, example)}
                    aria-label={`${exampleIndex + 1}번 예문 듣기`}
                  >
                    ▶ 예문 듣기
                  </button>
                )}
              </div>
            ))}
            {card.explanation && (
              <div className="mt-5">
                <h3 className="text-sm font-bold">설명</h3>
                <p className="mt-2 whitespace-pre-wrap">{card.explanation}</p>
              </div>
            )}
          </div>
        )}
      </article>
      {!revealed ? (
        <button
          onClick={() => setRevealed(true)}
          className="btn btn-primary mt-5 w-full py-4 text-lg"
        >
          정답 보기 <span className="text-sm opacity-70">Space</span>
        </button>
      ) : (
        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {ratings.map((r, i) => (
            <button
              key={r.value}
              className={`btn min-h-16 ${r.value === "GOOD" ? "btn-primary" : ""}`}
              disabled={saving || Boolean(retry)}
              onClick={() => submit(r.value)}
            >
              {r.label}
              <span className="text-xs opacity-70">{i + 1}</span>
            </button>
          ))}
        </div>
      )}
      {saving && (
        <p className="muted mt-3 text-center" role="status">
          학습 기록 저장 중…
        </p>
      )}
      {error !== null && (
        <div
          className="mt-4 rounded-xl border border-[#e7c4bd] bg-white p-4 text-sm text-[#993d36]"
          role="alert"
        >
          <p>
            {(error as ApiError).status === 409
              ? "다른 화면에서 이 카드가 변경됐습니다. 새로고침 후 계속해 주세요."
              : error instanceof Error
                ? error.message
                : "저장하지 못했습니다."}
          </p>
          {retry && (error as ApiError).status !== 409 && (
            <button
              className="btn btn-danger mt-3"
              onClick={() => submit(retry.rating, retry.key)}
            >
              같은 답변 다시 저장
            </button>
          )}
        </div>
      )}
    </div>
  );
}
export default function StudyPage() {
  return (
    <Suspense fallback={<Loading />}>
      <StudyContent />
    </Suspense>
  );
}
