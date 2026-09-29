---
name: api-client
description: 동일출처 BFF(/api/bff/*)를 호출하고 Response<T>를 언랩하는 타입드 fetch 래퍼를 만들 때 사용. "API 클라이언트", "fetch 래퍼", "data 언랩", "http 클라이언트" 요청에 사용.
---

# 타입드 API 클라이언트

브라우저에서는 동일출처 `/api/bff/*`(BFF) 를 호출한다(토큰은 BFF 가 서버에서 부착). 응답을 Zod 로
파싱해 `data` 만 반환하고, 에러는 `AppError` 로 던진다.

## 템플릿

```ts
// src/shared/api/client.ts
import { z } from "zod";
import { successSchema, errorSchema } from "./schema";
import { AppError } from "./error";

const BFF_BASE = "/api/bff";

export async function apiFetch<T extends z.ZodTypeAny>(
  path: string,
  dataSchema: T,
  init?: RequestInit,
): Promise<z.infer<T>> {
  const res = await fetch(`${BFF_BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const json = await res.json().catch(() => null);

  if (!res.ok) {
    const parsed = errorSchema.safeParse(json);
    throw new AppError(
      parsed.success ? parsed.data.code : "UNEXPECTED",
      parsed.success ? parsed.data.message : "요청 처리 중 오류가 발생했습니다",
      res.status,
    );
  }
  return successSchema(dataSchema).parse(json).data;
}
```

## 규칙

- 클라이언트 컴포넌트는 백엔드를 직접 호출하지 않고 BFF 경유(토큰 노출 방지) → [bff-route-handler](../bff-route-handler/SKILL.md)
- 401 은 `AppError.status === 401` 로 식별(쿼리 레이어에서 로그인 유도) → [tanstack-query-setup](../tanstack-query-setup/SKILL.md)
- 슬라이스 `api/` segment 에서 이 함수를 사용

## 관련 스킬

[response-zod-schema](../response-zod-schema/SKILL.md) · [api-error-mapping](../api-error-mapping/SKILL.md) · [bff-route-handler](../bff-route-handler/SKILL.md)
