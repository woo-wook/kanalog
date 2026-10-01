"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { api, me, setCsrfToken } from "./api";
const nav = [
  { href: "/", label: "홈" },
  { href: "/decks", label: "덱" },
  { href: "/notes", label: "단어장" },
  { href: "/stats", label: "통계" },
  { href: "/settings", label: "설정" },
];
export function Shell({ children }: { children: React.ReactNode }) {
  const router = useRouter(),
    path = usePathname(),
    client = useQueryClient();
  const user = useQuery({ queryKey: ["me"], queryFn: me, retry: false });
  useEffect(() => {
    if (user.error) router.replace("/login");
  }, [user.error, router]);
  async function logout() {
    try {
      await api("/auth/logout", { method: "POST" });
    } finally {
      setCsrfToken(undefined);
      client.clear();
      if ("serviceWorker" in navigator)
        navigator.serviceWorker.controller?.postMessage("CLEAR_PRIVATE_CACHES");
      router.replace("/login");
    }
  }
  if (user.isPending)
    return (
      <div className="grid min-h-screen place-items-center" role="status">
        로그인 상태를 확인하고 있습니다…
      </div>
    );
  if (user.error)
    return (
      <div className="grid min-h-screen place-items-center" role="status">
        로그인 화면으로 이동합니다…
      </div>
    );
  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 hidden w-56 border-r border-[#dce4df] bg-white p-6 md:block">
        <Link href="/" className="text-xl font-bold text-[#2e7167]">
          일본어 학습
        </Link>
        <nav className="mt-12 flex flex-col gap-2" aria-label="주요 메뉴">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={path === item.href ? "page" : undefined}
              className={`rounded-xl px-4 py-3 ${path === item.href ? "bg-[#e8f2ed] font-bold text-[#205d51]" : "hover:bg-[#f3f6f3]"}`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <button onClick={logout} className="mt-10 text-sm muted">
          로그아웃
        </button>
      </aside>
      <header className="flex h-14 items-center justify-between border-b bg-white px-4 md:hidden">
        <Link href="/" className="font-bold text-[#2e7167]">
          일본어 학습
        </Link>
        <button onClick={logout} className="text-sm muted">
          로그아웃
        </button>
      </header>
      <main className="page-pad mx-auto max-w-4xl px-4 py-6 md:ml-56 md:px-8 md:py-10">
        {children}
      </main>
      <nav
        className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t bg-white pb-[env(safe-area-inset-bottom)] md:hidden"
        aria-label="주요 메뉴"
      >
        {nav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-current={path === item.href ? "page" : undefined}
            className={`min-h-16 px-1 pt-3 text-center text-xs ${path === item.href ? "font-bold text-[#2e7167]" : "muted"}`}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
export function Loading() {
  return (
    <p className="muted py-8" role="status">
      불러오는 중…
    </p>
  );
}
export function ErrorMessage({ error }: { error: unknown }) {
  return (
    <p role="alert" className="surface border-[#e7c4bd] p-4 text-[#993d36]">
      {error instanceof Error ? error.message : "요청을 처리하지 못했습니다."}
    </p>
  );
}
