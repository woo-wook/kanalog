---
name: query-service-cqrs
description: 조회 전용 서비스(CQRS-lite)와 QueryPort 를 만들 때 사용. "조회 서비스", "QueryService", "읽기 전용", "CQRS", "복잡한 조회" 요청에 사용.
---

# 조회 서비스 (CQRS-lite)

명령(Command)과 분리된 조회 경로. 조인/검색 무거운 쿼리는 별도 QueryPort 로 뺀다.

## 규칙

- `<X>QueryService` 는 `@Service`, 메서드에 `@Transactional(readOnly = true)`
- 도메인 Repository 의 단순 조회 + `QueryPort`(조회 전용 out-port) 조합
- 결과는 Result DTO. Entity→DTO 매핑은 [entity-to-dto-extension](../entity-to-dto-extension/SKILL.md)
- QueryPort 구현은 `infrastructure/.../query/adapter/`

## 템플릿

```kotlin
// application/<x>/port/out
interface <X>QueryPort {
    fun findDetailById(id: String): <X>View?
}

// application/<x>
@Service
class <X>QueryService(
    private val queryPort: <X>QueryPort,
) : <X>QueryUseCase {
    @Transactional(readOnly = true)
    override fun getDetail(id: String): <X>DetailResult =
        (queryPort.findDetailById(id) ?: throw <X>NotFoundException()).toDetail()
}
```

## 관련 스킬

[application-usecase-port](../application-usecase-port/SKILL.md) · [entity-to-dto-extension](../entity-to-dto-extension/SKILL.md) · [out-port-adapter](../out-port-adapter/SKILL.md)

## 차용 원본

`account/.../application/term/{TermQueryService,port/out/TermQueryPort}.kt`
