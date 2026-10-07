"use client";
import { useState } from "react";
import { Search, X } from "lucide-react";
import type { KanaReferenceGroup } from "./api";

export function KanaReference({
  groups,
  showHangulHint,
}: {
  groups: KanaReferenceGroup[];
  showHangulHint: boolean;
}) {
  const [search, setSearch] = useState("");
  const term = search.trim().toLowerCase();
  const filtered = groups
    .map((group) => ({
      ...group,
      rows: group.rows
        .map((row) => ({
          ...row,
          characters: row.characters.filter(
            (c) =>
              !term ||
              [
                c.hiragana,
                c.katakana,
                c.romaji,
                ...(showHangulHint ? [c.hangul] : []),
              ].some((value) => value.toLowerCase().includes(term)),
          ),
        }))
        .filter((row) => row.characters.length),
    }))
    .filter((group) => group.rows.length);
  return (
    <div className="space-y-6">
      <div className="kana-reference-search relative">
        <Search
          className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <input
          type="search"
          className="field h-12 text-base"
          aria-label="가나 찾기"
          placeholder="문자·로마자로 찾기"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && (
          <button
            type="button"
            aria-label="검색 지우기"
            className="absolute right-1 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary"
            onClick={() => setSearch("")}
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        )}
      </div>
      <nav aria-label="가나 참고표 분류" className="grid grid-cols-4 gap-2">
        {filtered.map((group) => (
          <a
            key={group.key}
            href={`#kana-${group.key}`}
            className="flex min-h-11 items-center justify-center rounded-full bg-secondary px-1 text-sm font-medium hover:bg-primary/10"
          >
            {group.title}
          </a>
        ))}
      </nav>
      <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
        <p>
          <span className="font-semibold text-primary">あ</span> 히라가나
        </p>
        <p>
          <span className="font-semibold">ア</span> 가타카나
        </p>
        <p className="muted">같은 소리의 두 문자를 함께 비교해요.</p>
      </div>
      {filtered.length === 0 && (
        <p
          role="status"
          className="surface p-6 text-center text-muted-foreground"
        >
          일치하는 문자가 없습니다.
        </p>
      )}
      {filtered.map((group) => (
        <section
          key={group.key}
          id={`kana-${group.key}`}
          aria-label={group.title}
          className="surface scroll-mt-24 p-3 sm:p-6"
        >
          <div className="mb-5 flex items-baseline justify-between gap-2">
            <h2 className="text-lg font-semibold">{group.title}</h2>
            <p className="muted text-xs">
              {group.rows.reduce((n, row) => n + row.characters.length, 0)}쌍
            </p>
          </div>
          <div className="space-y-5">
            {group.rows.map((row) => (
              <div key={row.title}>
                <h3 className="mb-2 text-xs font-medium text-muted-foreground">
                  {row.title}
                </h3>
                <div
                  className={`grid gap-1.5 sm:gap-3 ${group.key === "yoon" ? "grid-cols-3" : "grid-cols-5"}`}
                >
                  {row.characters.map((c) => (
                    <div
                      key={c.hiragana}
                      aria-label={`히라가나 ${c.hiragana}, 가타카나 ${c.katakana}, ${c.romaji}`}
                      className="kana-reference-pair min-w-0 rounded-2xl border border-border/60 bg-secondary/35 px-1 py-3 text-center sm:px-2 sm:py-4"
                    >
                      <div
                        className="jp grid grid-cols-2 items-center text-[22px] font-semibold leading-relaxed sm:text-3xl"
                        lang="ja"
                      >
                        <span className="text-primary">{c.hiragana}</span>
                        <span className="border-l border-border/70">
                          {c.katakana}
                        </span>
                      </div>
                      <p className="mt-2 text-xs font-medium text-muted-foreground">
                        {c.romaji}
                      </p>
                      {showHangulHint && (
                        <p className="mt-1 text-sm font-medium text-primary">
                          {c.hangul}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
      <section
        aria-label="읽을 때 알아두기"
        className="surface space-y-3 p-5 text-sm leading-relaxed"
      >
        <h2 className="font-semibold">읽을 때 알아두기</h2>
        <p className="muted">
          작은 ゃ・ゅ・ょ / ャ・ュ・ョ는 앞 문자와 함께 읽어요. きゃ / キャ →
          kya.
        </p>
        <p className="muted">
          작은 っ / ッ는 다음 자음 앞에서 잠깐 멈추는 촉음, ー는 앞 모음을 길게
          읽는 장음이에요.
        </p>
        <p className="muted">
          は・へ・を는 조사로 쓰일 때 와・에・오로 읽어요. ん / ン의 실제 소리는
          앞뒤 문자에 따라 달라져요.
        </p>
        {showHangulHint && (
          <p className="muted">
            한글은 근사 표기예요. 정확한 읽기는 가나와 음성을 함께 익혀 주세요.
          </p>
        )}
      </section>
    </div>
  );
}
