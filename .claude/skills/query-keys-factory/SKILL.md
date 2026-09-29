---
name: query-keys-factory
description: 엔티티별 타입드 TanStack Query 키 팩토리를 만들 때 사용. "쿼리 키", "queryKey 팩토리", "query keys" 요청에 사용.
---

# Query Key 팩토리

쿼리 키를 엔티티별 팩토리로 모아 무효화/일관성을 관리한다.

## 템플릿

```ts
// src/entities/transaction/model/keys.ts
export const transactionKeys = {
  all: ["transactions"] as const,
  lists: () => [...transactionKeys.all, "list"] as const,
  list: (filters?: Record<string, unknown>) => [...transactionKeys.lists(), filters ?? {}] as const,
  details: () => [...transactionKeys.all, "detail"] as const,
  detail: (id: string) => [...transactionKeys.details(), id] as const,
};
```

## 규칙

- `as const` 로 키 타입 고정
- 계층 구조로 부분 무효화(`invalidateQueries({ queryKey: transactionKeys.lists() })`)
- 엔티티 슬라이스 `model/keys.ts` 에 위치

## 관련 스킬

[tanstack-query-setup](../tanstack-query-setup/SKILL.md) · [fsd-slice-segment](../fsd-slice-segment/SKILL.md)
