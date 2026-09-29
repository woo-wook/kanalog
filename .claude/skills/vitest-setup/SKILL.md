---
name: vitest-setup
description: Vitest + Testing Library + jsdom 테스트 환경을 구성할 때 사용. "Vitest 설정", "테스트 환경", "jsdom", "setup 파일" 요청에 사용.
---

# Vitest 셋업

단위/컴포넌트 테스트 러너. Next/React 19 + TS paths 지원.

## 설정

```ts
// vitest.config.ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
  },
});
```

```ts
// vitest.setup.ts
import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";
// MSW 서버 연계 → msw-api-mock 스킬
afterEach(() => cleanup());
```

## 규칙

- 테스트 파일은 대상 옆에 `*.test.tsx`(콜로케이션)
- DOM 매처는 `@testing-library/jest-dom`
- API 의존 테스트는 MSW → [msw-api-mock](../msw-api-mock/SKILL.md)
- E2E 는 Vitest 가 아닌 Playwright → [playwright-e2e](../playwright-e2e/SKILL.md)

## 관련 스킬

[testing-library-component](../testing-library-component/SKILL.md) · [msw-api-mock](../msw-api-mock/SKILL.md) · [frontend-tdd](../frontend-tdd/SKILL.md)
