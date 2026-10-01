"use client";
import { FormEvent, useState } from "react";
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
      <h1 className="text-center text-3xl font-bold text-[#205d51]">
        일본어 학습
      </h1>
      <p className="muted mt-3 text-center">
        오늘의 단어와 문법을 이어서 공부하세요.
      </p>
      <form onSubmit={submit} className="surface mt-10 space-y-5 p-6">
        <div>
          <label htmlFor="email" className="mb-2 block font-semibold">
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
          <label htmlFor="password" className="mb-2 block font-semibold">
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
          <p role="alert" className="text-sm text-[#993d36]">
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
