---
name: uuid-generator
description: 시간 기반(정렬 가능) UUID 문자열을 생성하는 ID 생성기를 만들 때 사용. "UUID 생성", "ID 생성기", "시간기반 UUID", "정렬 가능한 식별자" 요청에 사용.
---

# UUIDGenerator (시간기반)

DB 친화적인 시간정렬 UUID(v7 계열) 생성기. 엔티티 ID 기본값으로 사용.

## 템플릿

```kotlin
object UUIDGenerator {
    fun generate(): String =
        Generators.timeBasedEpochGenerator().generate().toString()
}
```

## 사용

```kotlin
@Id @Column(name = "x_id", length = 36)
val id: String = UUIDGenerator.generate()
```

## 규칙

- 의존성: `com.fasterxml.uuid:java-uuid-generator` (버전 카탈로그 `java-uuid-generator`)
- 시간기반이라 인덱스 단편화가 적고 정렬 가능
- JWT `jti` 등에도 재사용

## 관련 스킬

[base-jpa-entity](../base-jpa-entity/SKILL.md) · [aggregate-root](../aggregate-root/SKILL.md) · [jwt-token-generator](../jwt-token-generator/SKILL.md)

## 차용 원본

`common/core/.../domain/service/UUIDGenerator.kt`
