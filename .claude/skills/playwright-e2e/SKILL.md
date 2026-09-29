---
name: playwright-e2e
description: Playwright 로 인증/플로우 E2E 테스트를 작성할 때 사용. "Playwright", "E2E", "로그인 플로우 테스트", "브라우저 테스트" 요청에 사용.
---

# Playwright E2E

핵심 사용자 플로우(로그인→보호페이지)를 실제 브라우저로 검증한다.

## 설정/예시

```ts
// playwright.config.ts (발췌)
import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e",
  use: { baseURL: "http://localhost:3000" },
  webServer: { command: "pnpm dev", url: "http://localhost:3000", reuseExistingServer: true },
});
```

```ts
// e2e/auth.spec.ts
import { test, expect } from "@playwright/test";

test("미인증 사용자는 로그인으로 리다이렉트된다", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login/);
});

test("로그인 후 보호 페이지에 접근한다", async ({ page }) => {
  // 백엔드 로그인 미구현 → BFF 응답 모킹
  await page.route("**/api/auth/login", (r) => r.fulfill({ json: { ok: true } }));
  await page.goto("/login");
  await page.getByLabel("이메일").fill("user@dutchlog.com");
  await page.getByLabel("비밀번호").fill("password123");
  await page.getByRole("button", { name: "로그인" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
});
```

## 규칙

- role/label 기반 셀렉터(접근성과 일치)
- 백엔드 미구현 구간은 `page.route` 로 모킹, 준비되면 실제 연동 전환
- CI 에선 `pnpm build && pnpm start` 대상으로 실행 권장

## 관련 스킬

[auth-bff-cookies](../auth-bff-cookies/SKILL.md) · [auth-middleware](../auth-middleware/SKILL.md) · [frontend-tdd](../frontend-tdd/SKILL.md)
