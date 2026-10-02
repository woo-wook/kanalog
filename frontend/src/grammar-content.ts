export const grammarTopics = ["뉘앙스", "접속", "헷갈리는 문형"] as const;

export function grammarLines(answer?: string | null) {
  return (
    answer
      ?.split(/\n+/)
      .map((line) => line.trim())
      .filter(Boolean) ?? []
  );
}

// Only the confirmed MAX layout is structured. Unknown layouts retain every line.
export function structureGrammarAnswer(answer?: string | null, front?: string) {
  const lines = grammarLines(answer);
  if (!front || lines[0] !== front.trim()) return null;
  const positions = grammarTopics.map((title) => lines.indexOf(title));
  if (
    positions[0] !== 3 ||
    positions.some(
      (position, i) =>
        position < 0 ||
        lines.filter((line) => line === grammarTopics[i]).length !== 1 ||
        (i > 0 && position <= positions[i - 1]! + 1),
    ) ||
    positions[2]! >= lines.length - 1
  )
    return null;
  return {
    example: lines[0]!,
    translation: lines[1]!,
    expression: lines[2]!,
    topics: grammarTopics.map((title, i) => ({
      title,
      paragraphs: lines.slice(
        positions[i]! + 1,
        positions[i + 1] ?? lines.length,
      ),
    })),
  };
}
