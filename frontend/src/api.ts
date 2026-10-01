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
export interface StudyCard {
  id: string;
  version: number;
  kind: string;
  front: string;
  reading?: string | null;
  meaning?: string | null;
  example?: string | null;
  exampleMeaning?: string | null;
  explanation?: string | null;
  partOfSpeech?: string | null;
  audioId?: string | null;
  exampleAudioId?: string | null;
  hangulHint?: string | null;
  examples?: {
    japanese: string;
    reading?: string | null;
    korean?: string | null;
    audioId?: string | null;
  }[];
}
export interface StudySession {
  id: string;
  cards: StudyCard[];
  answered: number;
  lessonId?: string | null;
  lessonTitle?: string | null;
}
export interface ReviewResult {
  due: string;
  version: number;
}
export interface Settings {
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
  id: string;
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
export async function me(): Promise<User> {
  const user = await api<User>("/me");
  setCsrfToken(user.csrfToken);
  return user;
}
