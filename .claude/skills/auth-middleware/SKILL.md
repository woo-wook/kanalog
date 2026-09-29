---
name: auth-middleware
description: Next middleware 로 보호 라우트 접근을 제어할 때 사용. "미들웨어", "라우트 보호", "인증 가드", "redirect to login" 요청에 사용.
---

# Auth 미들웨어 (라우트 보호)

쿠키 존재로 1차 게이트. 공개 경로는 통과, 보호 라우트는 미인증 시 `/login` 으로.

## 템플릿

```ts
// middleware.ts
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC = ["/login", "/api/auth"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC.some((p) => pathname.startsWith(p))) return NextResponse.next();

  const token = req.cookies.get("access_token");
  if (!token) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
```

## 규칙

- 미들웨어는 **존재 여부**만 싸게 확인(서명 검증은 BFF/백엔드가). Edge 런타임 제약 주의
- 진짜 인가는 BFF 프록시 시 백엔드 401 로 최종 판정 → [api-error-mapping](../api-error-mapping/SKILL.md)
- 공개 경로 목록을 백엔드 `/api/auth/**` 와 정렬

## 관련 스킬

[auth-bff-cookies](../auth-bff-cookies/SKILL.md) · [session-entity](../session-entity/SKILL.md) · [nextjs-app-routing](../nextjs-app-routing/SKILL.md)
