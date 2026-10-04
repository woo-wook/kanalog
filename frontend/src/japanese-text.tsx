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
  if (!enabled || !value) return null;
  const automatic = !manual?.trim() && guide?.hangulSource !== "MANUAL";
  return (
    <div
      className="pronunciation-hint mt-3 rounded-xl bg-primary/5 px-4 py-3 text-left"
      aria-label="한글 발음 보조"
    >
      <p className="mb-1 text-[11px] font-semibold tracking-wide text-muted-foreground">
        근사 발음{automatic ? " · 자동" : ""}
      </p>
      <p
        className="break-words text-lg font-medium leading-relaxed text-primary"
        lang="ko"
      >
        {value}
      </p>
    </div>
  );
}
