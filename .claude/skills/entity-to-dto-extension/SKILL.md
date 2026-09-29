---
name: entity-to-dto-extension
description: 확장 함수로 엔티티를 Result/View DTO 로 매핑할 때 사용. "엔티티 매핑", "toDetail/toResult", "DTO 변환 확장함수" 요청에 사용.
---

# Entity → DTO 확장 함수

매핑 로직을 확장 함수로 모아 서비스 코드를 깔끔하게 유지.

## 규칙

- `application/<x>/extension/<X>Extensions.kt` 에 위치
- 엔티티 → Result/View DTO 한 방향 매핑
- 민감 값(암호화 VO)은 `.value` 접근 시 복호화됨에 유의 (필요한 필드만 노출)

## 템플릿

```kotlin
fun <Aggregate>.toDetail(): <X>DetailResult =
    <X>DetailResult(
        id = this.id,
        title = this.title,
        createdAt = this.createdAt,
    )

fun List<<Aggregate>>.toDetails(): List<<X>DetailResult> = map { it.toDetail() }
```

## 관련 스킬

[command-result-model](../command-result-model/SKILL.md) · [query-service-cqrs](../query-service-cqrs/SKILL.md)

## 차용 원본

`account/.../application/term/extension/TermExtensions.kt`
