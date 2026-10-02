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
import { GrammarAnswer } from "@/grammar-answer";
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
    lessonId = params.get("lessonId"),
    kanaScript = params.get("kana"),
    kanaGroups = params.get("groups") ?? "basic",
    kanaPractice = params.get("practice") === "1";
  const startSession = useCallback(
    (forcePractice = false) =>
      api<StudySession>(
        "/study/sessions",
        json("POST", {
          ...(deckId ? { deckId } : {}),
          ...(lessonId ? { lessonId } : {}),
          ...(forcePractice || (!kanaScript && kanaPractice)
            ? { practice: true }
            : {}),
          ...(kanaScript
            ? {
                kana: {
                  scripts:
                    kanaScript === "both"
                      ? ["hiragana", "katakana"]
                      : [kanaScript],
                  groups: kanaGroups.split(","),
                },
              }
            : {}),
        }),
      ),
    [deckId, lessonId, kanaScript, kanaGroups, kanaPractice],
  );
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
    [playbackBlocked, setPlaybackBlocked] = useState(false),
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
  const cardPanel = useRef<HTMLElement | null>(null);
  const playbackAttempt = useRef(0);
  const autoPlayed = useRef<string | null>(null);
  const { generate, cancel, busy: generating } = useGeneratedAudio();
  const savingRef = useRef(false);
  const started = useRef(false);
  useEffect(() => {
    if (started.current || (!deckId && !lessonId && !kanaScript)) return;
    started.current = true;
    const selected =
      lessonId && !kanaScript
        ? api(`/courses/lessons/${lessonId}/select`, { method: "POST" })
        : Promise.resolve();
    selected
      .then(() => startSession())
      .then(setSession)
      .catch(setStartError)
      .finally(() => setLoading(false));
  }, [deckId, lessonId, kanaScript, startSession]);
  const card = session?.cards[index];
  useEffect(() => {
    if (cardPanel.current) cardPanel.current.scrollTop = 0;
  }, [card?.id, session?.id]);
  const stopAudio = useCallback(() => {
    playbackAttempt.current += 1;
    setPlaybackBlocked(false);
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
  const resumeAudio = useCallback(() => {
    const player = audio.current;
    if (!player?.getAttribute("src")) return;
    const attempt = playbackAttempt.current;
    // Call play directly in the tap handler, before any asynchronous work.
    player
      .play()
      .then(() => {
        if (attempt === playbackAttempt.current) setPlaybackBlocked(false);
      })
      .catch((reason: unknown) => {
        if (attempt !== playbackAttempt.current) return;
        if (reason instanceof DOMException && reason.name === "AbortError")
          return;
        setAudioMessage(
          "재생을 시작하지 못했습니다. 재생 버튼을 다시 눌러 주세요.",
        );
      });
  }, []);
  const play = useCallback(
    async (
      item: StudyCard,
      example?: { audioId?: string | null; japanese?: string | null },
      override?: Settings["audioEngine"],
    ) => {
      stopAudio();
      const attempt = playbackAttempt.current;
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
          if (attempt !== playbackAttempt.current) return;
          if (reason instanceof DOMException && reason.name === "AbortError")
            return;
          const blocked =
            reason instanceof DOMException && reason.name === "NotAllowedError";
          setPlaybackBlocked(blocked);
          setAudioMessage(
            blocked
              ? "준비된 음성을 들으려면 재생 버튼을 한 번 눌러 주세요."
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
    (settings.data.allowAudioBeforeReveal || revealed) &&
    Boolean(
      card &&
      (settings.data.audioEngine === "ORIGINAL"
        ? card.audioId
        : speechText(card)),
    );
  const autoPlaybackKey =
    card && settings.data
      ? [
          card.id,
          card.version,
          settings.data.audioEngine,
          settings.data.supertonicVoice,
          settings.data.preferredVoice,
          settings.data.playbackSpeed,
        ].join(":")
      : null;
  useEffect(() => {
    if (!autoPlaybackAllowed) {
      autoPlayed.current = null;
      return;
    }
    if (card && autoPlaybackKey && autoPlayed.current !== autoPlaybackKey) {
      const timer = setTimeout(() => {
        autoPlayed.current = autoPlaybackKey;
        void play(card);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [card, autoPlaybackAllowed, autoPlaybackKey, play]);
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
        setNextDue(result.due ?? null);
        setIndex((previous) => previous + 1);
        setRevealed(false);
        setHint(false);
        setAudioUrl("");
        setAudioMessage("");
        setRetry(null);
        stopAudio();
        if (!session.practice) {
          queryClient.invalidateQueries({ queryKey: ["dashboard"] });
          queryClient.invalidateQueries({ queryKey: ["stats"] });
          queryClient.invalidateQueries({ queryKey: ["decks"] });
        }
        if (!session.practice || ["hiragana", "katakana"].includes(card.kind)) {
          queryClient.invalidateQueries({ queryKey: ["courses"] });
          queryClient.invalidateQueries({ queryKey: ["curriculum"] });
        }
      } catch (e) {
        setError(e);
      } finally {
        savingRef.current = false;
        setSaving(false);
      }
    },
    [session, card, stopAudio, queryClient],
  );
  const restartSession = async (practice = false) => {
    if (savingRef.current) return;
    savingRef.current = true;
    setLoading(true);
    setStartError(null);
    stopAudio();
    try {
      setSession(await startSession(practice));
      setIndex(0);
      setRevealed(false);
      setHint(false);
      setUniqueCards([]);
      setNextDue(null);
      setRetry(null);
      setError(null);
      setAudioUrl("");
      setAudioMessage("");
      autoPlayed.current = null;
      setCounts({ AGAIN: 0, HARD: 0, GOOD: 0, EASY: 0 });
    } catch (e) {
      setStartError(e);
    } finally {
      savingRef.current = false;
      setLoading(false);
    }
  };
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
  if (!deckId && !lessonId && !kanaScript)
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
    return (
      <div>
        <ErrorMessage error={startError ?? settings.error} />
        <button
          className="btn mt-4"
          onClick={() => {
            void settings.refetch();
            void restartSession(session?.practice);
          }}
        >
          다시 불러오기
        </button>
      </div>
    );
  if (!session)
    return <ErrorMessage error={new Error("학습 세션을 만들지 못했습니다.")} />;
  if (!card) {
    const answerCount = Object.values(counts).reduce((a, b) => a + b, 0);
    if (answerCount === 0 && session.answered === 0) {
      const info = session.queueInfo;
      return (
        <section className="surface mx-auto max-w-2xl p-7 text-center">
          <h1 className="text-2xl font-bold">지금 예정된 카드가 없습니다</h1>
          <p className="muted mt-4 leading-relaxed">
            {info?.reason === "DAILY_LIMIT"
              ? "오늘 새 카드 한도를 모두 사용했습니다. 이 범위에 지금 복습할 카드도 없습니다."
              : info?.reason === "NO_ELIGIBLE_CARDS"
                ? "이 범위에는 연습 가능한 카드가 없습니다. 학습 제외 상태와 가져온 콘텐츠를 확인해 주세요."
                : "이 범위의 다음 복습 시각이 아직 오지 않았습니다. 지금 다시 보고 싶다면 자유 연습을 시작하세요."}
          </p>
          {info?.nextDueAt && (
            <p className="muted mt-3 text-sm">
              다음 복습: {new Date(info.nextDueAt).toLocaleString("ko-KR")}
            </p>
          )}
          {(!info || info.eligibleCards > 0) && (
            <>
              <button
                className="btn btn-primary mt-5"
                onClick={() => void restartSession(true)}
              >
                같은 범위 자유 연습
              </button>
              <p className="muted mt-3 text-xs">
                하루 한도와 복습 시각에 관계없이 연습합니다. 답변은 별도로
                저장하며 복습 일정과 코스 진도는 유지합니다.
              </p>
            </>
          )}
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Link className="btn" href="/courses">
              학습 코스 보기
            </Link>
            <Link className="btn" href="/settings">
              학습 설정
            </Link>
          </div>
        </section>
      );
    }
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
        <h1 className="text-2xl font-bold">
          {session.practice
            ? "자유 연습을 마쳤습니다"
            : "이번 학습을 마쳤습니다"}
        </h1>
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
          {session.practice
            ? kanaScript
              ? "평가를 저장했습니다. 다시·어려움으로 평가한 문자가 다음 연습에서 먼저 나옵니다. 보통·쉬움 기록은 첫 연습 진도에도 반영됩니다."
              : "자유 연습 답변을 따로 저장했습니다. 복습 일정은 그대로 유지됩니다."
            : "다시 평가한 카드는 복습 시각이 되면 같은 세션에서 이어서 학습할 수 있습니다."}
        </p>
        {nextDue && (
          <p className="muted mt-2 text-sm">
            최근 카드의 다음 복습: {new Date(nextDue).toLocaleString("ko-KR")}
          </p>
        )}
        {!session.practice && (
          <button
            className="btn mt-5"
            onClick={refreshDue}
            disabled={refreshing}
          >
            {refreshing ? "확인 중…" : "복습할 카드 다시 확인"}
          </button>
        )}
        {error !== null && (
          <p role="alert" className="mt-3 text-sm text-[#993d36]">
            복습 카드를 불러오지 못했습니다. 다시 눌러 주세요.
          </p>
        )}
        {(kanaScript || session.practice) && (
          <button
            className="btn btn-primary mt-5"
            onClick={() => void restartSession(session.practice)}
          >
            {kanaScript ? "다시 섞어 연습" : "같은 레슨 다시 연습"}
          </button>
        )}
        {!session.practice && (
          <button
            className="btn mt-5"
            onClick={() => void restartSession(true)}
          >
            같은 범위 자유 연습
          </button>
        )}
        {!session.practice && <StudyNextStep lessonId={lessonId} />}
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
  const explanationText = card.explanation?.replace(/\p{Cf}/gu, "").trim();
  const explanation =
    explanationText && !/^[-_—–]+$/.test(explanationText)
      ? explanationText
      : null;
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
          {session.practice && !kanaScript ? "자유 연습 · " : ""}
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
      <article
        ref={cardPanel}
        className={`study-card surface p-5 sm:p-8 ${card.kind === "grammar" && !revealed ? "study-card-grammar-question" : ""}`}
        aria-label="학습 카드"
        tabIndex={0}
      >
        <div
          className={
            card.kind === "grammar" ? "grammar-prompt text-left" : "text-center"
          }
        >
          <p
            className={
              card.kind === "grammar"
                ? "inline-flex rounded-lg bg-primary/8 px-3 py-1.5 text-sm font-semibold text-primary"
                : "muted text-xs sm:text-sm"
            }
          >
            {card.kind === "grammar"
              ? "문법 회상"
              : revealed
                ? "정답"
                : isKana
                  ? "이 문자는 어떻게 읽을까요?"
                  : "일본어를 보고 뜻을 떠올려 보세요"}
          </p>
          <h1
            className={`study-prompt mt-4 font-semibold ${isKana ? "jp study-prompt-kana text-7xl leading-tight" : card.kind === "grammar" ? "study-prompt-grammar study-prose" : "jp text-4xl sm:text-5xl leading-tight"}`}
          >
            {card.front}
          </h1>
          {card.kind === "grammar" && !revealed && (
            <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
              문장의 뜻과 쓰임을 떠올린 뒤 정답을 확인해 보세요.
            </p>
          )}
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
              onClick={() => (playbackBlocked ? resumeAudio() : play(card))}
              aria-label={
                playbackBlocked
                  ? settings.data?.autoPlayAudio
                    ? "자동재생 시작"
                    : "준비된 음성 재생"
                  : isKana
                    ? "글자 발음 듣기"
                    : "단어 발음 듣기"
              }
            >
              ▶{" "}
              {playbackBlocked
                ? settings.data?.autoPlayAudio
                  ? "자동재생 시작"
                  : "준비된 음성 재생"
                : "발음 듣기"}
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
        {!hasSound && card.kind !== "grammar" && (
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
          onPlaying={() => {
            setPlaybackBlocked(false);
            setAudioMessage("재생 중");
          }}
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
            className={`${isKana ? "mt-3" : card.kind === "grammar" ? "" : "mt-4 border-t border-border pt-4"}`}
          >
            {!isKana &&
              (card.kind === "grammar" ? (
                <GrammarAnswer answer={card.meaning} front={card.front} />
              ) : (
                <h2 className="text-center text-xl font-semibold leading-snug sm:text-2xl">
                  {card.meaning || "뜻 정보 없음"}
                </h2>
              ))}
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
            {(examples.length > 1 || explanation) && (
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
                {explanation && (
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed">
                    {explanation}
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
            {error instanceof Error ? error.message : "저장하지 못했습니다."}
          </p>
          {(error as ApiError).status === 409 && (
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                className="btn"
                onClick={() => void restartSession(session.practice)}
              >
                현재 상태로 다시 불러오기
              </button>
              {(error as ApiError).code === "NEW_LIMIT" && (
                <button
                  className="btn btn-primary"
                  onClick={() => void restartSession(true)}
                >
                  같은 범위 자유 연습
                </button>
              )}
            </div>
          )}
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
