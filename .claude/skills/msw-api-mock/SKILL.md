---
name: msw-api-mock
description: MSW 로 백엔드 API 응답(Response<T>)을 모킹해 테스트할 때 사용. "MSW", "API 모킹", "핸들러", "mock server" 요청에 사용.
---

# MSW API 모킹

네트워크 레이어에서 백엔드 응답을 가로채 성공/에러/401 경로를 테스트한다.

## 템플릿

```ts
// src/shared/api/__mocks__/handlers.ts
import { http, HttpResponse } from "msw";

export const handlers = [
  http.get("/api/bff/api/transactions", () =>
    HttpResponse.json({ code: "SUCCESS", message: "ok", data: [] }),
  ),
  http.post("/api/auth/login", () => HttpResponse.json({ ok: true })),
];

// src/shared/api/__mocks__/server.ts
import { setupServer } from "msw/node";
import { handlers } from "./handlers";
export const server = setupServer(...handlers);
```

```ts
// vitest.setup.ts 에 연결
import { server } from "@/shared/api/__mocks__/server";
import { beforeAll, afterAll, afterEach } from "vitest";
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

## 규칙

- 백엔드 계약(`{code,message,data}` / 에러 `{code,message}`)을 그대로 모킹 → 스키마 파싱까지 검증
- 에러/401 케이스는 `server.use(...)` 로 테스트별 오버라이드
- 브라우저 개발 모킹이 필요하면 `setupWorker`(이번 범위 외)

## 관련 스킬

[response-zod-schema](../response-zod-schema/SKILL.md) · [api-client](../api-client/SKILL.md) · [vitest-setup](../vitest-setup/SKILL.md)
