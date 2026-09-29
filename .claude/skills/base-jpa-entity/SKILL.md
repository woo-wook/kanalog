---
name: base-jpa-entity
description: 모든 엔티티가 상속하는 감사(createdAt/updatedAt) 베이스 클래스와 JPA Auditing 설정을 만들 때 사용. "베이스 엔티티", "감사 필드", "createdAt updatedAt 자동", "JPA Auditing" 요청에 사용.
---

# BaseJpaEntity + Auditing

생성/수정 시각을 자동 기록하는 매핑 슈퍼클래스. 모든 엔티티가 상속.

## 템플릿

```kotlin
@MappedSuperclass
@EntityListeners(AuditingEntityListener::class)
abstract class BaseJpaEntity {
    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    lateinit var createdAt: LocalDateTime

    @LastModifiedDate
    @Column(name = "updated_at", nullable = false)
    lateinit var updatedAt: LocalDateTime
}

@Configuration
@ConditionalOnClass(EnableJpaAuditing::class)
@EnableJpaAuditing
class JpaAuditingConfiguration
```

## 규칙

- 엔티티는 `class X(...) : BaseJpaEntity()` 로 상속
- 테스트에서 auditing 동작하려면 `@DataJpaTest` + `@Import(JpaAuditingConfiguration::class)`
- `lateinit` 이므로 영속 전 접근 금지

## 관련 스킬

[aggregate-root](../aggregate-root/SKILL.md) · [datajpatest-repository](../datajpatest-repository/SKILL.md) · [uuid-generator](../uuid-generator/SKILL.md)

## 차용 원본

`common/jpa/.../infrastructure/jpa/BaseJpaEntity.kt`, `configuration/JpaAuditingConfiguration.kt`
