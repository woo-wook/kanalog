---
name: ui-component-pattern
description: shared/ui 재사용 컴포넌트의 작성 규약(props, 접근성, 합성)을 따를 때 사용. "컴포넌트 패턴", "재사용 컴포넌트", "접근성", "props 규약" 요청에 사용.
---

# UI 컴포넌트 규약 (shared/ui)

도메인 무관 재사용 컴포넌트의 일관된 작성 규칙.

## 규칙

- **도메인 무관만** `shared/ui` 에. 도메인 결합 UI 는 `entities`/`features`/`widgets`
- 네이티브 props 확장(`React.ComponentProps<"button">`), `className` override 허용(`cn`)
- 접근성: 의미 있는 `role`/라벨, 키보드 동작, `aria-*`. 테스트는 role 기반 쿼리
- 합성(composition) 우선(children/slot), 과한 prop 분기 지양
- 서버 컴포넌트 기본, 상태/이벤트 있으면 `"use client"`
- variant 는 CVA → [shadcn-component](../shadcn-component/SKILL.md)

## 예: 합성형 Card

```tsx
export function Card({ className, ...p }: React.ComponentProps<"div">) {
  return <div className={cn("rounded-lg border bg-background p-6 shadow-sm", className)} {...p} />;
}
export function CardHeader({ className, ...p }: React.ComponentProps<"div">) {
  return <div className={cn("mb-4 space-y-1", className)} {...p} />;
}
```

## 관련 스킬

[shadcn-component](../shadcn-component/SKILL.md) · [form-rhf-zod](../form-rhf-zod/SKILL.md) · [testing-library-component](../testing-library-component/SKILL.md)
