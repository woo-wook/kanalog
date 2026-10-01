export function canPlayExample(
  example: { japanese?: string | null; audioId?: string | null },
  engine: string = "SUPERTONIC",
): boolean {
  return Boolean(
    example.audioId || (engine !== "ORIGINAL" && example.japanese?.trim()),
  );
}

export function speechText(
  item: { kind: string; front: string; reading?: string | null },
  example?: { japanese?: string | null },
): string | null {
  if (example) return example.japanese?.trim() || null;
  if (item.kind === "grammar") return null;
  if (item.kind === "katakana" || item.kind === "hiragana")
    return item.front.trim() || null;
  return item.reading?.trim() || item.front.trim() || null;
}
