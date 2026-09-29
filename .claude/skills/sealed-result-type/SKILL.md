---
name: sealed-result-type
description: 성공/실패 분기를 타입으로 강제하는 제네릭 sealed Result 패턴(메타 패턴)을 만들 때 사용. "Result 타입", "sealed 성공/실패", "예외 대신 결과 타입" 요청에 사용.
---

# Sealed Result 패턴 (메타)

예외 대신 결과를 타입으로 표현해 호출자가 모든 분기를 처리하도록 강제하는 패턴.
`Response<T>`, `TokenValidationResult<T>` 가 이 패턴의 구체 사례.

## 템플릿

```kotlin
sealed class Result<out T> {
    data class Success<T>(val value: T) : Result<T>()
    sealed class Failure : Result<Nothing>() {
        data object NotFound : Failure()
        data class Error(val reason: String) : Failure()
    }
    fun isSuccess() = this is Success
    fun getOrNull(): T? = (this as? Success)?.value
    fun getOrThrow(): T = when (this) {
        is Success -> value
        is Failure.NotFound -> throw NoSuchElementException()
        is Failure.Error -> throw IllegalStateException(reason)
    }
}
```

## 언제 쓰나

- 실패가 "예외적"이지 않고 정상 흐름의 일부일 때 (검증/파싱 결과)
- 호출자가 실패 종류별로 다르게 반응해야 할 때
- 단순 전파면 그냥 예외(`BusinessException`)가 낫다 — 과설계 주의

## 관련 스킬

[api-response-wrapper](../api-response-wrapper/SKILL.md) · [jwt-token-validator](../jwt-token-validator/SKILL.md)

## 차용 원본

`common/core/.../presentation/dto/Response.kt`, `domain/token/TokenValidationResult.kt`
