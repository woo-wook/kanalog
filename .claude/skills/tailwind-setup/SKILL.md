---
name: tailwind-setup
description: Tailwind CSS v4 설정과 디자인 토큰(CSS 변수)을 구성할 때 사용. "Tailwind 설정", "디자인 토큰", "테마 색상", "globals.css" 요청에 사용.
---

# Tailwind CSS v4 셋업

v4 는 CSS-first 설정. `@theme` 에 디자인 토큰을 CSS 변수로 선언한다.

## 템플릿

```css
/* src/app/globals.css */
@import "tailwindcss";

@theme {
  --color-background: hsl(0 0% 100%);
  --color-foreground: hsl(222 47% 11%);
  --color-primary: hsl(222 89% 55%);
  --color-destructive: hsl(0 72% 51%);
  --radius: 0.625rem;
}

@layer base {
  .dark {
    --color-background: hsl(222 47% 11%);
    --color-foreground: hsl(0 0% 98%);
  }
}
```

## 규칙

- 색/타이포/spacing/radius 는 토큰(CSS 변수)으로 — 직접 hex 산발 금지
- 다크모드는 `.dark` 클래스 + 토큰 오버라이드 → [theme-dark-mode](../theme-dark-mode/SKILL.md)
- shadcn/ui 토큰 규약과 정렬 → [shadcn-component](../shadcn-component/SKILL.md)

## 관련 스킬

[shadcn-component](../shadcn-component/SKILL.md) · [theme-dark-mode](../theme-dark-mode/SKILL.md) · [ui-component-pattern](../ui-component-pattern/SKILL.md)
