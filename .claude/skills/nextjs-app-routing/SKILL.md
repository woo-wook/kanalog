---
name: nextjs-app-routing
description: Next.js App Router 라우팅(얇은 라우팅 레이어, route group, layout)을 FSD 와 함께 구성할 때 사용. "Next 라우팅", "app router", "page.tsx", "route group", "layout" 요청에 사용.
---

# Next.js App Router (얇은 라우팅)

루트 `app/` 는 **라우팅 전용**. page/layout 은 `src/views`·`src/app` 을 렌더만 하고 로직을 담지 않는다.

## 템플릿

```tsx
// app/layout.tsx — 전역 Provider 조립
import { Providers } from "@/app/providers";
import "@/app/globals.css";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body><Providers>{children}</Providers></body>
    </html>
  );
}
```

```tsx
// app/(auth)/login/page.tsx — view 렌더만
import { LoginView } from "@/views/login";
export default function LoginPage() {
  return <LoginView />;
}
```

## 규칙

- route group `(auth)`, `(dashboard)` 로 레이아웃 분리
- `page.tsx`/`layout.tsx` 에 비즈니스 로직 금지 → `src/views`, `src/features`
- Server Component 기본, 상호작용 컴포넌트만 `"use client"`
- BFF 엔드포인트는 `app/api/**/route.ts` → [bff-route-handler](../bff-route-handler/SKILL.md)

## 관련 스킬

[fsd-architecture](../fsd-architecture/SKILL.md) · [bff-route-handler](../bff-route-handler/SKILL.md) · [auth-middleware](../auth-middleware/SKILL.md)
