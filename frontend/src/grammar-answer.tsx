import { grammarLines, structureGrammarAnswer } from "./grammar-content";

export function GrammarAnswer({
  answer,
  front,
}: {
  answer?: string | null;
  front?: string;
}) {
  const content = structureGrammarAnswer(answer, front);
  const paragraphs = grammarLines(answer);
  return (
    <section
      className="grammar-answer mt-6 border-t border-border pt-6"
      aria-label="정답과 해설"
    >
      <h2 className="mb-4 text-lg font-semibold text-foreground">
        정답과 해설
      </h2>
      {content ? (
        <div className="space-y-5">
          <section aria-label="예문 해석" className="grammar-overview">
            <h3 className="mb-2 text-base font-semibold text-muted-foreground">
              예문 해석
            </h3>
            <p className="grammar-translation study-prose">
              {content.translation}
            </p>
          </section>
          <section
            aria-label="핵심 표현"
            className="grammar-key rounded-2xl border border-primary/15 bg-primary/5 p-4 sm:p-5"
          >
            <h3 className="mb-2 text-base font-semibold text-primary">
              핵심 표현
            </h3>
            <p className="grammar-expression study-prose font-semibold text-primary">
              {content.expression}
            </p>
          </section>
          {content.topics.map(({ title, paragraphs }, index) => (
            <section
              key={title}
              aria-label={title}
              className="grammar-topic rounded-2xl border border-border bg-secondary/35 p-4 sm:p-5"
            >
              <h3 className="mb-3 flex items-center gap-2.5 text-base font-semibold text-foreground">
                <span
                  aria-hidden="true"
                  className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-white text-xs font-semibold tabular-nums text-primary ring-1 ring-border"
                >
                  {String(index + 1).padStart(2, "0")}
                </span>
                {title}
              </h3>
              <div className="space-y-4">
                {paragraphs.map((paragraph, i) => (
                  <p key={i} className="grammar-body study-prose">
                    {paragraph}
                  </p>
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {paragraphs.length > 0 ? (
            paragraphs.map((paragraph, index) => (
              <p key={index} className="grammar-body study-prose">
                {paragraph}
              </p>
            ))
          ) : (
            <p className="muted text-base">등록된 해설이 없습니다.</p>
          )}
        </div>
      )}
    </section>
  );
}
