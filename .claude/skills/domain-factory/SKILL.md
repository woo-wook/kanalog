---
name: domain-factory
description: 복잡한 엔티티 생성을 도메인 팩토리(draft→entity)로 캡슐화할 때 사용. "도메인 팩토리", "엔티티 생성 캡슐화", "draft 로 만들기" 요청에 사용.
---

# 도메인 팩토리

여러 VO 조립·검증이 얽힌 엔티티 생성을 한 곳에 모은다. 생성 입력은 draft DTO 로 받는다.

## 규칙

- `domain/<name>/factory/` 에 위치, `domain/<name>/draft/` 에 입력 draft
- 팩토리는 검증 + VO 조립 + 엔티티 반환
- 생성 규칙이 단순하면 엔티티 `companion object` 로 충분 (과설계 주의)

## 템플릿

```kotlin
data class <Aggregate>Draft(val name: String, val identifier: String)

@Component
class <Aggregate>Factory {
    fun create(draft: <Aggregate>Draft): <Aggregate> =
        <Aggregate>(
            name = <Name>.of(draft.name),
            identifier = Email.of(draft.identifier),
        )
}
```

## 관련 스킬

[aggregate-root](../aggregate-root/SKILL.md) · [value-object](../value-object/SKILL.md)

## 차용 원본

`account/.../domain/member/{factory,draft}/`
