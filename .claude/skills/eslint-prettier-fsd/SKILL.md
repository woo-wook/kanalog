---
name: eslint-prettier-fsd
description: ESLint(flat) + Prettier + Steiger 로 코드 품질과 FSD 아키텍처 경계를 강제할 때 사용. "ESLint 설정", "Prettier", "Steiger", "import 경계 강제", "boundaries" 요청에 사용.
---

# ESLint + Prettier + Steiger (FSD 경계 강제)

## Steiger (FSD 전용 린터)

```js
// steiger.config.js
import fsd from "@feature-sliced/steiger-plugin";
export default [...fsd.configs.recommended, { files: ["./src/**"] }];
```
`pnpm steiger src` → 레이어 위반/public API 우회/교차의존 검출.

## ESLint flat (경계 룰)

```js
// eslint.config.mjs (발췌)
import boundaries from "eslint-plugin-boundaries";
export default [
  { plugins: { boundaries },
    settings: { "boundaries/elements": [
      { type: "app", pattern: "src/app/*" },
      { type: "views", pattern: "src/views/*" },
      { type: "widgets", pattern: "src/widgets/*" },
      { type: "features", pattern: "src/features/*" },
      { type: "entities", pattern: "src/entities/*" },
      { type: "shared", pattern: "src/shared/*" },
    ] },
    rules: { "boundaries/element-types": ["error", { default: "disallow", rules: [
      { from: "app", allow: ["views","widgets","features","entities","shared"] },
      { from: "views", allow: ["widgets","features","entities","shared"] },
      { from: "widgets", allow: ["features","entities","shared"] },
      { from: "features", allow: ["entities","shared"] },
      { from: "entities", allow: ["shared"] },
      { from: "shared", allow: ["shared"] },
    ] }] },
  },
];
```

## 규칙

- Prettier 는 포맷 단일 소스. ESLint 는 품질/경계
- CI/`pnpm lint` 에서 Steiger 경계 위반 0 유지

## 관련 스킬

[fsd-architecture](../fsd-architecture/SKILL.md) · [public-api-barrel](../public-api-barrel/SKILL.md)
