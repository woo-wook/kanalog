---
name: public-api-barrel
description: FSD 슬라이스의 public API(index.ts barrel)와 import 경계를 정의할 때 사용. "public API", "index.ts barrel", "슬라이스 노출", "import 경계" 요청에 사용.
---

# Public API (index.ts barrel)

슬라이스는 `index.ts` 로 외부에 노출할 것만 re-export 한다. 내부 구조 변경이 외부에 새지 않게 한다.

## 템플릿

```ts
// src/features/auth/index.ts
export { LoginForm } from "./ui/LoginForm";
export { useLogin } from "./model/use-login";
export type { LoginInput } from "./model/types";
// 내부 전용(api/lib)은 export 하지 않음
```

```ts
// 사용 측
import { LoginForm, useLogin } from "@/features/auth"; // ✅
import { LoginForm } from "@/features/auth/ui/LoginForm"; // ❌ 내부 경로 금지
```

## 규칙

- 모든 슬라이스 루트에 `index.ts`
- barrel 은 re-export 만(로직 금지) — 순환참조·번들 부풀림 주의
- 내부 경로 직접 import 는 ESLint `boundaries`/Steiger 로 차단 → [eslint-prettier-fsd](../eslint-prettier-fsd/SKILL.md)

## 관련 스킬

[fsd-architecture](../fsd-architecture/SKILL.md) · [fsd-slice-segment](../fsd-slice-segment/SKILL.md)
