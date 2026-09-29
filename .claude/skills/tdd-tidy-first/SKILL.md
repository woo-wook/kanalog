---
name: tdd-tidy-first
description: Kent Beck TDD(Red-Green-Refactor)와 Tidy First(구조/행위 변경 분리) 규율로 작업할 때 사용. "TDD", "테스트 먼저", "Red Green Refactor", "Tidy First", "구조 변경 분리", "go 워크플로" 요청에 사용. 모든 구현의 기본 규율.
---

# TDD + Tidy First 규율 (CODERULE)

이 프로젝트의 모든 구현은 이 규율을 따른다. (루트 `CODERULE.md` 기준)

## TDD 사이클

1. **Red** — 가장 작은 실패 테스트 하나를 먼저 작성. 테스트명은 행위 서술
2. **Green** — 통과시킬 **최소** 코드만 작성 (그 이상 금지)
3. **Refactor** — 통과 상태에서만 중복 제거/명료화. 한 번에 한 리팩터링, 매번 테스트 실행
4. 통과 후 plan/phase 파일의 체크박스를 `- [x]` 로
- "go" 입력 시: 현재 phase 파일의 **다음 미체크 테스트**를 위 사이클로 구현

## Tidy First (변경 분리)

- **STRUCTURAL**: 동작 불변의 재배치(이름변경, 추출, 이동, 카탈로그화)
- **BEHAVIORAL**: 기능 추가/수정
- 둘을 **같은 커밋에 섞지 않는다.** 둘 다 필요하면 **구조 변경 먼저**
- 구조 변경 전후로 테스트를 돌려 동작 불변 확인

## 커밋 규율

- 커밋 조건: 전체 테스트 통과 + 경고 해소 + 단일 논리 단위
- 메시지에 STRUCTURAL/BEHAVIORAL 명시
- 작고 잦은 커밋

## 코드 품질

- 중복 가차없이 제거 · 의도를 이름/구조로 표현 · 의존성 명시
- 메서드는 작고 단일 책임 · 상태/부수효과 최소 · 가장 단순한 해법

## 매번

```bash
cd backend && ./gradlew test
```

## 관련 스킬

모든 구현 스킬의 상위 규율. 테스트 작성은 [kotest-behaviorspec](../kotest-behaviorspec/SKILL.md) /
[mockk-service-test](../mockk-service-test/SKILL.md) / [datajpatest-repository](../datajpatest-repository/SKILL.md) 참고.

## 차용 원본

루트 `CODERULE.md`
