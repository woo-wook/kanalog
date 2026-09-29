---
name: fsd-slice-segment
description: FSD 슬라이스 내부 segment(ui/model/api/lib) 구조로 기능을 만들 때 사용. "슬라이스 구조", "feature 만들기", "entity 만들기", "ui model api lib" 요청에 사용.
---

# FSD 슬라이스 / Segment 구조

각 슬라이스(features/entities/...)는 표준 segment 로 내부를 나눈다.

## 구조

```
features/auth/
├── ui/            # LoginForm.tsx 등 컴포넌트
├── model/         # use-login.ts(훅), types.ts, store
├── api/           # login.ts (요청 함수, TanStack mutation)
├── lib/           # 보조 유틸
└── index.ts       # public API (외부 노출 대상만 re-export)
```

## 규칙

- 외부에서는 `@/features/auth` (index.ts) 로만 import. 내부 경로 직접 import 금지
- `model` 에 비즈니스 로직/상태, `ui` 는 표현에 집중
- `api` 는 [api-client](../api-client/SKILL.md) 를 사용, 쿼리키는 [query-keys-factory](../query-keys-factory/SKILL.md)
- entities 는 데이터 모델 + 표시 컴포넌트, features 는 상호작용(쓰기/플로우)

## 예: entities/session

```
entities/session/
├── model/ types.ts          # Session, User 타입
├── model/ use-session.ts    # 현재 세션 조회 훅
├── api/ get-session.ts
└── index.ts
```

## 관련 스킬

[fsd-architecture](../fsd-architecture/SKILL.md) · [public-api-barrel](../public-api-barrel/SKILL.md) · [session-entity](../session-entity/SKILL.md)
