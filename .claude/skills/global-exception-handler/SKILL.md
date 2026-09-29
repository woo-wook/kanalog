---
name: global-exception-handler
description: 예외를 표준 에러 응답(Response.Error)으로 변환하는 전역 핸들러를 만들 때 사용. "전역 예외 처리", "GlobalExceptionHandler", "RestControllerAdvice", "에러 응답 변환" 요청에 사용.
---

# 전역 예외 핸들러

`@RestControllerAdvice` 로 예외를 받아 ErrorCode 기반 표준 에러 응답을 반환.

## 템플릿

```kotlin
object ErrorResponseFactory {
    fun fromErrorCode(errorCode: ErrorCode, message: String? = null): Response.Error =
        Response.Error(errorCode.responseCode, message ?: errorCode.message)
}

@RestControllerAdvice
class GlobalExceptionHandler {
    private val log = KotlinLogging.logger {}

    @ExceptionHandler(BusinessException::class)
    fun handleBusiness(ex: BusinessException): ResponseEntity<Response.Error> =
        ResponseEntity.status(ex.errorCode.httpStatus)
            .body(ErrorResponseFactory.fromErrorCode(ex.errorCode, ex.message))

    @ExceptionHandler(MethodArgumentNotValidException::class)
    fun handleValidation(ex: MethodArgumentNotValidException): ResponseEntity<Response.Error> =
        ResponseEntity.badRequest()
            .body(ErrorResponseFactory.fromErrorCode(ErrorCode.BadRequest.INVALID_INPUT,
                ex.bindingResult.fieldErrors.joinToString { "${it.field}: ${it.defaultMessage}" }))

    @ExceptionHandler(IllegalArgumentException::class)
    fun handleIllegalArg(ex: IllegalArgumentException): ResponseEntity<Response.Error> =
        ResponseEntity.badRequest()
            .body(ErrorResponseFactory.fromErrorCode(ErrorCode.BadRequest.INVALID_INPUT, ex.message))

    @ExceptionHandler(Exception::class)
    fun handleUnexpected(ex: Exception): ResponseEntity<Response.Error> {
        log.error(ex) { "Unexpected error" }
        return ResponseEntity.internalServerError()
            .body(ErrorResponseFactory.fromErrorCode(ErrorCode.Internal.UNEXPECTED))
    }
}
```

## 규칙

- 구체 예외 → 일반 예외 순으로 핸들러 정의
- 미처리 예외만 500 + ERROR 로그, 비즈니스 예외는 의도된 상태코드
- 검증 메시지는 필드명 포함

## 관련 스킬

[business-exception](../business-exception/SKILL.md) · [error-code-catalog](../error-code-catalog/SKILL.md) · [api-response-wrapper](../api-response-wrapper/SKILL.md)

## 차용 원본

`common/core/.../presentation/handler/GlobalExceptionHandler.kt`, `support/exception/ErrorResponseFactory.kt`
