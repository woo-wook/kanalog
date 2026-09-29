---
name: auth-bff-cookies
description: BFF 로그인/로그아웃 Route Handler 로 JWT 를 httpOnly 쿠키에 보관할 때 사용. "로그인 BFF", "httpOnly 쿠키", "쿠키 인증", "logout 쿠키 clear" 요청에 사용.
---

# BFF 쿠키 인증 (로그인/로그아웃)

토큰을 브라우저 JS 에 노출하지 않기 위해 BFF 가 받아 httpOnly 쿠키에 저장한다.

## 템플릿

```ts
// app/api/auth/login/route.ts
import { cookies } from "next/headers";
import { env } from "@/shared/config/env";

export async function POST(req: Request) {
  const body = await req.text();
  const res = await fetch(`${env.BACKEND_API_URL}/api/auth/login`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body, cache: "no-store",
  });
  const json = await res.json();
  if (!res.ok) return Response.json(json, { status: res.status });

  const token: string = json.data.accessToken; // 백엔드 AccessToken 계약
  (await cookies()).set("access_token", token, {
    httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 60 * 60,
  });
  return Response.json({ ok: true });
}
```

```ts
// app/api/auth/logout/route.ts
import { cookies } from "next/headers";
export async function POST() {
  (await cookies()).delete("access_token");
  return Response.json({ ok: true });
}
```

## 규칙

- 쿠키: `httpOnly` + `secure` + `sameSite=lax` + `path=/`
- maxAge 는 토큰 만료와 정렬. 리프레시 도입 시 refresh 쿠키 별도
- ⚠️ 백엔드 `/api/auth/login` 미구현 → 준비 전엔 MSW/Playwright 모킹

## 관련 스킬

[bff-route-handler](../bff-route-handler/SKILL.md) · [auth-middleware](../auth-middleware/SKILL.md) · [session-entity](../session-entity/SKILL.md)

## 백엔드 출처

`backend/.../common/security/AccessToken.kt`, `SecurityConfig.kt`
