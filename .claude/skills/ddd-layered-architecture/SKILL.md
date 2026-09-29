---
name: ddd-layered-architecture
description: 새 도메인/모듈의 패키지 레이어 구조와 의존 규칙을 잡을 때 사용. "레이어 구조", "패키지 구조", "DDD 구조", "domain/application/infrastructure", "헥사고날", "어디에 둬야" 같은 요청에 사용.
---

# Pragmatic DDD 레이어드 구조

JPA 엔티티를 도메인에 유지하되, 도메인 규칙이 DB/기술에 오염되지 않도록 경계를 세우는 구조.

## 레이어와 책임

```
com.dutchlog.backend.<slice>/
├── domain/           # 비즈니스 규칙, 불변식, 모델(엔티티/VO), 도메인 서비스/정책
│   ├── <Aggregate>.kt
│   ├── vo/
│   ├── repository/   # Repository 인터페이스 (애그리거트 중심)
│   └── exception/
├── application/      # 유스케이스 오케스트레이션, 트랜잭션 경계, 검증, 이벤트 발행
│   ├── port/in/      # UseCase 인터페이스
│   ├── port/out/     # 외부 의존 추상화 (메시징 등)
│   ├── model/        # Command / Result DTO
│   └── <X>Service.kt
├── infrastructure/   # JPA 구현, 외부 연동, 메시지 브로커
│   ├── jpa/          # Spring Data JpaRepository
│   └── repository/adapter/  # 도메인 Repository 구현 (*RepositoryAdapter)
└── presentation/     # 진입점: Controller, Consumer, Scheduler
    ├── api/          # REST (@ApiController)
    └── web/          # 서버 렌더링 (선택)
```

## 의존 규칙 (절대 위반 금지)

- 방향: `presentation → application → domain`
- ❌ `domain` → infrastructure / presentation / 프레임워크 클래스
- ❌ `domain/repository` 인터페이스에 검색/쿼리 메서드 남발 → 조회는 [query-service-cqrs](../query-service-cqrs/SKILL.md)
- Repository: 인터페이스는 `domain`, 구현은 `infrastructure/.../adapter` ([repository-adapter](../repository-adapter/SKILL.md))
- `@Transactional` 경계는 `application` 서비스에 둔다

## 관련 스킬

[aggregate-root](../aggregate-root/SKILL.md) · [application-usecase-port](../application-usecase-port/SKILL.md) · [domain-repository-interface](../domain-repository-interface/SKILL.md)

## 차용 원본

레퍼런스 `DDD.md`, `account/` 모듈 패키지 구조.
