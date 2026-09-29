---
name: kotest-behaviorspec
description: Kotest BehaviorSpec(Given/When/Then) 단위 테스트를 작성할 때 사용. "Kotest", "BehaviorSpec", "Given When Then", "도메인 단위 테스트" 요청에 사용.
---

# Kotest BehaviorSpec 단위 테스트

도메인/순수 로직 검증용 Given/When/Then 스타일 테스트. 외부 의존 없음.

## 템플릿

```kotlin
class <X>Test : BehaviorSpec({
    Given("<전제>") {
        When("<행위>") {
            val result = <subject>.<action>()
            Then("<기대 1>") { result.shouldNotBeNull() }
            Then("<기대 2>") { result.value shouldBe expected }
        }
    }
})
```

## 규칙

- 의존성: `bundles.testing-jvm` (kotest-runner/assertions), `useJUnitPlatform()`
- 테스트명은 행위를 설명 (한글 서술 OK)
- 매처: `shouldBe`, `shouldNotBeNull`, `shouldThrow<T>`, `shouldHaveSize`, `shouldContainExactlyInAnyOrder`
- TDD 루프에서 가장 먼저 작성하는 실패 테스트 → [tdd-tidy-first](../tdd-tidy-first/SKILL.md)

## 관련 스킬

[mockk-service-test](../mockk-service-test/SKILL.md) · [datajpatest-repository](../datajpatest-repository/SKILL.md) · [tdd-tidy-first](../tdd-tidy-first/SKILL.md)

## 차용 원본

`account/.../domain/member/MemberTest.kt`
