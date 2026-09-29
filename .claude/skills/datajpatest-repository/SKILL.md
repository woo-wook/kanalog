---
name: datajpatest-repository
description: @DataJpaTest 로 Repository 어댑터의 영속/조회를 H2 통합 테스트할 때 사용. "DataJpaTest", "리포지토리 통합 테스트", "TestEntityManager", "H2 테스트" 요청에 사용.
---

# @DataJpaTest 리포지토리 통합 테스트

실제 JPA 영속 동작을 H2 로 검증. 어댑터 + auditing 설정을 `@Import` 로 끌어온다.

## 템플릿

```kotlin
@DataJpaTest
@Import(<Aggregate>RepositoryAdapter::class, JpaAuditingConfiguration::class)
@ExtendWith(SpringExtension::class)
class <Aggregate>RepositoryAdapterTest(
    private val repository: <Aggregate>Repository,
    private val em: TestEntityManager,
) : BehaviorSpec({
    Given("새 <Aggregate> 를") {
        When("save 로 저장하면") {
            Then("저장되고 감사 필드가 채워진다") {
                val saved = repository.save(<Aggregate>(/* ... */))
                em.flush()
                saved.id.shouldNotBeNull()
                saved.createdAt.shouldNotBeNull()
                repository.findById(saved.id) shouldNotBe null
            }
        }
    }
})
```

## 규칙

- 어댑터·auditing·(필요시 컨버터/설정)을 `@Import`
- `TestEntityManager.flush()` 로 DB 반영 강제
- H2 + `application-test.yml` ([test-config](../test-config/SKILL.md))
- Kotest 스프링 연동: `kotest-extensions-spring` (testing-spring 번들)

## 관련 스킬

[repository-adapter](../repository-adapter/SKILL.md) · [base-jpa-entity](../base-jpa-entity/SKILL.md) · [test-config](../test-config/SKILL.md) · [test-data-builder](../test-data-builder/SKILL.md)

## 차용 원본

`account/.../infrastructure/member/repository/MemberRepositoryAdapterTest.kt`
