---
name: nextjs-project-setup
description: Next.js 15 + TypeScript + pnpm 프로젝트를 스캐폴드하고 스크립트/의존성을 셋업할 때 사용. "Next 프로젝트 생성", "스캐폴드", "create-next-app", "package.json 스크립트" 요청에 사용.
---

# Next.js 15 프로젝트 셋업 (pnpm)

## 스캐폴드

```bash
pnpm create next-app@latest frontend \
  --ts --app --src-dir --eslint --tailwind --import-alias "@/*" --use-pnpm
```

> 단, FSD 적응을 위해 Next 라우팅은 루트 `app/`, FSD 코드는 `src/` 로 둔다(스캐폴드 후 `app/` 을
> 루트로 이동하거나 `src/app` 라우팅 + FSD 레이어 별도 폴더로 조정). [fsd-architecture](../fsd-architecture/SKILL.md) 참고.

## 핵심 의존성

```bash
pnpm add @tanstack/react-query zustand react-hook-form zod @hookform/resolvers \
  @t3-oss/env-nextjs lucide-react class-variance-authority clsx tailwind-merge
pnpm add -D vitest @testing-library/react @testing-library/jest-dom jsdom \
  msw @playwright/test prettier steiger @feature-sliced/steiger-plugin \
  eslint-plugin-boundaries @vitejs/plugin-react vite-tsconfig-paths
```

## package.json scripts

```json
{
  "scripts": {
    "dev": "next dev", "build": "next build", "start": "next start",
    "lint": "next lint && steiger src", "format": "prettier --write .",
    "test": "vitest run", "test:watch": "vitest", "test:e2e": "playwright test"
  }
}
```

## 관련 스킬

[typescript-strict](../typescript-strict/SKILL.md) · [tailwind-setup](../tailwind-setup/SKILL.md) · [eslint-prettier-fsd](../eslint-prettier-fsd/SKILL.md) · [vitest-setup](../vitest-setup/SKILL.md)
