---
name: theme-dark-mode
description: 다크모드 테마 provider 와 토글을 구성할 때 사용. "다크모드", "테마 토글", "next-themes", "theme provider" 요청에 사용.
---

# 테마 / 다크모드

`.dark` 클래스 토글 + 토큰 오버라이드([tailwind-setup](../tailwind-setup/SKILL.md))로 구현. `next-themes` 권장.

## 템플릿

```tsx
// src/app/theme-provider.tsx
"use client";
import { ThemeProvider as NextThemes } from "next-themes";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemes attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      {children}
    </NextThemes>
  );
}
```

```tsx
// 토글
"use client";
import { useTheme } from "next-themes";
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  return <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")} aria-label="테마 전환" />;
}
```

## 규칙

- `attribute="class"` 로 `.dark` 토글, SSR 깜빡임 방지(`suppressHydrationWarning` on `<html>`)
- 색은 토큰으로만 → 라이트/다크 자동 전환
- ThemeProvider 는 FSD `app` 레이어 Providers 에 포함

## 관련 스킬

[tailwind-setup](../tailwind-setup/SKILL.md) · [nextjs-app-routing](../nextjs-app-routing/SKILL.md)
