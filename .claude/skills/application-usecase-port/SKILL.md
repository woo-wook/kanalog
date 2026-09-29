---
name: application-usecase-port
description: 유스케이스(port-in 인터페이스 + Service 구현)와 트랜잭션 경계를 만들 때 사용. "유스케이스", "UseCase", "애플리케이션 서비스", "트랜잭션 경계" 요청에 사용.
---

# UseCase 포트 + 서비스

application 레이어의 진입 계약(port-in)과 그 구현. 오케스트레이션·트랜잭션·검증 담당.

## 규칙

- `application/<x>/port/in/<X>UseCase.kt` 인터페이스로 진입점 정의
- 구현 `<X>Service` 는 `@Service`, 메서드에 `@Transactional`
- 입출력은 [command-result-model](../command-result-model/SKILL.md) DTO (엔티티 직접 노출 금지)
- 외부 의존(메시징/메일)은 [out-port-adapter](../out-port-adapter/SKILL.md) port-out 으로
- 분기 로직이 타입별로 갈리면 [strategy-factory](../strategy-factory/SKILL.md)

## 템플릿

```kotlin
// port/in
interface <X>UseCase {
    fun handle(command: <X>Command): <X>Result
}

// service
@Service
class <X>Service(
    private val repository: <Aggregate>Repository,
) : <X>UseCase {
    @Transactional
    override fun handle(command: <X>Command): <X>Result {
        val entity = ... // 도메인 규칙은 엔티티/도메인 서비스에 위임
        val saved = repository.save(entity)
        return saved.toResult()
    }
}
```

## 관련 스킬

[command-result-model](../command-result-model/SKILL.md) · [query-service-cqrs](../query-service-cqrs/SKILL.md) · [out-port-adapter](../out-port-adapter/SKILL.md) · [mockk-service-test](../mockk-service-test/SKILL.md)

## 차용 원본

`account/.../application/member/{MemberRegisterUseCase,MemberRegisterService}.kt`
