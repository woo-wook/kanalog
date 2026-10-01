"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BookOpen,
  ChartNoAxesColumn,
  GraduationCap,
  Home,
  LogOut,
  NotebookTabs,
  Settings,
} from "lucide-react";
import { useEffect } from "react";
import { api, me, setCsrfToken } from "./api";
const nav = [
  { href: "/", label: "홈", icon: Home },
  { href: "/courses", label: "코스", icon: GraduationCap },
  { href: "/notes", label: "단어장", icon: NotebookTabs },
  { href: "/stats", label: "통계", icon: ChartNoAxesColumn },
  { href: "/settings", label: "설정", icon: Settings },
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
  const active = (href: string) =>
    path === href ||
    (href !== "/" && path.startsWith(`${href}/`)) ||
    (href === "/courses" && path === "/study");
  const brand = (
    <>
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
        <BookOpen className="h-4 w-4" aria-hidden="true" />
      </span>
      <span className="text-base font-semibold tracking-tight">
        일본어 학습
      </span>
    </>
  );
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
    <div className="min-h-screen bg-background">
      <a
        href="#main-content"
        className="sr-only fixed left-4 top-4 z-50 rounded-xl bg-card px-4 py-3 font-semibold text-primary focus:not-sr-only"
      >
        본문으로 건너뛰기
      </a>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-border bg-card md:flex">
        <Link href="/" className="flex items-center gap-2.5 px-5 py-5">
          {brand}
        </Link>
        <nav className="flex-1 space-y-1 px-3 py-3" aria-label="주요 메뉴">
          {nav.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              aria-current={active(href) ? "page" : undefined}
              className={`flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${active(href) ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              {label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-border px-3 py-4">
          <div className="flex items-center gap-2 rounded-xl px-2 py-2">
            <span
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary"
              aria-hidden="true"
            >
              {user.data.email.charAt(0).toUpperCase()}
            </span>
            <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
              {user.data.email}
            </span>
            <button
              onClick={logout}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-muted-foreground hover:bg-secondary hover:text-foreground"
              aria-label="로그아웃"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </aside>
      <header className="fixed inset-x-0 top-0 z-30 flex items-center justify-between bg-card px-4 py-3 pt-[calc(0.75rem+env(safe-area-inset-top))] shadow-sm md:hidden">
        <Link href="/" className="flex items-center gap-2.5">
          {brand}
        </Link>
        <button
          onClick={logout}
          className="flex h-11 w-11 items-center justify-center rounded-xl text-muted-foreground hover:bg-secondary"
          aria-label="로그아웃"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
        </button>
      </header>
      <main
        id="main-content"
        tabIndex={-1}
        className="page-pad min-w-0 pt-[calc(4.5rem+env(safe-area-inset-top))] md:ml-60 md:pt-0"
      >
        <div className="mx-auto max-w-4xl px-4 py-6 md:px-8 md:py-8">
          {children}
        </div>
      </main>
      <nav
        className="fixed inset-x-0 bottom-0 z-30 flex items-stretch bg-card pb-[env(safe-area-inset-bottom)] shadow-[0_-2px_8px_-2px_hsl(222_47%_11%/0.06)] md:hidden"
        aria-label="주요 메뉴"
      >
        {nav.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            aria-current={active(href) ? "page" : undefined}
            className={`flex min-h-16 min-w-0 flex-1 flex-col items-center justify-center gap-1 py-2 text-[11px] font-medium transition-colors ${active(href) ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
          >
            <Icon className="h-5 w-5" aria-hidden="true" />
            {label}
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
    <p role="alert" className="surface border-red-200 p-4 text-destructive">
      {error instanceof Error ? error.message : "요청을 처리하지 못했습니다."}
    </p>
  );
}
