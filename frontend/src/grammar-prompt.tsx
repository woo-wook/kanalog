import type { GrammarFocus, StudyCard, Settings } from "./api";
import {
  JapaneseText,
  PronunciationHint,
  grammarTitleGuide,
} from "./japanese-text";
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
  settings,
}: {
  settings?: Pick<Settings, "showFurigana" | "showHangulHint">;
  card: Pick<
    StudyCard,
    "front" | "meaning" | "grammarFocus" | "readingGuide" | "hangulHint"
  >;
  revealed: boolean;
}) {
  const focus = card.grammarFocus;
  const content = structureGrammarAnswer(card.meaning, card.front);
  if (!focus) return null;
  return (
    <>
      <p className="inline-flex rounded-full bg-primary/8 px-3 py-1.5 text-sm font-semibold text-primary">
        문법 회상
      </p>
      <h1 className="study-prompt study-prompt-grammar jp mt-3 font-semibold text-primary">
        <JapaneseText
          text={focus.title}
          guide={grammarTitleGuide(focus, card.readingGuide)}
          furigana={settings?.showFurigana !== false}
        />
      </h1>
      {revealed && content && (
        <p className="grammar-point-meaning study-prose mt-1 text-xl font-medium">
          {content.expression}
        </p>
      )}
      <div className="mt-5 border-t border-border pt-5">
        <p className="mb-2 text-sm font-semibold text-muted-foreground">
          {revealed ? "예문" : "강조된 문형은 어떤 뜻일까요?"}
        </p>
        <h2 className="grammar-example jp study-prose text-2xl font-medium leading-relaxed">
          {card.readingGuide ? (
            <JapaneseText
              text={card.front}
              guide={card.readingGuide}
              focus={focus}
              furigana={settings?.showFurigana !== false}
            />
          ) : (
            <HighlightedExample text={card.front} focus={focus} />
          )}
        </h2>
        <PronunciationHint
          guide={card.readingGuide}
          manual={card.hangulHint}
          enabled={settings?.showHangulHint}
        />
      </div>
    </>
  );
}
