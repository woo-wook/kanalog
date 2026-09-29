---
name: session-entity
description: 현재 사용자 세션을 표현하는 FSD entities/session 슬라이스(모델 + useSession)를 만들 때 사용. "세션", "현재 사용자", "useSession", "로그인 상태" 요청에 사용.
---

# Session 엔티티

현재 인증 사용자 정보를 entities 레이어에 둔다. 토큰은 다루지 않음(BFF/쿠키 담당).

## 구조

```
src/entities/session/
├── model/ types.ts        # Session, User
├── model/ use-session.ts  # 현재 세션 조회 훅
├── api/ get-session.ts     # BFF 경유 /api/bff/api/me 등
└── index.ts
```

## 템플릿

```ts
// model/types.ts
import { z } from "zod";
export const userSchema = z.object({ id: z.string(), name: z.string() });
export type User = z.infer<typeof userSchema>;

// model/use-session.ts
"use client";
import { useQuery } from "@tanstack/react-query";
import { getSession } from "../api/get-session";
export function useSession() {
  return useQuery({ queryKey: ["session"], queryFn: getSession, staleTime: 5 * 60_000 });
}
```

## 규칙

- 세션 데이터는 [api-client](../api-client/SKILL.md) 로 BFF 경유 조회
- 로그인/로그아웃 상호작용은 `features/auth` (entities 는 데이터·표시)
- 401 시 세션 무효 → 로그인 유도

## 관련 스킬

[fsd-slice-segment](../fsd-slice-segment/SKILL.md) · [auth-bff-cookies](../auth-bff-cookies/SKILL.md) · [tanstack-query-setup](../tanstack-query-setup/SKILL.md)
