---
name: test-data-builder
description: 테스트 데이터 생성을 헬퍼 함수/빌더로 모아 중복을 줄일 때 사용. "테스트 픽스처", "테스트 빌더", "테스트 데이터 헬퍼", "given 데이터 준비" 요청에 사용.
---

# 테스트 데이터 빌더/헬퍼

반복되는 엔티티/커맨드 생성을 헬퍼로 추출해 테스트 가독성·중복 제거.

## 템플릿

```kotlin
class <Aggregate>RepositoryAdapterTest(
    private val repository: <Aggregate>Repository,
) : BehaviorSpec() {
    init {
        Given("데이터가 있을 때") {
            When("조회하면") {
                Then("반환된다") {
                    val saved = saveSample(title = "샘플")
                    repository.findById(saved.id) shouldNotBe null
                }
            }
        }
    }

    private fun saveSample(title: String = "기본"): <Aggregate> =
        repository.save(<Aggregate>(title = title))
}
```

## 규칙

- 기본값 인자로 변형 포인트만 노출
- 공용이면 `src/test/.../support/` 의 object/팩토리로 승격
- 빌더가 과해지면 단순 팩토리 함수로 (과설계 주의)

## 관련 스킬

[datajpatest-repository](../datajpatest-repository/SKILL.md) · [kotest-behaviorspec](../kotest-behaviorspec/SKILL.md)

## 차용 원본

`account/.../infrastructure/term/repository/TermRepositoryAdapterTest.kt` (saveTerm/termWithVersions 헬퍼)
