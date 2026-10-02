export function GrammarAnswer({ answer }: { answer?: string | null }) {
  const paragraphs =
    answer
      ?.split(/\n+/)
      .map((line) => line.trim())
      .filter(Boolean) ?? [];
  return (
    <section
      className="grammar-answer mt-5 border-t border-border pt-5"
      aria-label="정답과 해설"
    >
      <h2 className="mb-3 text-xs font-semibold tracking-wide text-primary">
        정답과 해설
      </h2>
      <div className="space-y-3">
        {paragraphs.length > 0 ? (
          paragraphs.map((paragraph, index) => (
            <p
              key={index}
              className="study-prose text-base font-normal leading-relaxed"
            >
              {paragraph}
            </p>
          ))
        ) : (
          <p className="muted text-sm">등록된 해설이 없습니다.</p>
        )}
      </div>
    </section>
  );
}
