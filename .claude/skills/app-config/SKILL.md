---
name: app-config
description: 앱 전역 상수/설정을 shared/config 에 모을 때 사용. "앱 설정", "상수", "config", "공개 경로 목록" 요청에 사용.
---

# 앱 설정 (shared/config)

매직값을 흩뿌리지 않고 `shared/config` 한 곳에 모은다.

## 템플릿

```ts
// src/shared/config/routes.ts
export const ROUTES = {
  home: "/",
  login: "/login",
  dashboard: "/dashboard",
} as const;

export const PUBLIC_ROUTES = ["/login"] as const;

// src/shared/config/query.ts
export const QUERY_DEFAULTS = { staleTime: 30_000, retry: 2 } as const;
```

## 규칙

- 라우트/쿠키명/쿼리기본값 등 상수는 config 로 → 미들웨어·BFF·링크가 동일 소스 참조
- env(런타임 주입)는 [env-validation](../env-validation/SKILL.md), config 는 코드 상수
- `as const` 로 리터럴 타입 유지

## 관련 스킬

[env-validation](../env-validation/SKILL.md) · [auth-middleware](../auth-middleware/SKILL.md)
