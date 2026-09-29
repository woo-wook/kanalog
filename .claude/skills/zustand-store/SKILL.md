---
name: zustand-store
description: Zustand 로 가벼운 클라이언트(전역 UI) 상태 스토어를 만들 때 사용. "Zustand", "전역 상태", "store", "클라이언트 상태" 요청에 사용.
---

# Zustand 스토어 (클라이언트 상태)

서버 상태는 TanStack Query, **클라이언트/UI 상태만** Zustand. (사이드바 토글, 모달 등)

## 템플릿

```ts
// src/shared/model/ui-store.ts (또는 해당 슬라이스 model/)
import { create } from "zustand";

interface UiState {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  sidebarOpen: false,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
}));
```

## 규칙

- 서버에서 오는 데이터는 스토어에 복제하지 말 것(Query 가 소스) — 동기화 버그 방지
- 셀렉터로 구독 최소화: `useUiStore((s) => s.sidebarOpen)`
- 슬라이스 경계 안 `model/` 에 두고 public API 로 노출
- 영속화 필요 시 `persist` 미들웨어(이번 범위 외)

## 관련 스킬

[fsd-slice-segment](../fsd-slice-segment/SKILL.md) · [tanstack-query-setup](../tanstack-query-setup/SKILL.md)
