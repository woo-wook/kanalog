---
name: api-controller-stereotype
description: @ApiController 메타 애너테이션과 반환값 자동 래핑(GlobalResponseHandler)을 만들 때 사용. "ApiController", "응답 자동 래핑", "ResponseBodyAdvice" 요청에 사용.
---

# @ApiController + 자동 래핑

REST 컨트롤러 표식 애너테이션. 이 표식이 붙은 컨트롤러의 반환값을 `Response.Success` 로 자동 래핑.

## 템플릿

```kotlin
// stereotype
@Inherited @MustBeDocumented
@Target(AnnotationTarget.ANNOTATION_CLASS, AnnotationTarget.CLASS)
@Retention(AnnotationRetention.RUNTIME)
@RestController @RequestMapping
annotation class ApiController

// handler
@ConditionalOnWebApplication(type = ConditionalOnWebApplication.Type.SERVLET)
@RestControllerAdvice(annotations = [ApiController::class])
class GlobalResponseHandler : ResponseBodyAdvice<Any> {
    override fun supports(returnType: MethodParameter, converterType: Class<out HttpMessageConverter<*>>) =
        AbstractJacksonHttpMessageConverter::class.java.isAssignableFrom(converterType)

    override fun beforeBodyWrite(body: Any?, /* ... */): Any? =
        if (body is Response<*>) body else ResponseFactory.success(body ?: Unit)
}
```

## 규칙

- 컨트롤러는 `@ApiController` 메타 애너테이션을 클래스에 붙임
- 이미 `Response` 면 중복 래핑 안 함
- Spring Boot 4 / Jackson 3 의 `AbstractJacksonHttpMessageConverter` 기준

## 관련 스킬

[api-response-wrapper](../api-response-wrapper/SKILL.md) · [global-exception-handler](../global-exception-handler/SKILL.md) · [mockmvc-controller-test](../mockmvc-controller-test/SKILL.md)

## 차용 원본

`common/core/.../presentation/stereotype/ApiController.kt`, `handler/GlobalResponseHandler.kt`
