---
name: testing-library-component
description: Testing Library 로 컴포넌트를 사용자 관점(role/label)으로 테스트할 때 사용. "컴포넌트 테스트", "Testing Library", "render screen", "role 쿼리" 요청에 사용.
---

# Testing Library 컴포넌트 테스트

구현 디테일이 아니라 **사용자가 보는 것**(role/label/text)으로 검증한다.

## 템플릿

```tsx
// src/shared/ui/button.test.tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { Button } from "./button";

describe("Button", () => {
  it("라벨을 렌더한다", () => {
    render(<Button>저장</Button>);
    expect(screen.getByRole("button", { name: "저장" })).toBeInTheDocument();
  });

  it("클릭 시 핸들러를 호출한다", async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>저장</Button>);
    await userEvent.click(screen.getByRole("button", { name: "저장" }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("disabled 면 클릭되지 않는다", async () => {
    const onClick = vi.fn();
    render(<Button disabled onClick={onClick}>저장</Button>);
    await userEvent.click(screen.getByRole("button", { name: "저장" }));
    expect(onClick).not.toHaveBeenCalled();
  });
});
```

## 규칙

- 쿼리 우선순위: `getByRole` > `getByLabelText` > `getByText`. `getByTestId` 는 최후
- 폼 에러는 `role="alert"` 로 검증 → [form-rhf-zod](../form-rhf-zod/SKILL.md)
- 상호작용은 `userEvent`(키보드/포커스 포함)

## 관련 스킬

[vitest-setup](../vitest-setup/SKILL.md) · [ui-component-pattern](../ui-component-pattern/SKILL.md) · [msw-api-mock](../msw-api-mock/SKILL.md)
