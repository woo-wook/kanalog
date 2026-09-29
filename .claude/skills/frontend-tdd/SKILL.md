---
name: frontend-tdd
description: 프론트엔드 구현의 기본 규율 — Vitest 로 Red-Green-Refactor + 구조/행위 변경 분리. "프론트 TDD", "테스트 먼저", "Red Green Refactor", "go 워크플로" 요청에 사용. 모든 프론트 구현의 기본.
---

# 프론트엔드 TDD + Tidy First

백엔드 [tdd-tidy-first](../tdd-tidy-first/SKILL.md) 와 동일 규율의 프론트 버전. 프론트 phase 문서의
`- [ ]` 체크리스트가 plan 역할.

## 사이클

1. **Red** — 실패하는 테스트 먼저(컴포넌트=Testing Library, 로직=Vitest, 플로우=Playwright)
2. **Green** — 통과할 최소 구현
3. **Refactor** — 그린 상태에서 중복 제거/명료화
4. 통과 후 phase 체크박스 `- [x]`
- "go" 시 다음 미체크 항목을 위 사이클로

## Tidy First (변경 분리)

- **STRUCTURAL**: 폴더 이동/이름변경/추출/슬라이스 재배치 (동작 불변)
- **BEHAVIORAL**: 기능 추가/수정
- 같은 커밋에 섞지 않음. 둘 다면 구조 먼저

## 매 단계 / 커밋

```bash
cd frontend && pnpm test      # 단위/컴포넌트
pnpm lint                     # ESLint + Steiger(FSD 경계)
```
- 커밋은 [git-commit](../git-commit/SKILL.md) 컨벤션(작성자 흔적 없이), 단위별 작게
- 사용자 관점 테스트(role/label), 구현 디테일 테스트 지양

## 관련 스킬

[tdd-tidy-first](../tdd-tidy-first/SKILL.md) · [vitest-setup](../vitest-setup/SKILL.md) · [testing-library-component](../testing-library-component/SKILL.md) · [git-commit](../git-commit/SKILL.md)
