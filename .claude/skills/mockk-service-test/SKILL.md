---
name: mockk-service-test
description: MockK 로 협력자를 모킹해 애플리케이션 서비스/유스케이스를 단위 테스트할 때 사용. "MockK", "서비스 테스트", "mockk every verify", "유스케이스 테스트" 요청에 사용.
---

# MockK 서비스 테스트

애플리케이션 서비스의 오케스트레이션을 협력자 모킹으로 검증.

## 템플릿

```kotlin
class <X>ServiceTest : BehaviorSpec({
    val repository = mockk<<Aggregate>Repository>()
    val service = <X>Service(repository)

    Given("<X>Service 로 처리 시") {
        When("<유효 입력>이면") {
            val command = <X>Command(/* ... */)
            every { repository.save(any()) } answers { firstArg() }

            val result = service.handle(command)

            Then("저장이 호출된다") {
                verify(exactly = 1) { repository.save(any()) }
            }
            Then("결과가 반환된다") { result.shouldNotBeNull() }
        }
    }
})
```

## 규칙

- 의존성: `mockk` (testing-jvm 번들에 포함)
- 스텁 `every { } returns/answers { }`, 검증 `verify(exactly = n) { }`
- 상태 초기화 `clearMocks(...)`
- 도메인 규칙 자체는 [kotest-behaviorspec](../kotest-behaviorspec/SKILL.md)로 따로 테스트(서비스 테스트는 흐름만)

## 관련 스킬

[application-usecase-port](../application-usecase-port/SKILL.md) · [strategy-factory](../strategy-factory/SKILL.md) · [kotest-behaviorspec](../kotest-behaviorspec/SKILL.md)

## 차용 원본

`account/.../application/member/MemberRegisterServiceTest.kt`
