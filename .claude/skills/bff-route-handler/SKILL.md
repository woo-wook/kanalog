---
name: bff-route-handler
description: Next Route Handler 로 백엔드(Spring)를 프록시하는 BFF 를 만들 때 사용. 쿠키의 JWT 를 Bearer 로 부착. "BFF", "route handler", "프록시", "Bearer 부착", "api/bff" 요청에 사용.
---

# BFF Route Handler (Spring 프록시)

브라우저 → Next BFF(`/api/bff/*`) → Spring. 토큰은 httpOnly 쿠키에서 읽어 서버에서만 Bearer 로 부착한다.

## 템플릿

```ts
// app/api/bff/[...path]/route.ts
import { cookies } from "next/headers";
import { env } from "@/shared/config/env";

async function proxy(req: Request, path: string[]) {
  const token = (await cookies()).get("access_token")?.value;
  const url = `${env.BACKEND_API_URL}/${path.join("/")}${new URL(req.url).search}`;

  const res = await fetch(url, {
    method: req.method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: ["GET", "HEAD"].includes(req.method) ? undefined : await req.text(),
    cache: "no-store",
  });
  return new Response(res.body, { status: res.status, headers: { "Content-Type": "application/json" } });
}

type Ctx = { params: Promise<{ path: string[] }> };
export async function GET(req: Request, { params }: Ctx) { return proxy(req, (await params).path); }
export async function POST(req: Request, { params }: Ctx) { return proxy(req, (await params).path); }
export async function PUT(req: Request, { params }: Ctx) { return proxy(req, (await params).path); }
export async function PATCH(req: Request, { params }: Ctx) { return proxy(req, (await params).path); }
export async function DELETE(req: Request, { params }: Ctx) { return proxy(req, (await params).path); }
```

## 규칙

- 토큰은 절대 클라이언트로 내려보내지 않음(서버에서만 부착)
- `env.BACKEND_API_URL` 사용 → [env-validation](../env-validation/SKILL.md)
- Next 15 의 `cookies()`/`params` 는 async → `await`
- 로그인/로그아웃은 별도 핸들러 → [auth-bff-cookies](../auth-bff-cookies/SKILL.md)

## 관련 스킬

[auth-bff-cookies](../auth-bff-cookies/SKILL.md) · [api-client](../api-client/SKILL.md) · [nextjs-app-routing](../nextjs-app-routing/SKILL.md)
