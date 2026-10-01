"use client";
import { FormEvent, useState } from "react";
import { BookOpen } from "lucide-react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { api, json, me } from "@/api";
export default function LoginPage() {
  const router = useRouter(),
    client = useQueryClient(),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [pending, setPending] = useState(false),
    [error, setError] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      await api("/auth/login", json("POST", { email, password }));
      await me();
      await client.invalidateQueries({ queryKey: ["me"] });
      router.replace("/");
    } catch (e) {
      setError(e instanceof Error ? e.message : "로그인할 수 없습니다.");
    } finally {
      setPending(false);
    }
  }
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-12">
      <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
        <BookOpen className="h-6 w-6" aria-hidden="true" />
      </div>
      <h1 className="text-center text-2xl font-semibold tracking-tight">
        일본어 학습
      </h1>
      <p className="muted mt-3 text-center">
        가타카나부터, 오늘의 학습을 이어가세요.
      </p>
      <form onSubmit={submit} className="surface mt-8 space-y-5 p-6 sm:p-7">
        <div>
          <label htmlFor="email" className="mb-2 block text-sm font-medium">
            이메일
          </label>
          <input
            id="email"
            className="field"
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="password" className="mb-2 block text-sm font-medium">
            비밀번호
          </label>
          <input
            id="password"
            className="field"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <button disabled={pending} className="btn btn-primary w-full">
          {pending ? "로그인 중…" : "로그인"}
        </button>
      </form>
    </main>
  );
}
