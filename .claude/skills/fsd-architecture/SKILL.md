---
name: fsd-architecture
description: 프론트엔드(Next.js) 코드의 Feature-Sliced Design 레이어 구조와 의존 규칙을 잡을 때 사용. "FSD", "레이어 구조", "어디에 둬야", "폴더 구조", "feature-sliced" 요청에 사용.
---

# Feature-Sliced Design (Next App Router 적응형)

Next 라우팅 `app/` 는 얇은 라우팅 레이어, 실제 코드는 `src/` FSD 레이어에 둔다.

## 레이어 (상위 → 하위)

```
app/        # Next 라우팅 전용 (page.tsx 는 src/views 를 렌더만)
src/
  app/      # FSD app: Providers(QueryClient, Theme), 전역 스타일
  views/    # FSD "pages" 레이어 (Next 의 app/ 과 이름 충돌 회피)
  widgets/  # 페이지 독립 복합 블록 (Header, Sidebar)
  features/ # 사용자 상호작용 단위 (auth/login, transaction/create)
  entities/ # 비즈니스 엔티티 (session, user, transaction)
  shared/   # 도메인 무관 재사용 (ui, api, lib, config)
```

## 의존 규칙 (절대)

- import 방향은 **상위 → 하위만**: `app → views → widgets → features → entities → shared`
- 같은 레이어의 다른 슬라이스 직접 import 금지(교차 의존 금지)
- 슬라이스는 **public API(`index.ts`)** 로만 노출 → [public-api-barrel](../public-api-barrel/SKILL.md)
- 강제 도구: **Steiger**(`@feature-sliced/steiger-plugin`) + ESLint `eslint-plugin-boundaries`

## 슬라이스 내부 segment

`ui/`(컴포넌트) · `model/`(상태·로직·타입) · `api/`(요청) · `lib/`(유틸) → [fsd-slice-segment](../fsd-slice-segment/SKILL.md)

## 관련 스킬

[fsd-slice-segment](../fsd-slice-segment/SKILL.md) · [public-api-barrel](../public-api-barrel/SKILL.md) · [nextjs-app-routing](../nextjs-app-routing/SKILL.md) · [eslint-prettier-fsd](../eslint-prettier-fsd/SKILL.md)
