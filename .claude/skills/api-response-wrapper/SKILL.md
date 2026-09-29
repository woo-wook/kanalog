---
name: api-response-wrapper
description: 모든 API 응답을 감싸는 타입 안전한 Response<T> sealed 래퍼와 ResponseFactory 를 만들 때 사용. "응답 래퍼", "Response<T>", "공통 응답 포맷", "성공/실패 래핑" 요청에 사용.
---

# Response<T> 응답 래퍼

성공/에러를 컴파일 타임에 강제하는 sealed 응답 타입. 일관된 `{ code, message, data }` 포맷.

## 템플릿

```kotlin
sealed class Response<out T> {
    data class Success<T>(val code: String, val message: String, val data: T) : Response<T>()
    data class Error(val code: String, val message: String) : Response<Nothing>()

    @get:JsonIgnore val isSuccessful: Boolean get() = this is Success
    @JsonIgnore fun getDataOrNull(): T? = (this as? Success)?.data
}

object ResponseFactory {
    private const val SUCCESS_CODE = "SUCCESS"
    private const val SUCCESS_MESSAGE = "요청이 성공적으로 처리되었습니다"
    fun <T> success(data: T): Response.Success<T> =
        Response.Success(SUCCESS_CODE, SUCCESS_MESSAGE, data)
}
```

## 규칙

- 컨트롤러가 직접 `Response` 를 반환하거나, [api-controller-stereotype](../api-controller-stereotype/SKILL.md)으로 자동 래핑
- 에러 응답은 [global-exception-handler](../global-exception-handler/SKILL.md) + [error-code-catalog](../error-code-catalog/SKILL.md)가 생성
- 이 패턴의 일반화는 [sealed-result-type](../sealed-result-type/SKILL.md)

## 관련 스킬

[api-controller-stereotype](../api-controller-stereotype/SKILL.md) · [global-exception-handler](../global-exception-handler/SKILL.md) · [sealed-result-type](../sealed-result-type/SKILL.md)

## 차용 원본

`common/core/.../presentation/dto/{Response,ResponseFactory}.kt`
