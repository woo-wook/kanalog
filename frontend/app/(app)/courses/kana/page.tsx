"use client";
import Link from "next/link";
import { ArrowLeft, Settings2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api, type KanaReferenceGroup, type Settings } from "@/api";
import { KanaReference } from "@/kana-reference";
import { Loading, ErrorMessage } from "@/shell";

export default function KanaReferencePage() {
  const reference = useQuery({
    queryKey: ["kana-reference"],
    queryFn: () => api<KanaReferenceGroup[]>("/kana/reference"),
  });
  const settings = useQuery({
    queryKey: ["settings"],
    queryFn: () => api<Settings>("/settings"),
  });
  if (reference.isPending || settings.isPending) return <Loading />;
  if (reference.error || settings.error)
    return <ErrorMessage error={reference.error ?? settings.error} />;
  return (
    <div className="mx-auto min-w-0 max-w-3xl space-y-6">
      <Link
        href="/courses"
        className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-primary"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        학습 코스
      </Link>
      <header>
        <p className="text-xs font-semibold text-primary">문자 읽기 참고표</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
          히라가나 · 가타카나
        </h1>
        <p className="muted mt-3 text-sm leading-relaxed">
          기본 문자부터 탁음·반탁음·요음까지, 104쌍을 한 페이지에서 찾아보세요.
        </p>
        <Link
          href="/settings"
          className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-primary"
        >
          <Settings2 className="size-4" aria-hidden="true" />
          한글 발음 표시 설정
        </Link>
      </header>
      <KanaReference
        groups={reference.data}
        showHangulHint={Boolean(settings.data.showHangulHint)}
      />
    </div>
  );
}
