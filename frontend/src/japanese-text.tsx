import type { GrammarFocus, ReadingGuide } from "./api";

/** Native ruby stays in the text flow; original highlight offsets apply only to base text. */
export function JapaneseText({
  text,
  guide,
  furigana = true,
  focus,
}: {
  text: string;
  guide?: ReadingGuide | null;
  furigana?: boolean;
  focus?: GrammarFocus | null;
}) {
  const valid =
    guide?.segments?.length &&
    guide.segments.map((s) => s.text).join("") === text;
  const parts = valid && furigana ? guide.segments : [{ text }];
  const marks =
    focus && focus.segments.map((s) => s.text).join("") === text
      ? focus.segments
      : null;
  function base(value: string, offset: number) {
    if (!marks) return value;
    return marks.flatMap((part, i) => {
      const cursor = marks.slice(0, i).reduce((n, s) => n + s.text.length, 0);
      const start = Math.max(offset, cursor),
        end = Math.min(offset + value.length, cursor + part.text.length);
      if (start >= end) return [];
      const slice = value.slice(start - offset, end - offset);
      return [
        part.highlighted ? (
          <mark className="grammar-highlight" key={i}>
            {slice}
          </mark>
        ) : (
          <span key={i}>{slice}</span>
        ),
      ];
    });
  }
  return (
    <span
      className={
        furigana && valid ? "japanese-text has-furigana" : "japanese-text"
      }
      lang="ja"
    >
      {parts.map((part, i) => {
        const current = parts
          .slice(0, i)
          .reduce((n, s) => n + s.text.length, 0);
        const reading = "reading" in part ? part.reading : null;
        // Huge compounds cannot fit a mobile line; keep their full reading on a separate line.
        return reading && part.text.length <= 8 ? (
          <ruby key={i}>
            {base(part.text, current)}
            <rp>（</rp>
            <rt
              aria-hidden="true"
              style={{
                fontSize: `${Math.min(0.43, (Array.from(part.text).length / Array.from(reading).length) * 0.95)}em`,
              }}
            >
              {reading}
            </rt>
            <rp>）</rp>
          </ruby>
        ) : (
          <span key={i}>{base(part.text, current)}</span>
        );
      })}
    </span>
  );
}

export function PronunciationHint({
  guide,
  enabled,
  manual,
}: {
  guide?: ReadingGuide | null;
  enabled?: boolean;
  manual?: string | null;
}) {
  const value = manual?.trim() || guide?.hangul;
  if (!enabled || (!value && !guide)) return null;
  if (!value)
    return (
      <p
        className="pronunciation-hint muted mt-3 text-sm leading-relaxed"
        aria-label="한글 발음 보조"
      >
        읽기를 확인하지 못해 한글 발음을 표시할 수 없어요. 가나와 음성을 참고해
        주세요.
      </p>
    );
  const partial = !manual?.trim() && guide?.hangulStatus === "PARTIAL";
  const automatic = !manual?.trim() && guide?.hangulSource !== "MANUAL";
  return (
    <div
      className="pronunciation-hint mt-3 rounded-2xl bg-primary/5 px-4 py-3 text-left"
      aria-label="한글 발음 보조"
    >
      <p className="mb-1 text-[11px] font-semibold tracking-wide text-muted-foreground">
        근사 발음{automatic ? " · 자동" : ""}
        {partial ? " · 일부 읽기 확인 필요" : ""}
      </p>
      <p
        className="break-words text-lg font-medium leading-relaxed text-primary"
        lang="ko"
      >
        {value}
      </p>
      {partial && (
        <p className="muted mt-2 text-xs leading-relaxed">
          〔 〕 안은 읽기가 확인되지 않은 원문이에요.
        </p>
      )}
    </div>
  );
}

/** Project complete source ruby blocks onto the grammar title; never split a block's reading. */
export function grammarTitleGuide(
  focus: GrammarFocus | null | undefined,
  guide?: ReadingGuide | null,
): ReadingGuide | undefined {
  if (
    !focus ||
    !guide ||
    focus.segments.map((s) => s.text).join("") !==
      guide.segments.map((s) => s.text).join("")
  )
    return undefined;
  const segments: ReadingGuide["segments"] = [];
  let focusOffset = 0;
  for (const part of focus.segments) {
    const start = focusOffset,
      end = start + part.text.length;
    focusOffset = end;
    if (!part.highlighted || !part.text.trim()) continue;
    const trimmedStart =
      start + part.text.length - part.text.trimStart().length;
    const trimmedEnd = end - part.text.length + part.text.trimEnd().length;
    if (segments.length) segments.push({ text: " … " });
    let offset = 0;
    for (const original of guide.segments) {
      const blockStart = offset,
        blockEnd = offset + original.text.length;
      offset = blockEnd;
      const from = Math.max(trimmedStart, blockStart),
        to = Math.min(trimmedEnd, blockEnd);
      if (from >= to) continue;
      segments.push({
        text: original.text.slice(from - blockStart, to - blockStart),
        reading:
          from === blockStart && to === blockEnd ? original.reading : null,
      });
    }
  }
  return segments.map((s) => s.text).join("") === focus.title
    ? { segments, source: guide.source }
    : undefined;
}
