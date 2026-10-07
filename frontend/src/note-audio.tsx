import Link from "next/link";
import { Play, Square, Volume2 } from "lucide-react";
import type { Note } from "./api";
import { speechText } from "./speech";
import type { NoteAudioPlayer, NoteSpeechTarget } from "./use-note-audio";

export function NoteAudio({
  note,
  player,
}: {
  note: Note;
  player: NoteAudioPlayer;
}) {
  const kind = note.kind ?? "vocabulary";
  const front = note.japanese ?? note.front ?? "";
  const grammar = kind === "grammar" || Boolean(note.grammarFocus);
  const main: NoteSpeechTarget = {
    noteId: note.id,
    key: `${note.id}:main`,
    text: speechText({
      kind: grammar ? "grammar" : kind,
      front,
      reading: note.reading,
    }),
    audioId: note.audioId,
  };
  const example: NoteSpeechTarget = {
    noteId: note.id,
    key: `${note.id}:example`,
    text: speechText({ kind, front }, { japanese: note.example }),
  };
  const active = player.active?.noteId === note.id;
  function button(target: NoteSpeechTarget, label: string) {
    if (!target.text && !target.audioId) return null;
    const prepared =
      active && player.active?.key === target.key && player.blocked;
    return (
      <button
        type="button"
        className="btn min-h-11 rounded-full bg-primary/8 px-3 text-sm text-primary"
        disabled={
          !player.enabled || (player.busy && player.active?.key === target.key)
        }
        onClick={() => (prepared ? player.resume() : player.play(target))}
      >
        {prepared ? (
          <Play size={16} aria-hidden="true" />
        ) : (
          <Volume2 size={17} aria-hidden="true" />
        )}
        {prepared ? "준비된 음성 재생" : label}
      </button>
    );
  }
  if (!main.text && !main.audioId && !example.text) return null;
  return (
    <div
      className="mb-5 rounded-2xl border border-primary/10 bg-primary/3 p-3"
      role="group"
      aria-label="발음 듣기"
    >
      <div className="flex flex-wrap items-center gap-2">
        {button(
          main,
          grammar
            ? "예문 듣기"
            : kind === "hiragana" || kind === "katakana"
              ? "글자 듣기"
              : "단어 듣기",
        )}
        {!grammar && button(example, "예문 듣기")}
        {note.audioId && player.engine !== "ORIGINAL" && (
          <button
            type="button"
            className="btn min-h-11 px-3 text-sm"
            disabled={!player.enabled}
            onClick={() => player.play(main, "ORIGINAL")}
          >
            기본 음성
          </button>
        )}
        {active &&
          (player.busy || player.hasAudio || player.engine === "DEVICE") && (
            <button
              type="button"
              className="btn min-h-11 px-3 text-sm text-muted-foreground"
              onClick={player.stop}
            >
              <Square size={14} aria-hidden="true" />
              {player.busy ? "준비 취소" : "재생 중지"}
            </button>
          )}
      </div>
      {active && player.message && (
        <p
          role="status"
          className="mt-2 px-1 text-sm leading-relaxed text-muted-foreground"
        >
          {player.message}
        </p>
      )}
      {!player.enabled && (
        <p className="mt-2 px-1 text-sm text-muted-foreground">
          음성 설정을 불러오는 중…
        </p>
      )}
      {player.engine === "ORIGINAL" && !note.audioId && (
        <p className="mt-2 px-1 text-sm text-muted-foreground">
          기본 음성이 없습니다.{" "}
          <Link className="text-primary underline" href="/settings">
            학습 음성 선택
          </Link>
        </p>
      )}
    </div>
  );
}
