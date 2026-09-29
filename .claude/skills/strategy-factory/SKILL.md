---
name: strategy-factory
description: 타입별로 분기되는 처리 로직을 전략 패턴 + 팩토리로 만들 때 사용. "전략 패턴", "Strategy", "타입별 분기", "팩토리로 전략 선택" 요청에 사용.
---

# 전략 패턴 + 팩토리

타입(예: 회원 종류, 거래 종류)에 따라 처리 흐름이 달라질 때, if/when 폭증 대신 전략으로 분리.

## 규칙

- `Strategy<C>` 인터페이스 + 타입별 `@Component` 구현
- `StrategyFactory` 가 타입→전략 매핑 (Spring 이 구현체 리스트 주입)
- 서비스는 팩토리에서 전략을 받아 위임만

## 템플릿

```kotlin
interface <X>Strategy<C : <X>Command> {
    fun supports(type: <Type>): Boolean
    fun handle(command: C): <Result>
}

@Component
class <X>StrategyFactory(
    private val strategies: List<<X>Strategy<*>>,
) {
    @Suppress("UNCHECKED_CAST")
    fun <C : <X>Command> getStrategy(type: <Type>): <X>Strategy<C> =
        strategies.firstOrNull { it.supports(type) } as? <X>Strategy<C>
            ?: throw IllegalArgumentException("지원하지 않는 타입: $type")
}
```

## 관련 스킬

[application-usecase-port](../application-usecase-port/SKILL.md) · [command-result-model](../command-result-model/SKILL.md) · [mockk-service-test](../mockk-service-test/SKILL.md)

## 차용 원본

`account/.../application/member/strategy/register/{MemberRegisterStrategy,MemberRegisterStrategyFactory}.kt`
