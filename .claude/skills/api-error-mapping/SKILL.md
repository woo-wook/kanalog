---
name: api-error-mapping
description: 백엔드 ErrorCode(enum name)를 사용자 메시지로 매핑하고 AppError 를 정규화할 때 사용. "에러 매핑", "ErrorCode 메시지", "AppError", "에러 처리" 요청에 사용.
---

# AppError + 에러 매핑

백엔드 에러 코드를 정규화한 `AppError` 로 다루고, 코드 → 사용자 메시지 매핑 테이블을 둔다.

## 템플릿

```ts
// src/shared/api/error.ts
export class AppError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "AppError";
  }
  get isUnauthorized() { return this.status === 401; }
}

// 코드 → 사용자 메시지(백엔드 메시지보다 UX 친화적으로 덮어쓸 때)
const MESSAGES: Record<string, string> = {
  INVALID_INPUT: "입력값을 확인해 주세요.",
  EXPIRED_TOKEN: "로그인이 만료되었어요. 다시 로그인해 주세요.",
  RESOURCE_NOT_FOUND: "요청한 정보를 찾을 수 없어요.",
};

export function messageFor(error: AppError): string {
  return MESSAGES[error.code] ?? error.message;
}
```

## 규칙

- 백엔드 `ErrorCode` enum name 과 키를 일치시킴(예: `EXPIRED_TOKEN`, `INVALID_INPUT`)
- 미정의 코드는 백엔드 message 폴백
- 401 → 인증 만료 처리(쿼리 레이어/미들웨어와 연계)

## 관련 스킬

[api-client](../api-client/SKILL.md) · [response-zod-schema](../response-zod-schema/SKILL.md) · [auth-middleware](../auth-middleware/SKILL.md)

## 백엔드 출처

`backend/.../common/error/ErrorCode.kt` (BadRequest/Unauthorized/NotFound/Conflict/Internal 그룹)
