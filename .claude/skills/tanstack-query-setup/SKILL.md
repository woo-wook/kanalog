---
name: tanstack-query-setup
description: TanStack Query v5 의 QueryClient/Provider 기본 옵션과 쿼리/뮤테이션 패턴을 만들 때 사용. "TanStack Query", "react-query", "QueryClient", "useQuery 패턴" 요청에 사용.
---

# TanStack Query 셋업

서버 상태 캐싱/동기화. Provider 는 FSD `app` 레이어에 둔다.

## 템플릿

```tsx
// src/app/providers.tsx
"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { AppError } from "@/shared/api/error";

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: (count, err) =>
          err instanceof AppError && err.status >= 400 && err.status < 500 ? false : count < 2,
      },
    },
  }));
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
```

```ts
// 슬라이스 api/ — 쿼리 훅
export function useTransactions() {
  return useQuery({ queryKey: transactionKeys.list(), queryFn: () => fetchTransactions() });
}
```

## 규칙

- 4xx(`AppError`)는 재시도 안 함, 5xx/네트워크만 제한 재시도
- 키는 [query-keys-factory](../query-keys-factory/SKILL.md)
- 401 처리: 전역 콜백 또는 라우팅 가드와 연계 → [auth-middleware](../auth-middleware/SKILL.md)
- 뮤테이션 성공 시 `invalidateQueries`

## 관련 스킬

[query-keys-factory](../query-keys-factory/SKILL.md) · [api-client](../api-client/SKILL.md) · [api-error-mapping](../api-error-mapping/SKILL.md)
