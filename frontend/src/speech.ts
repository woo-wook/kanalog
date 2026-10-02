function japaneseText(value?: string | null): string | null {
  const text = value?.trim();
  // Speech input is Japanese content, never the bilingual answer/explanation.
  return text &&
    /[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]/u.test(text) &&
    !/[\p{Script=Hangul}]/u.test(text)
    ? text
    : null;
}

export function canPlayExample(
  example: { japanese?: string | null; audioId?: string | null },
  engine: string = "SUPERTONIC",
): boolean {
  return Boolean(
    example.audioId ||
    (engine !== "ORIGINAL" && japaneseText(example.japanese)),
  );
}

export function speechText(
  item: { kind: string; front: string; reading?: string | null },
  example?: { japanese?: string | null },
): string | null {
  if (example) return japaneseText(example.japanese);
  if (item.kind === "grammar") return japaneseText(item.front);
  if (item.kind === "katakana" || item.kind === "hiragana")
    return item.front.trim() || null;
  return item.reading?.trim() || item.front.trim() || null;
}
