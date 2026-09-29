---
name: error-code-catalog
description: 확장 가능한 ErrorCode 인터페이스와 HTTP 상태별 그룹 enum 카탈로그를 만들 때 사용. "에러 코드", "ErrorCode", "에러 카탈로그", "HTTP 상태 매핑" 요청에 사용.
---

# ErrorCode 카탈로그

메시지·HTTP 상태·응답 코드를 한 곳에 모으는 확장형 에러 카탈로그. 모듈별로 enum 추가.

## 템플릿

```kotlin
interface ErrorCode {
    val message: String
    val httpStatus: Int
    val responseCode: String get() = (this as Enum<*>).name

    enum class BadRequest(override val message: String) : ErrorCode {
        INVALID_PARAMETER("잘못된 파라미터입니다"),
        INVALID_INPUT("잘못된 입력값입니다");
        override val httpStatus = 400
    }
    enum class Unauthorized(override val message: String) : ErrorCode {
        INVALID_TOKEN("로그인이 필요해요. 로그인을 먼저 해주세요."),
        EXPIRED_TOKEN("토큰이 만료되었어요. 다시 로그인 해주세요."),
        MISSING_TOKEN("인증 토큰이 없습니다");
        override val httpStatus = 401
    }
    enum class NotFound(override val message: String) : ErrorCode {
        RESOURCE_NOT_FOUND("리소스를 찾을 수 없습니다");
        override val httpStatus = 404
    }
    enum class Conflict(override val message: String) : ErrorCode {
        ALREADY_EXISTS("이미 존재하는 리소스입니다");
        override val httpStatus = 409
    }
    enum class Internal(override val message: String) : ErrorCode {
        UNEXPECTED("예상치 못한 오류가 발생했습니다");
        override val httpStatus = 500
    }
}
```

## 규칙

- 도메인 전용 코드는 모듈에 `enum class XxxErrorCode : ErrorCode` 로 추가 → [domain-error-code](../domain-error-code/SKILL.md)
- [business-exception](../business-exception/SKILL.md)이 이 코드를 들고 던짐

## 관련 스킬

[business-exception](../business-exception/SKILL.md) · [global-exception-handler](../global-exception-handler/SKILL.md) · [domain-error-code](../domain-error-code/SKILL.md)

## 차용 원본

`common/core/.../support/exception/ErrorCode.kt`
