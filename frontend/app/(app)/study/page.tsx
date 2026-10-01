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
import { canPlayExample, speechText } from "@/speech";
import { useGeneratedAudio } from "@/use-generated-audio";
import { StudyNextStep } from "@/study-next-step";
const ratings: { value: Rating; label: string }[] = [
  { value: "AGAIN", label: "다시" },
  { value: "HARD", label: "어려움" },
  { value: "GOOD", label: "보통" },
  { value: "EASY", label: "쉬움" },
];
function StudyContent() {
  const params = useSearchParams(),
    deckId = params.get("deckId"),
    lessonId = params.get("lessonId");
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
    [audioUrl, setAudioUrl] = useState(""),
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
  const { generate, cancel, busy: generating } = useGeneratedAudio();
  const savingRef = useRef(false);
  const started = useRef(false);
  useEffect(() => {
    if (started.current || (!deckId && !lessonId)) return;
    started.current = true;
    const selected = lessonId
      ? api(`/courses/lessons/${lessonId}/select`, { method: "POST" })
      : Promise.resolve();
    selected
      .then(() =>
        api<StudySession>(
          "/study/sessions",
          json("POST", lessonId ? { lessonId } : { deckId }),
        ),
      )
      .then(setSession)
      .catch(setStartError)
      .finally(() => setLoading(false));
  }, [deckId, lessonId]);
  const card = session?.cards[index];
  const stopAudio = useCallback(() => {
    cancel();
    audio.current?.pause();
    if (audio.current) audio.current.currentTime = 0;
    if (typeof window !== "undefined" && "speechSynthesis" in window)
      window.speechSynthesis.cancel();
  }, [cancel]);
  useEffect(() => () => stopAudio(), [stopAudio]);
  useEffect(() => {
    if ("speechSynthesis" in window) window.speechSynthesis.getVoices();
  }, []);
  const play = useCallback(
    async (
      item: StudyCard,
      example?: { audioId?: string | null; japanese?: string | null },
      override?: Settings["audioEngine"],
    ) => {
      stopAudio();
      setAudioUrl("");
      setAudioMessage("");
      const id = example ? example.audioId : item.audioId;
      const text = speechText(item, example);
      const selectedEngine =
        override ?? settings.data?.audioEngine ?? "SUPERTONIC";
      function playUrl(url: string) {
        const player = audio.current;
        if (!player) return;
        player.src = url;
        player.muted = false;
        player.volume = 1;
        player.playbackRate = settings.data?.playbackSpeed ?? 1;
        setAudioUrl(url);
        setAudioMessage("음성을 불러오는 중…");
        player.play().catch((reason: unknown) => {
          if (reason instanceof DOMException && reason.name === "AbortError")
            return;
          setAudioMessage(
            reason instanceof DOMException && reason.name === "NotAllowedError"
              ? "브라우저가 자동재생을 막았습니다. 아래 재생 버튼을 눌러 주세요."
              : "음성을 재생하지 못했습니다. 다시 눌러 주세요.",
          );
        });
      }
      if (selectedEngine === "ORIGINAL") {
        if (id) playUrl(`/api/media/${id}`);
        else
          setAudioMessage(
            "이 항목에는 기본 음성이 없습니다. 다른 재생 방식을 선택해 주세요.",
          );
        return;
      }
      if (!text) {
        setAudioMessage(
          "이 항목에는 읽을 일본어가 없습니다. 일본어 예문에서 듣기를 눌러 주세요.",
        );
        return;
      }
      if (selectedEngine === "SUPERTONIC") {
        try {
          const url = await generate(
            text,
            settings.data?.supertonicVoice ?? "F1",
            setAudioMessage,
          );
          if (url) playUrl(url);
        } catch (error) {
          setAudioMessage(
            error instanceof Error
              ? error.message
              : "음성을 생성하지 못했습니다. 기본 음성이나 기기 음성을 들어 주세요.",
          );
        }
        return;
      }
      if (!("speechSynthesis" in window)) {
        setAudioMessage("이 브라우저에서는 기기 음성을 사용할 수 없습니다.");
        return;
      }
      const voices = window.speechSynthesis.getVoices();
      const japaneseVoices = voices.filter((v) =>
        v.lang.toLowerCase().startsWith("ja"),
      );
      const voice =
        japaneseVoices.find(
          (v) => v.voiceURI === settings.data?.preferredVoice,
        ) ?? japaneseVoices[0];
      if (!voice) {
        setAudioMessage(
          voices.length === 0
            ? "음성 목록을 불러오는 중입니다. 잠시 후 다시 눌러 주세요."
            : "이 기기에는 일본어 음성이 없습니다. 학습 음성이나 기본 음성을 이용해 주세요.",
        );
        return;
      }
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.voice = voice;
      utterance.lang = "ja-JP";
      utterance.rate = settings.data?.playbackSpeed ?? 1;
      utterance.onstart = () => setAudioMessage("재생 중");
      utterance.onend = () => setAudioMessage("재생 완료");
      utterance.onerror = (event) => {
        if (event.error !== "canceled" && event.error !== "interrupted")
          setAudioMessage("기기 음성을 재생하지 못했습니다. 다시 눌러 주세요.");
      };
      window.speechSynthesis.speak(utterance);
    },
    [settings.data, stopAudio, generate],
  );
  const autoPlaybackAllowed =
    settings.data?.autoPlayAudio &&
    (settings.data.allowAudioBeforeReveal || revealed);
  useEffect(() => {
    if (card && autoPlaybackAllowed) {
      const timer = setTimeout(() => play(card), 0);
      return () => clearTimeout(timer);
    }
  }, [card, autoPlaybackAllowed, play]);
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
        setUniqueCards((previous) =>
          previous.includes(card.id) ? previous : [...previous, card.id],
        );
        setNextDue(result.due);
        setIndex((previous) => previous + 1);
        setRevealed(false);
        setHint(false);
        setAudioUrl("");
        setAudioMessage("");
        setRetry(null);
        stopAudio();
        queryClient.invalidateQueries({ queryKey: ["dashboard"] });
        queryClient.invalidateQueries({ queryKey: ["stats"] });
        queryClient.invalidateQueries({ queryKey: ["decks"] });
        queryClient.invalidateQueries({ queryKey: ["courses"] });
        queryClient.invalidateQueries({ queryKey: ["curriculum"] });
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
  if (!deckId && !lessonId)
    return (
      <div>
        <ErrorMessage error={new Error("학습할 레슨을 골라 주세요.")} />
        <Link className="btn mt-4" href="/courses">
          학습 코스 보기
        </Link>
      </div>
    );
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
        const current = await api<StudySession>(
          `/study/sessions/${session.id}`,
        );
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
          다시 평가한 카드는 복습 시각이 되면 같은 세션에서 이어서 학습할 수
          있습니다.
        </p>
        {nextDue && (
          <p className="muted mt-2 text-sm">
            최근 카드의 다음 복습: {new Date(nextDue).toLocaleString("ko-KR")}
          </p>
        )}
        <button className="btn mt-5" onClick={refreshDue} disabled={refreshing}>
          {refreshing ? "확인 중…" : "복습할 카드 다시 확인"}
        </button>
        {error !== null && (
          <p role="alert" className="mt-3 text-sm text-[#993d36]">
            복습 카드를 불러오지 못했습니다. 다시 눌러 주세요.
          </p>
        )}
        <StudyNextStep lessonId={lessonId} />
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link className="btn btn-primary" href="/">
            홈으로
          </Link>
          <Link className="btn" href="/stats">
            통계 보기
          </Link>
          <Link className="btn" href="/courses">
            다음 레슨 고르기
          </Link>
        </div>
      </div>
    );
  }
  const canHearBefore = revealed || settings.data?.allowAudioBeforeReveal;
  const isKana = ["katakana", "hiragana"].includes(card.kind);
  const hasSound = Boolean(
    card.audioId ||
    (card.kind !== "grammar" && settings.data?.audioEngine !== "ORIGINAL") ||
    (isKana && settings.data?.audioEngine !== "ORIGINAL"),
  );
  const examples = card.examples?.length
    ? card.examples
    : card.example
      ? [
          {
            japanese: card.example,
            korean: card.exampleMeaning,
            audioId: card.exampleAudioId,
          },
        ]
      : [];
  return (
    <div className="study-screen mx-auto max-w-2xl">
      <div className="study-progress mb-3 flex shrink-0 items-center justify-between gap-3 text-xs muted sm:text-sm">
        <span className="min-w-0 truncate">
          {session.lessonTitle ??
            (isKana
              ? "문자 읽기"
              : card.kind === "grammar"
                ? "문법 회상"
                : "단어 연습")}
        </span>
        <span className="shrink-0 rounded-full bg-primary/8 px-2.5 py-1 font-semibold tabular-nums text-primary">
          {index + 1} / {session.cards.length}
        </span>
      </div>
      <article className="study-card surface p-4 sm:p-8" aria-label="학습 카드">
        <div className="text-center">
          <p className="muted text-xs sm:text-sm">
            {revealed
              ? "정답"
              : isKana
                ? "이 문자는 어떻게 읽을까요?"
                : card.kind === "grammar"
                  ? "질문을 보고 답을 떠올려 보세요"
                  : "일본어를 보고 뜻을 떠올려 보세요"}
          </p>
          <h1
            className={`study-prompt jp mt-4 font-semibold leading-tight ${isKana ? "study-prompt-kana text-7xl" : "text-4xl sm:text-5xl"}`}
          >
            {card.front}
          </h1>
          {((card.reading &&
            (revealed || settings.data?.showReadingHint || hint)) ||
            (revealed &&
              (isKana ||
                (settings.data?.showHangulHint && card.hangulHint)))) && (
            <div className="study-reading mx-auto mt-4 flex w-fit max-w-full items-center justify-center gap-6 rounded-2xl bg-primary/5 px-5 py-3">
              {card.reading &&
                (revealed || settings.data?.showReadingHint || hint) && (
                  <div className="min-w-0">
                    <span className="block text-[11px] font-medium text-muted-foreground">
                      {isKana ? "로마자" : "가나 읽기"}
                    </span>
                    <p className="jp mt-1 text-xl font-medium text-foreground">
                      {card.reading}
                    </p>
                  </div>
                )}
              {revealed &&
                (isKana ||
                  (settings.data?.showHangulHint && card.hangulHint)) && (
                  <div className="min-w-0 border-l border-primary/15 pl-6">
                    <span className="block text-[11px] font-medium text-muted-foreground">
                      근사 발음
                    </span>
                    <p className="mt-1 text-2xl font-semibold text-primary">
                      {card.hangulHint ?? (isKana ? card.meaning : "")}
                    </p>
                  </div>
                )}
            </div>
          )}
          {!revealed &&
            card.reading &&
            !settings.data?.showReadingHint &&
            !hint && (
              <button
                onClick={() => setHint(true)}
                className="mt-2 min-h-11 px-3 text-sm font-medium text-primary"
              >
                읽기 힌트 보기
              </button>
            )}
        </div>
        {canHearBefore && hasSound && (
          <div className="study-voice-controls mt-3 flex flex-wrap items-center justify-center gap-1.5 text-center">
            <button
              type="button"
              className="btn rounded-full bg-primary/10 px-4 text-primary"
              onClick={() => play(card)}
              aria-label={isKana ? "글자 발음 듣기" : "단어 발음 듣기"}
            >
              ▶ 발음 듣기
            </button>
            <div className="flex flex-wrap items-center justify-center gap-1.5">
              {card.audioId && settings.data?.audioEngine !== "ORIGINAL" && (
                <button
                  type="button"
                  className="btn rounded-full px-3 text-xs"
                  aria-label="기본 음성 듣기"
                  onClick={() => play(card, undefined, "ORIGINAL")}
                >
                  기본 음성
                </button>
              )}
              {card.kind !== "grammar" &&
                settings.data?.audioEngine !== "DEVICE" && (
                  <button
                    type="button"
                    className="min-h-11 rounded-full px-3 text-xs text-muted-foreground hover:bg-secondary"
                    aria-label="기기 음성 듣기"
                    onClick={() => play(card, undefined, "DEVICE")}
                  >
                    기기 음성
                  </button>
                )}
              {generating && (
                <button
                  type="button"
                  className="min-h-11 px-3 text-xs text-primary"
                  onClick={() => {
                    stopAudio();
                    setAudioMessage("음성 준비를 취소했습니다.");
                  }}
                >
                  음성 준비 취소
                </button>
              )}
            </div>
          </div>
        )}
        {!hasSound && (
          <p className="muted mt-5 text-center text-sm">
            이 항목에는 재생할 음성이 없습니다.
          </p>
        )}
        {audioMessage && (
          <p role="status" className="muted mt-2 text-center text-xs">
            {audioMessage}
          </p>
        )}
        <audio
          ref={audio}
          controls
          preload="none"
          aria-label="현재 발음 오디오"
          className={audioUrl ? "mx-auto mt-3 w-full max-w-sm" : "hidden"}
          onPlaying={() => setAudioMessage("재생 중")}
          onEnded={() => setAudioMessage("재생 완료")}
          onPause={() => {
            if (
              audio.current &&
              audio.current.currentTime > 0 &&
              !audio.current.ended
            )
              setAudioMessage("일시정지");
          }}
          onError={() =>
            setAudioMessage(
              "음성을 재생하지 못했습니다. 다시 듣기를 눌러 주세요.",
            )
          }
        />
        {revealed && (
          <div
            className={`${isKana ? "mt-3" : "mt-4 border-t border-border pt-4"}`}
          >
            {!isKana && (
              <h2 className="text-center text-xl font-semibold leading-snug sm:text-2xl">
                {card.meaning || "뜻 정보 없음"}
              </h2>
            )}
            {card.partOfSpeech && (
              <p className="muted mt-1 text-center text-xs">
                {card.partOfSpeech}
              </p>
            )}
            {examples.slice(0, 1).map((example, exampleIndex) => (
              <div
                key={exampleIndex}
                className="mt-3 rounded-xl bg-secondary/70 p-3"
              >
                <p className="jp text-base leading-relaxed">
                  {example.japanese}
                </p>
                {"reading" in example && example.reading && (
                  <p className="jp muted mt-2">{example.reading}</p>
                )}
                {example.korean && (
                  <p className="muted mt-1 text-sm">{example.korean}</p>
                )}
                {canPlayExample(example, settings.data?.audioEngine) && (
                  <button
                    className="mt-1 min-h-11 text-xs font-medium text-primary"
                    onClick={() => play(card, example)}
                    aria-label={`${exampleIndex + 1}번 예문 듣기`}
                  >
                    ▶ 예문 듣기
                  </button>
                )}
              </div>
            ))}
            {(examples.length > 1 || card.explanation) && (
              <details
                className="study-details mt-3 rounded-xl border border-border p-3"
                open={card.kind === "grammar"}
              >
                <summary className="min-h-6 cursor-pointer text-xs font-medium text-muted-foreground">
                  {isKana ? "발음 안내" : "예문과 설명 더 보기"}
                </summary>
                {examples.slice(1).map((example, offset) => (
                  <div
                    key={offset}
                    className="mt-3 border-t border-border pt-3"
                  >
                    <p className="jp text-base leading-relaxed">
                      {example.japanese}
                    </p>
                    {"reading" in example && example.reading && (
                      <p className="jp muted mt-1 text-sm">{example.reading}</p>
                    )}
                    {example.korean && (
                      <p className="muted mt-1 text-sm">{example.korean}</p>
                    )}
                    {canPlayExample(example, settings.data?.audioEngine) && (
                      <button
                        className="mt-1 min-h-11 text-xs font-medium text-primary"
                        aria-label={`${offset + 2}번 예문 듣기`}
                        onClick={() => play(card, example)}
                      >
                        ▶ 예문 듣기
                      </button>
                    )}
                  </div>
                ))}
                {card.explanation && (
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed">
                    {card.explanation}
                  </p>
                )}
              </details>
            )}
          </div>
        )}
      </article>
      {!revealed ? (
        <button
          onClick={() => setRevealed(true)}
          className="study-actions btn btn-primary mt-3 min-h-14 w-full text-base"
        >
          정답 보기{" "}
          <span className="hidden text-xs opacity-70 md:inline">Space</span>
        </button>
      ) : (
        <div
          className="study-actions mt-3 grid grid-cols-4 gap-2"
          role="group"
          aria-label="기억 정도 평가"
        >
          {ratings.map((r, i) => (
            <button
              key={r.value}
              className={`btn min-h-14 flex-col gap-0.5 px-1.5 text-sm ${r.value === "GOOD" ? "btn-primary" : r.value === "AGAIN" ? "btn-danger" : ""}`}
              disabled={saving || Boolean(retry)}
              onClick={() => submit(r.value)}
            >
              {r.label}
              <span className="hidden text-[10px] opacity-70 md:inline">
                {i + 1}
              </span>
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
      <StudyEntry />
    </Suspense>
  );
}
function StudyEntry() {
  const params = useSearchParams();
  return <StudyContent key={params.toString()} />;
}
