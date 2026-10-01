"use client";
import Link from "next/link";
import { useState, type SelectHTMLAttributes } from "react";
import { ChevronDown, Shuffle } from "lucide-react";

const groups = [
  { key: "basic", label: "기본 46자", count: 46 },
  { key: "voiced", label: "탁음 20자", count: 20 },
  { key: "semiVoiced", label: "반탁음 5자", count: 5 },
  { key: "yoon", label: "요음 33개", count: 33 },
];
function SelectControl({
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <span className="relative mt-2 block min-w-0">
      <select
        {...props}
        className="field h-12 min-w-0 appearance-none pr-10 text-base"
      >
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
    </span>
  );
}
export function KanaMix() {
  const [script, setScript] = useState("hiragana");
  const [selected, setSelected] = useState(["basic"]);
  const [size, setSize] = useState("10");
  const [mode, setMode] = useState("study");
  const total =
    groups
      .filter((g) => selected.includes(g.key))
      .reduce((sum, g) => sum + g.count, 0) * (script === "both" ? 2 : 1);
  const params = new URLSearchParams({
    kana: script,
    groups: groups
      .filter((g) => selected.includes(g.key))
      .map((g) => g.key)
      .join(","),
    size: size === "all" ? String(total) : size,
    practice: mode === "practice" ? "1" : "0",
  });
  return (
    <section
      aria-labelledby="kana-mix-title"
      className="surface min-w-0 p-5 sm:p-6"
    >
      <div className="flex items-center gap-2">
        <Shuffle className="h-5 w-5 text-primary" aria-hidden="true" />
        <h2 id="kana-mix-title" className="text-lg font-semibold">
          가나 섞어 연습
        </h2>
      </div>
      <p className="muted mt-2 text-sm leading-relaxed">
        행 순서 대신 여러 문자를 섞어 읽어 보세요. 시작할 때마다 순서가
        바뀝니다.
      </p>
      <div className="mt-5 grid min-w-0 gap-4 sm:grid-cols-2">
        <label className="min-w-0 text-sm font-medium">
          문자 종류
          <SelectControl
            value={script}
            onChange={(e) => setScript(e.target.value)}
          >
            <option value="hiragana">히라가나</option>
            <option value="katakana">가타카나</option>
            <option value="both">히라가나 + 가타카나</option>
          </SelectControl>
        </label>
        <label className="min-w-0 text-sm font-medium">
          한 번에 연습할 문자
          <SelectControl value={size} onChange={(e) => setSize(e.target.value)}>
            {[5, 10, 20, 30].map((n) => (
              <option key={n} value={n}>
                {n}장씩
              </option>
            ))}
            <option value="all">선택한 범위 전체</option>
          </SelectControl>
        </label>
      </div>
      <fieldset className="mt-5">
        <legend className="text-sm font-medium">섞을 문자</legend>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {groups.map((g) => (
            <label
              key={g.key}
              className="flex min-h-12 items-center gap-2 rounded-xl bg-secondary/60 px-3 py-2 text-sm"
            >
              <input
                type="checkbox"
                checked={selected.includes(g.key)}
                onChange={(e) =>
                  setSelected((old) =>
                    e.target.checked
                      ? [...old, g.key]
                      : old.filter((key) => key !== g.key),
                  )
                }
              />
              {g.label}
            </label>
          ))}
        </div>
      </fieldset>
      <label className="mt-5 block text-sm font-medium">
        연습 방식
        <SelectControl value={mode} onChange={(e) => setMode(e.target.value)}>
          <option value="study">학습·복습</option>
          <option value="practice">자유 연습</option>
        </SelectControl>
      </label>
      <p className="muted mt-3 text-xs leading-relaxed">
        {mode === "practice"
          ? "이미 본 문자도 다시 연습합니다. 답변은 따로 저장하며 복습 일정과 코스 진도를 바꾸지 않아요."
          : "복습할 문자부터 고르고 새 문자를 섞습니다. 새 문자는 하루 한도 안에서만 추가하므로 선택한 장수보다 적을 수 있어요."}
      </p>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <p className="muted text-sm">선택 범위 {total}장</p>
        {selected.length > 0 ? (
          <Link className="btn btn-primary" href={`/study?${params}`}>
            섞어서 시작
          </Link>
        ) : (
          <button className="btn btn-primary" disabled>
            섞어서 시작
          </button>
        )}
      </div>
    </section>
  );
}
