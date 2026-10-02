import { ChevronDown, Eye, EyeOff, Pencil, Star } from "lucide-react";
import type { Note } from "./api";
import { GrammarAnswer } from "./grammar-answer";
import { structureGrammarAnswer } from "./grammar-content";
import { HighlightedExample } from "./grammar-prompt";
import { NoteAudio } from "./note-audio";
import type { NoteAudioPlayer } from "./use-note-audio";

export function NoteEntry({
  note,
  onPatch,
  onEdit,
  pending,
  audio,
}: {
  note: Note;
  onPatch: (note: Note, field: "bookmarked" | "excluded") => void;
  onEdit: (note: Note) => void;
  pending: boolean;
  audio?: NoteAudioPlayer;
}) {
  const front = note.japanese ?? note.front ?? "";
  const grammar = note.kind === "grammar" || Boolean(note.grammarFocus);
  const content = grammar ? structureGrammarAnswer(note.meaning, front) : null;
  const title = grammar ? (note.grammarFocus?.title ?? front) : front;
  const kana = note.kind === "hiragana" || note.kind === "katakana";
  const type = grammar
    ? "문법"
    : kana
      ? note.kind === "hiragana"
        ? "히라가나"
        : "가타카나"
      : "단어";
  const preview = content?.expression ?? note.meaning;
  return (
    <article
      className="note-entry surface relative min-w-0"
      data-note-id={note.id}
    >
      <button
        type="button"
        className={`absolute right-3 top-3 z-10 flex size-11 items-center justify-center rounded-xl transition-colors hover:bg-secondary ${note.bookmarked ? "text-primary" : "text-muted-foreground"}`}
        aria-label={note.bookmarked ? "북마크 해제" : "북마크 추가"}
        aria-pressed={Boolean(note.bookmarked)}
        disabled={pending}
        onClick={() => onPatch(note, "bookmarked")}
      >
        <Star
          size={20}
          fill={note.bookmarked ? "currentColor" : "none"}
          aria-hidden="true"
        />
      </button>
      <details
        className="group"
        onToggle={(event) => {
          if (!event.currentTarget.open && audio?.active?.noteId === note.id)
            audio.stop();
        }}
      >
        <summary className="note-summary cursor-pointer list-none rounded-2xl p-5 [&::-webkit-details-marker]:hidden">
          <div className="flex min-h-6 flex-wrap items-center gap-2 pr-10 text-xs font-medium text-muted-foreground">
            <span className="rounded-md bg-secondary px-2 py-1">{type}</span>
            {note.level && <span>{note.level}</span>}
            {note.excluded && (
              <span className="flex items-center gap-1">
                <EyeOff size={12} aria-hidden="true" />
                학습 제외
              </span>
            )}
          </div>
          <h2
            className={`note-title jp mt-3 pr-8 text-[1.375rem] font-semibold leading-snug ${grammar ? "text-primary" : "text-foreground"}`}
          >
            {title}
          </h2>
          {note.reading && !grammar && (
            <p className="jp mt-1 text-sm text-muted-foreground">
              {note.reading}
            </p>
          )}
          {preview && (
            <p className="note-preview mt-2 text-[1.0625rem] leading-relaxed text-foreground">
              {preview}
            </p>
          )}
          <div className="mt-4 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <span className="group-open:hidden">
              {grammar
                ? "예문·설명 보기"
                : kana
                  ? "읽기·메모 보기"
                  : "뜻·예문 보기"}
            </span>
            <span className="hidden group-open:inline">상세 접기</span>
            <ChevronDown
              size={15}
              className="transition-transform group-open:rotate-180"
              aria-hidden="true"
            />
          </div>
        </summary>
        <div
          className="note-detail min-w-0 border-t border-border px-5 pb-5 pt-5"
          role="region"
          aria-label="상세 내용"
        >
          {audio && <NoteAudio note={note} player={audio} />}
          {grammar ? (
            <>
              <h3 className="mb-2 text-sm font-semibold text-muted-foreground">
                예문
              </h3>
              <p className="grammar-example jp study-prose text-2xl leading-relaxed">
                {note.grammarFocus ? (
                  <HighlightedExample text={front} focus={note.grammarFocus} />
                ) : (
                  front
                )}
              </p>
              <GrammarAnswer
                answer={note.meaning}
                front={front}
                hideExpression={Boolean(content)}
                heading="문법 설명"
              />
            </>
          ) : (
            <>
              {note.meaning && (
                <section aria-label="뜻" className="mb-5">
                  <h3 className="mb-2 text-sm font-semibold text-muted-foreground">
                    뜻
                  </h3>
                  <p className="study-prose whitespace-pre-line text-lg leading-relaxed">
                    {note.meaning}
                  </p>
                </section>
              )}
              {note.example ? (
                <section
                  aria-label="예문"
                  className="rounded-2xl bg-secondary/40 p-4"
                >
                  <h3 className="mb-2 text-sm font-semibold text-muted-foreground">
                    예문
                  </h3>
                  <p className="jp study-prose text-xl leading-relaxed">
                    {note.example}
                  </p>
                  {note.exampleMeaning && (
                    <p className="study-prose mt-3 text-base leading-relaxed text-muted-foreground">
                      {note.exampleMeaning}
                    </p>
                  )}
                </section>
              ) : (
                <p className="text-sm text-muted-foreground">
                  등록된 예문이 없습니다.
                </p>
              )}
            </>
          )}
          {note.memo && (
            <section
              aria-label="개인 메모"
              className="mt-5 rounded-2xl border border-border p-4"
            >
              <h3 className="mb-2 text-sm font-semibold text-muted-foreground">
                개인 메모
              </h3>
              <p className="study-prose whitespace-pre-line text-base leading-relaxed">
                {note.memo}
              </p>
            </section>
          )}
          <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4">
            <button
              type="button"
              disabled={pending}
              className="btn bg-secondary text-sm"
              onClick={() => onPatch(note, "excluded")}
            >
              {note.excluded ? (
                <Eye size={16} aria-hidden="true" />
              ) : (
                <EyeOff size={16} aria-hidden="true" />
              )}
              {note.excluded ? "학습 재개" : "학습에서 제외"}
            </button>
            {(!note.source || note.source === "PERSONAL") && (
              <button
                type="button"
                className="btn text-sm"
                disabled={pending}
                onClick={() => onEdit(note)}
              >
                <Pencil size={16} aria-hidden="true" />
                수정
              </button>
            )}
          </div>
        </div>
      </details>
    </article>
  );
}
