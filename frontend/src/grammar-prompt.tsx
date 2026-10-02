import type { GrammarFocus, StudyCard } from "./api";
import { structureGrammarAnswer } from "./grammar-content";

export function HighlightedExample({
  text,
  focus,
}: {
  text: string;
  focus: GrammarFocus;
}) {
  if (focus.segments.map((s) => s.text).join("") !== text) return <>{text}</>;
  return (
    <>
      {focus.segments.map((part, i) =>
        part.highlighted ? (
          <mark className="grammar-highlight" key={i}>
            {part.text}
          </mark>
        ) : (
          <span key={i}>{part.text}</span>
        ),
      )}
    </>
  );
}

export function GrammarPrompt({
  card,
  revealed,
}: {
  card: Pick<StudyCard, "front" | "meaning" | "grammarFocus">;
  revealed: boolean;
}) {
  const focus = card.grammarFocus;
  const content = structureGrammarAnswer(card.meaning, card.front);
  if (!focus) return null;
  return (
    <>
      <p className="inline-flex rounded-lg bg-primary/8 px-3 py-1.5 text-sm font-semibold text-primary">
        오늘의 문법
      </p>
      <h1 className="study-prompt study-prompt-grammar jp mt-3 font-semibold text-primary">
        {focus.title}
      </h1>
      {content && (
        <p className="grammar-point-meaning study-prose mt-1 text-xl font-medium">
          {content.expression}
        </p>
      )}
      {!revealed && content && (
        <section
          aria-label="문형의 쓰임"
          className="mt-5 space-y-3 rounded-2xl bg-secondary/40 p-4"
        >
          <h2 className="text-sm font-semibold text-muted-foreground">
            이럴 때 써요
          </h2>
          {content.topics[0]!.paragraphs.map((p, i) => (
            <p key={i} className="grammar-body study-prose leading-relaxed">
              {p}
            </p>
          ))}
          <div className="border-t border-border pt-3">
            <h3 className="mb-1 text-sm font-semibold text-muted-foreground">
              접속
            </h3>
            {content.topics[1]!.paragraphs.map((p, i) => (
              <p key={i} className="grammar-body study-prose leading-relaxed">
                {p}
              </p>
            ))}
          </div>
        </section>
      )}
      <div className="mt-5 border-t border-border pt-5">
        <p className="mb-2 text-sm font-semibold text-muted-foreground">
          예문 · 강조된 부분을 확인해 보세요
        </p>
        <h2 className="grammar-example jp study-prose text-2xl font-medium leading-relaxed">
          <HighlightedExample text={card.front} focus={focus} />
        </h2>
      </div>
    </>
  );
}
