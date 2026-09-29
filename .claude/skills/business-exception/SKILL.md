---
name: business-exception
description: ErrorCode 를 들고 던지는 BusinessException 기반 예외를 만들 때 사용. "비즈니스 예외", "BusinessException", "도메인 예외" 요청에 사용.
---

# BusinessException

ErrorCode 를 품은 런타임 예외. 전역 핸들러가 이걸 받아 표준 에러 응답으로 변환.

## 템플릿

```kotlin
open class BusinessException(
    val errorCode: ErrorCode,
    message: String? = null,
    cause: Throwable? = null,
) : RuntimeException(message ?: errorCode.message, cause)
```

## 사용

```kotlin
throw BusinessException(ErrorCode.NotFound.RESOURCE_NOT_FOUND)
throw BusinessException(ErrorCode.Conflict.ALREADY_EXISTS, "이미 가입된 이메일입니다")
```

## 규칙

- 도메인별 구체 예외는 `BusinessException` 을 상속 → [domain-error-code](../domain-error-code/SKILL.md)
- 메시지 미지정 시 `errorCode.message` 사용
- 처리는 [global-exception-handler](../global-exception-handler/SKILL.md)

## 관련 스킬

[error-code-catalog](../error-code-catalog/SKILL.md) · [global-exception-handler](../global-exception-handler/SKILL.md) · [domain-error-code](../domain-error-code/SKILL.md)

## 차용 원본

`common/core/.../support/exception/BusinessException.kt`
