---
name: git-commit
description: git 커밋을 만들 때 사용. Udacity 스타일 커밋 메시지 컨벤션(type: Subject)을 따른다. "커밋", "커밋해줘", "commit", "커밋 메시지" 요청에 사용. 커밋 메시지에 Claude/AI 흔적을 절대 남기지 않는다.
---

# Git 커밋 (Udacity 컨벤션)

참조: https://da-nyee.github.io/posts/git-git-commit-message-convention/

## 🚫 최우선 규칙 — 작성자 흔적 금지

커밋 메시지에는 **오직 커밋 내용만** 남긴다. 다음을 **절대 포함하지 않는다**:

- ❌ `Co-Authored-By: Claude ...`
- ❌ `🤖 Generated with [Claude Code]` 등 생성 도구 표기
- ❌ "Claude가 작성", "AI가 ~" 같은 작성 주체 언급
- ❌ 그 외 어떤 자동 서명/푸터도 추가하지 않음

> 이 규칙은 다른 어떤 기본 지침(Co-Authored-By 추가 등)보다 **우선**한다.
> `git commit` 시 trailer/서명을 자동으로 붙이지 말 것.

## 메시지 구조

```
type: Subject

Body (무엇을·왜)

Footer
```

1. **Title** (필수): `type: Subject`
2. **Body** (선택): 상세 설명, Title 과 한 줄 공백으로 분리
3. **Footer** (선택): 이슈 참조

## Type (7가지)

| type | 의미 |
|---|---|
| `feat` | 새로운 기능 추가 |
| `fix` | 버그 수정 |
| `docs` | 문서 수정 |
| `style` | 코드 포맷 변경(세미콜론 등), 동작 변경 없음 |
| `refactor` | 프로덕션 코드 리팩터링 |
| `test` | 테스트 추가/리팩터링 |
| `chore` | 빌드 태스크·패키지 매니저 설정 등 잡무 |

## Title 규칙

- 50자 이하
- `type:` 뒤 한 칸 띄우고 Subject
- Subject 는 **동사원형(명령문)** 으로 시작: Add, Update, Fix, Remove, Modify ...
- 첫 글자 **대문자**
- 끝에 **마침표 없음**

## Body 규칙

- 한 줄 72자 이하
- Title 과 사이에 **빈 줄 1줄** 필수
- **What(무엇을)** 과 **Why(왜)** 에 집중 — How 는 적지 않음
- 간단한 변경이면 생략 가능

## Footer 규칙

- 이슈 트래커 ID 참조
- 키워드: `Resolves: #123`, `Fixes: #123`, `Ref: #123`, `Related to: #45, #46`

## 예시

```
feat: Add JWT authentication filter

Validate the access token on protected routes and inject the
authenticated user into the security context so downstream
handlers can authorize requests.

Resolves: #42
```

```
fix: Prevent duplicate term version numbers
```

## 이 프로젝트에서의 절차

1. `git status` / `git diff` 로 변경 확인 (스테이징 안 된 변경 포함)
2. 변경이 **단일 논리 단위**인지 확인 ([tdd-tidy-first](../tdd-tidy-first/SKILL.md): 구조/행위 변경을 한 커밋에 섞지 않음)
   - 구조 변경(STRUCTURAL)/행위 변경(BEHAVIORAL)이 섞였으면 나눠서 커밋
3. 적절한 `type` 선택 후 메시지 작성
4. 커밋 생성 — 서명/푸터 자동 추가 금지

### 권장 커밋 방식 (작성자 흔적 없이 안전하게)

본문이 있는 경우 `-m` 을 두 번 쓰거나 heredoc 을 사용한다. trailer 옵션은 쓰지 않는다.

```bash
git commit -m "feat: Add JWT authentication filter" -m "Validate the access token on protected routes and inject the
authenticated user into the security context.

Resolves: #42"
```

> `-s`/`--signoff`, `--trailer`, `Co-Authored-By` 등은 사용하지 않는다.
> 커밋 전 `main` 등 기본 브랜치면 먼저 브랜치를 만든다(사용자 지시가 없으면).

## 관련 스킬

[tdd-tidy-first](../tdd-tidy-first/SKILL.md)
