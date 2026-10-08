import { Volume2 } from "lucide-react";
import type { Settings, VerbConjugation, VerbConjugationForm } from "./api";
import { JapaneseText } from "./japanese-text";

const groups = [
  { key: "BASIC", title: "기본 활용" },
  { key: "CONNECT", title: "이어 말하기" },
  { key: "ADVANCED", title: "표현 넓히기" },
] as const;

function FormRow({
  form,
  settings,
  onPlay,
}: {
  form: VerbConjugationForm;
  settings?: Pick<Settings, "showFurigana" | "showHangulHint">;
  onPlay?: (reading: string, key: string) => void;
}) {
  const hasSuffix =
    Boolean(form.suffix) && form.stem + form.suffix === form.japanese;
  const focus = hasSuffix
    ? {
        title: form.japanese,
        segments: [
          { text: form.stem, highlighted: false },
          { text: form.suffix, highlighted: true },
        ],
      }
    : undefined;
  const hangul = form.readingGuide?.hangul;
  return (
    <li className="verb-form-row min-w-0 rounded-2xl bg-card p-4 ring-1 ring-border/60">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className="text-sm font-semibold text-foreground">
            {form.label}
          </h4>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
            {form.description}
          </p>
        </div>
        {onPlay && (
          <button
            type="button"
            className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full text-primary hover:bg-primary/10"
            aria-label={`${form.japanese} 활용형 듣기`}
            onClick={() => onPlay(form.reading, form.key)}
          >
            <Volume2 className="size-5" aria-hidden="true" />
          </button>
        )}
      </div>
      <p className="jp mt-3 min-w-0 break-words text-[1.375rem] font-semibold leading-relaxed text-foreground sm:text-2xl">
        <JapaneseText
          text={form.japanese}
          guide={form.readingGuide}
          focus={focus}
          furigana={settings?.showFurigana !== false}
        />
      </p>
      <p
        className="jp mt-1 break-words text-sm text-muted-foreground"
        lang="ja"
      >
        {form.reading}
      </p>
      {settings?.showHangulHint && hangul && (
        <p className="mt-2 break-words text-xs text-primary" lang="ko">
          근사 발음 · {hangul}
        </p>
      )}
    </li>
  );
}

export function VerbConjugationPanel({
  conjugation,
  settings,
  onPlay,
}: {
  conjugation: VerbConjugation;
  settings?: Pick<Settings, "showFurigana" | "showHangulHint">;
  onPlay?: (reading: string, key: string) => void;
}) {
  return (
    <section
      aria-label="동사 활용"
      className="verb-conjugation mt-5 min-w-0 rounded-[28px] bg-secondary/50 p-4 text-left sm:p-5"
    >
      <div className="min-w-0">
        <span className="inline-flex rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">
          {conjugation.classLabel}
        </span>
        <h2 className="mt-3 text-lg font-semibold tracking-tight text-foreground">
          동사 활용
        </h2>
        <p className="jp mt-2 break-words text-base text-foreground" lang="ja">
          {conjugation.dictionaryForm}
          <span className="ml-2 text-sm text-muted-foreground">
            {conjugation.dictionaryReading}
          </span>
        </p>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {conjugation.rule}
        </p>
      </div>
      {groups.map(({ key, title }) => {
        const forms = conjugation.forms.filter((form) => form.group === key);
        if (forms.length === 0) return null;
        return (
          <section key={key} className="mt-5 min-w-0" aria-label={title}>
            <h3 className="mb-3 text-sm font-semibold text-foreground">
              {title}
            </h3>
            <ul className="grid min-w-0 gap-2 sm:grid-cols-2">
              {forms.map((form) => (
                <FormRow
                  key={form.key}
                  form={form}
                  settings={settings}
                  onPlay={onPlay}
                />
              ))}
            </ul>
          </section>
        );
      })}
    </section>
  );
}
