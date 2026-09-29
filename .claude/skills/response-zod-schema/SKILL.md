---
name: response-zod-schema
description: 백엔드 표준 응답(Response<T> = {code,message,data})을 Zod 로 파싱하는 스키마를 만들 때 사용. "응답 스키마", "Zod 파싱", "Response<T> 파싱", "API 타입 검증" 요청에 사용.
---

# Response<T> Zod 스키마

백엔드 계약을 런타임에 검증·언랩한다. 성공: `{code,message,data}`, 에러: `{code,message}`.

## 템플릿

```ts
// src/shared/api/schema.ts
import { z } from "zod";

export const successSchema = <T extends z.ZodTypeAny>(data: T) =>
  z.object({ code: z.literal("SUCCESS"), message: z.string(), data });

export const errorSchema = z.object({
  code: z.string(),     // 백엔드 ErrorCode enum name (예: RESOURCE_NOT_FOUND)
  message: z.string(),
});

export type ApiError = z.infer<typeof errorSchema>;
```

## 규칙

- 모든 API 응답은 이 스키마로 파싱 후 타입 확보(맹신 금지)
- `data` 스키마는 호출부에서 주입(엔티티별 스키마)
- 파싱 실패는 클라이언트에서 `AppError`(파싱 오류)로 변환 → [api-client](../api-client/SKILL.md)

## 관련 스킬

[api-client](../api-client/SKILL.md) · [api-error-mapping](../api-error-mapping/SKILL.md) · [typescript-strict](../typescript-strict/SKILL.md)

## 백엔드 출처

`backend/.../common/response/Response.kt`, `common/error/ErrorCode.kt`
