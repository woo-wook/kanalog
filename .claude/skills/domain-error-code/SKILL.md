---
name: domain-error-code
description: 모듈/도메인 전용 ErrorCode enum과 그에 대응하는 구체 예외를 만들 때 사용. "도메인 에러코드", "모듈별 예외", "XxxNotFoundException" 요청에 사용.
---

# 도메인별 ErrorCode + 예외

공통 `ErrorCode` 인터페이스를 모듈에서 구현해 도메인 고유 에러를 표현. 구체 예외는 `BusinessException` 상속.

## 템플릿

```kotlin
// domain/<name>/exception
enum class <X>ErrorCode(override val message: String, override val httpStatus: Int) : ErrorCode {
    <X>_NOT_FOUND("<x>를 찾을 수 없습니다", 404),
    <X>_ALREADY_EXISTS("이미 존재하는 <x>입니다", 409),
}

class <X>NotFoundException : BusinessException(<X>ErrorCode.<X>_NOT_FOUND)
```

## 규칙

- 예외 클래스는 `domain/<name>/exception/` 에 위치
- 응답 코드는 enum name 그대로 노출됨 (`responseCode`)
- 표현 메시지는 사용자 친화적으로

## 관련 스킬

[error-code-catalog](../error-code-catalog/SKILL.md) · [business-exception](../business-exception/SKILL.md) · [global-exception-handler](../global-exception-handler/SKILL.md)

## 차용 원본

`account/.../domain/term/exception/{TermErrorCode,TermNotFoundException}.kt`
