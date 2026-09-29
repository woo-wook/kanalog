---
name: repository-adapter
description: 도메인 Repository 인터페이스를 Spring Data 로 구현하는 인프라 어댑터를 만들 때 사용. "리포지토리 구현", "RepositoryAdapter", "어댑터로 위임" 요청에 사용.
---

# Repository 어댑터

`infrastructure/<slice>/repository/adapter/` 에서 도메인 Repository 인터페이스를 구현.
Spring Data `JpaRepository` 에 위임한다.

## 규칙

- 네이밍: `*RepositoryAdapter` (`*RepositoryImpl` 아님 — 헥사고날 Adapter 신호)
- `@Repository` 부착
- 로직 없이 위임만. 매핑/조립이 필요하면 명시적으로
- `findById` 는 `Optional` → nullable 변환 (`.orElse(null)`)

## 템플릿

```kotlin
@Repository
class <Aggregate>RepositoryAdapter(
    private val jpa: <Aggregate>JpaRepository,
) : <Aggregate>Repository {
    override fun save(entity: <Aggregate>) = jpa.save(entity)
    override fun findById(id: String) = jpa.findById(id).orElse(null)
    override fun existsByKey(key: <KeyType>) = jpa.existsByKey(key)
}
```

## 관련 스킬

[domain-repository-interface](../domain-repository-interface/SKILL.md) · [spring-data-jpa-repository](../spring-data-jpa-repository/SKILL.md) · [datajpatest-repository](../datajpatest-repository/SKILL.md)

## 차용 원본

`account/.../infrastructure/member/repository/MemberRepositoryAdapter.kt`
