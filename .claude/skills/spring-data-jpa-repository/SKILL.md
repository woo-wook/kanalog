---
name: spring-data-jpa-repository
description: Spring Data JpaRepository 인터페이스(기술적 쿼리)를 만들 때 사용. "JpaRepository", "스프링 데이터", "쿼리 메서드" 요청에 사용.
---

# Spring Data JpaRepository

`infrastructure/<slice>/jpa/` 에 두는 기술적 저장소. 도메인은 이걸 직접 모른다
([repository-adapter](../repository-adapter/SKILL.md)를 통해서만 접근).

## 규칙

- `infrastructure/jpa` 패키지에 위치
- 쿼리 메서드 / `@Query` 는 여기에
- 도메인 인터페이스와 분리 (어댑터가 다리 역할)

## 템플릿

```kotlin
interface <Aggregate>JpaRepository : JpaRepository<<Aggregate>, String> {
    fun findByKey(key: <KeyType>): <Aggregate>?
    fun existsByKey(key: <KeyType>): Boolean
}
```

## 관련 스킬

[repository-adapter](../repository-adapter/SKILL.md) · [domain-repository-interface](../domain-repository-interface/SKILL.md)

## 차용 원본

`account/.../infrastructure/term/jpa/TermJpaRepository.kt`
