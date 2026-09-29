---
name: typescript-strict
description: TypeScript strict 설정과 경로 별칭(@/*)을 구성할 때 사용. "tsconfig", "strict 모드", "path alias", "@/ 별칭" 요청에 사용.
---

# TypeScript strict 설정

## tsconfig.json 핵심

```jsonc
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "verbatimModuleSyntax": true,
    "moduleResolution": "bundler",
    "paths": { "@/*": ["./src/*"] },
    "plugins": [{ "name": "next" }]
  }
}
```

## 규칙

- `any` 금지 — 모르면 `unknown` 후 좁히기
- 외부 입력(API 응답/폼/env)은 **Zod 로 파싱**해 타입 확보 → [response-zod-schema](../response-zod-schema/SKILL.md), [env-validation](../env-validation/SKILL.md)
- `import type` 로 타입 전용 임포트 구분(verbatimModuleSyntax)
- `@/*` 는 `src/*`(FSD 루트), Next 라우팅 `app/` 은 별도

## 관련 스킬

[nextjs-project-setup](../nextjs-project-setup/SKILL.md) · [response-zod-schema](../response-zod-schema/SKILL.md) · [env-validation](../env-validation/SKILL.md)
