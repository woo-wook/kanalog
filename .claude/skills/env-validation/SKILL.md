---
name: env-validation
description: 환경변수를 Zod(@t3-oss/env-nextjs)로 런타임 검증할 때 사용. "환경변수", "env 검증", "t3-env", "process.env 타입" 요청에 사용.
---

# 환경변수 검증 (@t3-oss/env-nextjs)

서버/클라이언트 env 를 분리해 타입 안전하게 검증한다. 누락 시 빌드 단계에서 실패.

## 템플릿

```ts
// src/shared/config/env.ts
import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    BACKEND_API_URL: z.string().url(),
  },
  client: {
    NEXT_PUBLIC_APP_URL: z.string().url(),
  },
  runtimeEnv: {
    BACKEND_API_URL: process.env.BACKEND_API_URL,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  },
});
```

```bash
# .env.example
BACKEND_API_URL=http://localhost:8080
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## 규칙

- 서버 전용 시크릿(`BACKEND_API_URL` 등)은 `server` 에 → 클라이언트 번들 유출 방지
- 클라이언트 노출은 `NEXT_PUBLIC_*` + `client`
- `process.env` 직접 접근 금지, 항상 `env` 사용

## 관련 스킬

[app-config](../app-config/SKILL.md) · [bff-route-handler](../bff-route-handler/SKILL.md) · [typescript-strict](../typescript-strict/SKILL.md)
