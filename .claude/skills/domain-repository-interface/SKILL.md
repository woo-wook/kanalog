---
name: domain-repository-interface
description: 도메인 레이어의 Repository 인터페이스(애그리거트 영속 계약)를 정의할 때 사용. "리포지토리 인터페이스", "도메인 저장소", "Repository 추상화" 요청에 사용.
---

# 도메인 Repository 인터페이스

`domain/<slice>/repository/` 에 두는 순수 영속 계약. 프레임워크 의존 없음.

## 규칙

- 애그리거트 루트의 **생명주기**(save/findById/exists)에 집중
- 복잡한 검색/조인 쿼리는 넣지 않는다 → 조회 전용은 [query-service-cqrs](../query-service-cqrs/SKILL.md)의 QueryPort
- 반환은 도메인 모델(엔티티). nullable 은 Kotlin `?` 로 명시
- 구현은 `infrastructure` 의 [repository-adapter](../repository-adapter/SKILL.md)

## 템플릿

```kotlin
package com.dutchlog.backend.<slice>.domain.<name>.repository

interface <Aggregate>Repository {
    fun save(entity: <Aggregate>): <Aggregate>
    fun findById(id: String): <Aggregate>?
    fun existsByKey(key: <KeyType>): Boolean
}
```

## 관련 스킬

[repository-adapter](../repository-adapter/SKILL.md) · [spring-data-jpa-repository](../spring-data-jpa-repository/SKILL.md) · [ddd-layered-architecture](../ddd-layered-architecture/SKILL.md)

## 차용 원본

`account/.../domain/member/repository/MemberRepository.kt`, `.../term/repository/TermRepository.kt`
