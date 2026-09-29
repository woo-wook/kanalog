---
name: mockmvc-controller-test
description: MockMvc standalone 으로 컨트롤러의 요청/응답/리다이렉트를 테스트할 때 사용. "MockMvc", "컨트롤러 테스트", "standaloneSetup", "엔드포인트 테스트" 요청에 사용.
---

# MockMvc 컨트롤러 테스트

전체 컨텍스트 없이 컨트롤러만 띄워 HTTP 동작 검증. 유스케이스는 모킹.

## 템플릿

```kotlin
class <X>ControllerTest : BehaviorSpec({
    val useCase = mockk<<X>UseCase>()
    val controller = <X>Controller(useCase)
    val mockMvc = MockMvcBuilders.standaloneSetup(controller).build()

    Given("POST /api/<x>") {
        When("유효 요청이면") {
            every { useCase.handle(any()) } returns <X>Result(/* ... */)

            val result = mockMvc.perform(
                post("/api/<x>")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("""{"name":"값"}"""),
            )

            Then("200 과 표준 응답") {
                result.andExpect(status().isOk)
                    .andExpect(jsonPath("$.code").value("SUCCESS"))
            }
            Then("유스케이스가 호출된다") { verify(exactly = 1) { useCase.handle(any()) } }
        }
    }
})
```

## 규칙

- 표준 응답 래핑/에러는 필요 시 advice 를 `setControllerAdvice(GlobalExceptionHandler())` 로 등록
- 폼/리다이렉트는 `.param(...)`, `redirectedUrl(...)`, `is3xxRedirection`
- 통합이 필요하면 `@SpringBootTest` + `@AutoConfigureMockMvc`

## 관련 스킬

[api-controller-stereotype](../api-controller-stereotype/SKILL.md) · [global-exception-handler](../global-exception-handler/SKILL.md) · [mockk-service-test](../mockk-service-test/SKILL.md)

## 차용 원본

`account/.../presentation/web/lifecycle/LifecycleControllerTest.kt`
