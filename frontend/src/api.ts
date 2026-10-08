export type Rating = "AGAIN" | "HARD" | "GOOD" | "EASY";
export interface User {
  id: string;
  email: string;
  csrfToken?: string;
}
export interface Dashboard {
  dueCount: number;
  newRemaining: number;
  studiedCardsToday: number;
  answersToday: number;
  streak: number;
  selectedDeckId: string | null;
  activeLessonId?: string | null;
  activeLessonTitle?: string | null;
  dailyNewRemaining?: number;
}
export interface Lesson {
  id: string;
  title: string;
  position: number;
  optional: boolean;
  totalCards: number;
  studiedCards: number;
  completedCards: number;
  dueCount: number;
  selected: boolean;
  completed: boolean;
}
export interface Course {
  id: string;
  title: string;
  description: string;
  kind: string;
  level: string | null;
  position: number;
  totalCards: number;
  studiedCards: number;
  completedCards: number;
  dueCount: number;
  lessons: Lesson[];
  recommendedLessonId: string | null;
}
export interface CurriculumLesson extends Lesson {
  courseId: string;
  kind: string;
}
export interface CurriculumUnit {
  key: string;
  title: string;
  goal: string;
  position: number;
  optional: boolean;
  lessons: CurriculumLesson[];
  totalCards: number;
  studiedCards: number;
  completedCards: number;
  completedLessons: number;
  completed: boolean;
}
export interface CurriculumLevel {
  key: string;
  title: string;
  subtitle: string;
  jlptLevel: string | null;
  position: number;
  goal: string;
  outcomes: string[];
  units: CurriculumUnit[];
  totalCards: number;
  studiedCards: number;
  completedCards: number;
  totalLessons: number;
  completedLessons: number;
  dueCount: number;
  available: boolean;
  completed: boolean;
}
export interface Curriculum {
  version: string;
  levels: CurriculumLevel[];
  recommendedLevelKey: string | null;
  recommendedLessonId: string | null;
}
export interface Deck {
  id: string;
  title: string;
  level?: string | null;
  kind?: string | null;
  totalCards: number;
  studiedCards: number;
  unseenCards: number;
  selected: boolean;
}
export interface HighlightSegment {
  text: string;
  highlighted: boolean;
}
export interface GrammarFocus {
  title: string;
  segments: HighlightSegment[];
}
export interface ReadingGuide {
  segments: { text: string; reading?: string | null }[];
  source: "ORIGINAL" | "READING" | "DICTIONARY" | "NONE";
  hangul?: string | null;
  hangulSource?: "MANUAL" | "APPROXIMATE" | null;
  hangulStatus?: "COMPLETE" | "PARTIAL" | "UNAVAILABLE";
}
export interface VerbConjugationForm {
  key: string;
  label: string;
  group: "BASIC" | "CONNECT" | "ADVANCED";
  description: string;
  japanese: string;
  reading: string;
  stem: string;
  suffix: string;
  readingGuide?: ReadingGuide | null;
}
export interface VerbConjugation {
  verbClass: "GODAN" | "ICHIDAN" | "SURU" | "KURU";
  classLabel: string;
  dictionaryForm: string;
  dictionaryReading: string;
  rule: string;
  forms: VerbConjugationForm[];
}
export interface StudyCard {
  readingGuide?: ReadingGuide | null;
  exampleReadingGuide?: ReadingGuide | null;
  reinforcement?: boolean;
  retryVersion?: number;
  lastRating?: Rating | null;
  id: string;
  version: number;
  kind: string;
  front: string;
  grammarFocus?: GrammarFocus | null;
  reading?: string | null;
  meaning?: string | null;
  example?: string | null;
  exampleMeaning?: string | null;
  explanation?: string | null;
  partOfSpeech?: string | null;
  audioId?: string | null;
  exampleAudioId?: string | null;
  hangulHint?: string | null;
  verbConjugation?: VerbConjugation | null;
  examples?: {
    japanese: string;
    readingGuide?: ReadingGuide | null;
    reading?: string | null;
    korean?: string | null;
    audioId?: string | null;
  }[];
}
export interface StudySession {
  id: string;
  cards: StudyCard[];
  answered: number;
  answeredCards?: string[];
  ratingCounts?: Partial<Record<Rating, number>>;
  lessonId?: string | null;
  lessonTitle?: string | null;
  practice?: boolean;
  queueInfo?: {
    eligibleCards: number;
    unseenCards: number;
    newRemaining: number;
    nextDueAt?: string | null;
    reason?: "DAILY_LIMIT" | "NOT_DUE" | "NO_ELIGIBLE_CARDS" | null;
  };
}
export interface StudyOption {
  level: string;
  kind: "vocabulary" | "grammar";
  total: number;
  studied: number;
  due: number;
}
export interface ReviewResult {
  retryCard?: StudyCard | null;
  due?: string | null;
  version: number;
}
export interface Settings {
  showFurigana?: boolean;
  practiceLevel?: string;
  audioEngine: "SUPERTONIC" | "ORIGINAL" | "DEVICE";
  supertonicVoice: string;
  dailyNewLimit: number;
  showReadingHint: boolean;
  showHangulHint: boolean;
  autoPlayAudio: boolean;
  allowAudioBeforeReveal: boolean;
  ttsFallback: boolean;
  playbackSpeed: number;
  preferredVoice?: string | null;
  timezone: string;
}
export interface Note {
  readingGuide?: ReadingGuide | null;
  exampleReadingGuide?: ReadingGuide | null;
  id: string;
  kind?: string;
  level?: string | null;
  grammarFocus?: GrammarFocus | null;
  japanese?: string;
  front?: string;
  reading?: string;
  meaning?: string;
  example?: string;
  exampleMeaning?: string;
  memo?: string;
  hangulHint?: string;
  source?: string;
  bookmarked?: boolean;
  excluded?: boolean;
  audioId?: string | null;
  verbConjugation?: VerbConjugation | null;
}
export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
}
export interface Stats {
  answers7Days?: number;
  uniqueCards7Days?: number;
  answers30Days?: number;
  uniqueCards30Days?: number;
  learnedCards?: number;
  unseenCards?: number;
  dueCount?: number;
  streak?: number;
  lastStudiedAt?: string | null;
  decks?: {
    deckId: string;
    title: string;
    totalCards: number;
    studiedCards: number;
  }[];
}
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}
let csrfToken: string | undefined;
export function setCsrfToken(token?: string) {
  csrfToken = token;
}
export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const method = options.method?.toUpperCase() ?? "GET";
  const response = await fetch(`/api${path}`, {
    ...options,
    credentials: "include",
    cache: "no-store",
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(method !== "GET" && csrfToken ? { "X-CSRF-Token": csrfToken } : {}),
      ...options.headers,
    },
  });
  const body = await response.json().catch(() => null);
  if (!response.ok)
    throw new ApiError(
      response.status,
      body?.code ?? "REQUEST_FAILED",
      body?.message ?? "요청을 처리하지 못했습니다.",
    );
  return body as T;
}
export function json(method: string, body: unknown): RequestInit {
  return { method, body: JSON.stringify(body) };
}
export async function apiSpeech(
  text: string,
  voice: string,
  signal: AbortSignal,
): Promise<Blob> {
  const response = await fetch("/api/speech", {
    method: "POST",
    credentials: "include",
    cache: "no-store",
    signal,
    headers: {
      "Content-Type": "application/json",
      ...(csrfToken ? { "X-CSRF-Token": csrfToken } : {}),
    },
    body: JSON.stringify({ text, voice }),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new ApiError(
      response.status,
      body?.code ?? "SPEECH_UNAVAILABLE",
      body?.message ?? "음성을 준비하지 못했습니다. 잠시 후 다시 눌러 주세요.",
    );
  }
  if (!response.headers.get("Content-Type")?.startsWith("audio/wav"))
    throw new ApiError(502, "BAD_SPEECH", "음성 응답을 확인하지 못했습니다.");
  return response.blob();
}
export async function me(): Promise<User> {
  const user = await api<User>("/me");
  setCsrfToken(user.csrfToken);
  return user;
}

export interface KanaReferenceGroup {
  key: string;
  title: string;
  rows: {
    title: string;
    characters: {
      hiragana: string;
      katakana: string;
      romaji: string;
      hangul: string;
    }[];
  }[];
}
