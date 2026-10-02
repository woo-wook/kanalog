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
export function KanaMix({
  script: fixedScript,
}: {
  script?: "hiragana" | "katakana";
}) {
  const [chosenScript, setScript] = useState("hiragana");
  const script = fixedScript ?? chosenScript;
  const title = fixedScript
    ? `${fixedScript === "hiragana" ? "히라가나" : "가타카나"} 연습`
    : "가나 섞어 연습";
  const titleId = `kana-${fixedScript ?? "mix"}-title`;
  const startLabel = fixedScript ? "연습 시작" : "섞어서 시작";
  const [selected, setSelected] = useState(["basic"]);
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
  });
  return (
    <section aria-labelledby={titleId} className="surface min-w-0 p-5 sm:p-6">
      <div className="flex items-center gap-2">
        <Shuffle className="h-5 w-5 text-primary" aria-hidden="true" />
        <h2 id={titleId} className="text-lg font-semibold">
          {title}
        </h2>
      </div>
      <p className="muted mt-2 text-sm leading-relaxed">
        연습할 분류를 골라 주세요. 포함한 문자를 모두 섞어 연습합니다.
      </p>
      {!fixedScript && (
        <div className="mt-5 min-w-0">
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
        </div>
      )}
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
      <p className="muted mt-3 text-xs leading-relaxed">
        다시·어려움으로 평가한 문자가 다음 연습에서 먼저 나옵니다. 같은 평가
        안에서는 순서를 섞고, 선택한 문자는 모두 한 번씩 연습합니다.
      </p>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <p className="muted text-sm">총 {total}개 문자</p>
        {selected.length > 0 ? (
          <Link className="btn btn-primary" href={`/study?${params}`}>
            {startLabel}
          </Link>
        ) : (
          <button className="btn btn-primary" disabled>
            {startLabel}
          </button>
        )}
      </div>
    </section>
  );
}
