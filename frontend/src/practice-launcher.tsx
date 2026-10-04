"use client";
import Link from "next/link";
import { useState } from "react";
import {
  BookOpen,
  MessageSquareText,
  ArrowUpRight,
  Repeat2,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, json, type Settings, type StudyOption } from "./api";

const levels = [
  ["N5", "입문"],
  ["N4", "초급"],
  ["N3", "중급"],
  ["N2", "중고급"],
  ["N1", "고급"],
];
export function PracticeLauncher({ dueCount }: { dueCount?: number }) {
  const client = useQueryClient();
  const options = useQuery({
    queryKey: ["study-options"],
    queryFn: () => api<StudyOption[]>("/study/options"),
  });
  const settings = useQuery({
    queryKey: ["settings"],
    queryFn: () => api<Settings>("/settings"),
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const level = settings.data?.practiceLevel ?? "N5";
  async function changeLevel(value: string) {
    setSaving(true);
    setError("");
    try {
      const updated = await api<Settings>(
        "/settings",
        json("PATCH", { practiceLevel: value }),
      );
      client.setQueryData(["settings"], updated);
    } catch {
      setError("레벨을 저장하지 못했습니다. 다시 선택해 주세요.");
    } finally {
      setSaving(false);
    }
  }
  const available = options.data?.filter((row) => row.level === level) ?? [];
  const levelDue = available.reduce((sum, row) => sum + row.due, 0);
  const allDue =
    dueCount ?? options.data?.reduce((sum, row) => sum + row.due, 0) ?? 0;
  return (
    <section className="surface overflow-hidden" aria-label="레벨 전체 연습">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border px-5 py-5 sm:px-7">
        <div>
          <p className="text-xs font-semibold text-primary">오늘의 연습</p>
          <h2 className="mt-1 text-xl font-semibold">내 레벨에서 골고루</h2>
        </div>
        <label className="text-xs font-medium text-muted-foreground">
          내 학습 레벨
          <select
            className="ml-2 min-h-11 rounded-xl border border-border bg-background px-3 text-sm font-semibold text-foreground"
            value={level}
            disabled={saving || settings.isPending}
            onChange={(e) => void changeLevel(e.target.value)}
          >
            {levels.map(([value, name]) => (
              <option key={value} value={value}>
                {value} · {name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="p-5 sm:p-7">
        <p className="muted text-sm leading-relaxed">
          레슨 구분 없이 {level} 전체에서 뽑아요. 복습을 먼저 하고, 남은 하루
          한도만큼 새 카드를 만나요.
        </p>
        {(options.error || settings.error || error) && (
          <p role="alert" className="mt-3 text-sm text-red-700">
            {error || "연습 정보를 불러오지 못했습니다."}
            <button
              className="ml-2 underline"
              onClick={() => {
                void options.refetch();
                void settings.refetch();
              }}
            >
              다시 시도
            </button>
          </p>
        )}
        {options.isPending && (
          <p className="muted mt-4 text-sm" role="status">
            학습 범위를 불러오는 중…
          </p>
        )}
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {(["vocabulary", "grammar"] as const).map((kind) => {
            const row = available.find((item) => item.kind === kind);
            const Icon = kind === "vocabulary" ? BookOpen : MessageSquareText;
            const name = kind === "vocabulary" ? "단어 연습" : "문법 연습";
            return row && row.total > 0 ? (
              <Link
                key={kind}
                href={`/study?level=${level}&kind=${kind}`}
                className="group flex min-h-28 items-center gap-4 rounded-2xl border border-primary/15 bg-primary/5 p-5 transition-colors hover:bg-primary/10"
              >
                <span className="rounded-xl bg-white p-3 text-primary">
                  <Icon className="h-6 w-6" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-lg font-semibold">{name}</span>
                  <span className="muted mt-1 block text-xs">
                    {row.total}장 중 · 복습 {row.due}장
                  </span>
                </span>
                <ArrowUpRight
                  className="h-5 w-5 text-primary"
                  aria-hidden="true"
                />
              </Link>
            ) : (
              <div key={kind} className="rounded-2xl border border-border p-5">
                <p className="font-semibold">{name}</p>
                <p className="muted mt-2 text-xs">
                  이 레벨의 가져온 데이터가 없습니다.
                </p>
              </div>
            );
          })}
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <Link
            className="btn justify-between text-sm"
            href={`/study?level=${level}&mode=review`}
          >
            <span>{level} 전체 복습</span>
            <span className="text-primary">{levelDue}장</span>
          </Link>
          <Link
            className="btn justify-between text-sm"
            href="/study?level=all&mode=review"
          >
            <span className="flex items-center gap-2">
              <Repeat2 className="h-4 w-4" aria-hidden="true" />
              모든 레벨 복습
            </span>
            <span className="text-primary">{allDue}장</span>
          </Link>
        </div>
        <p className="muted mt-4 text-xs leading-relaxed">
          ‘다시’ 카드는 마치기 전에 한 번 더 연습하고, 내일도 복습해요. 복습
          전용은 배운 카드만 나옵니다.
        </p>
      </div>
    </section>
  );
}
