# 구조

## 구성

브라우저는 Next.js 16 프런트엔드에 접속한다. 프런트엔드의 `/api/*` Route Handler는 요청·쿠키·Range 헤더를 Kotlin 서버에 전달하는 전송 프록시이며 학습 규칙이나 데이터 저장을 맡지 않는다. 운영 Compose에서는 `BACKEND_API_URL=http://backend:8080`이다. Kotlin/Spring Boot 4 서버가 계정, 덱 소유권, 학습 세션, FSRS 결과, 검색, 통계를 처리한다. PostgreSQL 17에 사용자 데이터와 복습 이력을 저장한다. 계정 관리 CLI는 Spring Data JPA 저장소를 사용하고, 학습·import는 명시적인 SQL과 행 잠금이 필요한 구간에 JdbcTemplate을 사용한다. Flyway가 스키마를 적용하며 Hibernate는 `validate`만 한다.

| 구성 | 지속 데이터 | 외부 접근 |
| --- | --- | --- |
| Next.js 프런트엔드 | 앱 shell만 브라우저 캐시 | 기본 localhost:3200 |
| Kotlin API | 미디어 전용 볼륨 | Compose 내부 |
| PostgreSQL | DB 전용 볼륨 | Compose 내부 |
| APKG 변환 도구 | `private-data/converted` | 로컬 명령만 |

원본 APKG와 변환 JSONL은 `private-data`에 두고 Git 및 이미지 빌드에서 제외한다. 변환된 음성은 import 중 개인 미디어 볼륨으로 복사한다. `/api/media/{id}`는 DB 소유권을 확인한 후 제공하며, 미디어 볼륨을 웹 서버 정적 경로로 공개하지 않는다.

## 인증과 진도

로그인은 BCrypt 해시를 검증하고 무작위 세션 토큰을 HttpOnly SameSite=Lax 쿠키에 설정한다. DB에는 토큰 원문 대신 SHA-256 해시, 만료 시각, CSRF 토큰을 저장한다. 쓰기 요청은 `X-CSRF-Token`과 브라우저 Origin을 검증한다. 운영 HTTPS에서는 `COOKIE_SECURE=true`로 설정한다. Dutchlog의 계정, 키, DB와 공유하지 않는다.

학습 세션 생성은 명시적 POST다. 서버가 사용자와 덱 소유권, 복습 우선순위, 사용자 시간대의 일일 새 카드 한도를 확인한다. 서버는 [java-fsrs 1.0.0](https://central.sonatype.com/artifact/io.github.open-spaced-repetition/fsrs/1.0.0)의 결과를 계산한다. 이 구현체의 [MIT 라이선스](https://github.com/open-spaced-repetition/java-fsrs/blob/main/LICENSE)를 확인했다. 기본 목표 유지율은 0.9이며 fuzz는 끈다. 카드 상태 전체를 JSON으로 저장한다. 카드 상태와 복습 로그는 한 트랜잭션으로 확정한다. `(user_id, idempotency_key)` 유일 제약으로 재전송을 구분하고 카드 `version`이 오래되면 409를 반환한다. 모든 저장 시각은 UTC의 `timestamptz`이며 `Asia/Seoul` 등 사용자 시간대는 일일 한도와 통계 날짜에 적용한다. 시간대를 바꾸면 오늘 한도, 연속 학습일, 최근 7일·30일 지표를 새 시간대 기준으로 즉시 다시 계산한다. 기존 `ReviewLog` 시각과 FSRS `due`는 변경하지 않는다.

## 가져오기 경계

`tools/deck-import`의 Python 표준 라이브러리 도구는 JLPT MAX v2.1.2 APKG를 검증하고 JSONL과 media map으로 변환한다. Kotlin import 명령은 DB 트랜잭션, 계정 소유권, 안정적인 source GUID와 카드 방향 키, 미디어 저장을 담당한다. 원본 템플릿 JavaScript를 실행하지 않는다. 필드와 집계는 [데이터 출처](data-sources.md), 변환 형식과 재실행 정책은 [가져오기 형식](import-format.md)을 참고한다.

## PWA

manifest와 자체 SVG/PNG 아이콘을 제공한다. 서비스 워커는 오프라인 안내 화면만 캐시한다. 인증된 학습 API 응답, 음성, 사용자별 데이터, 미제출 답변은 오프라인 캐시에 넣지 않는다.
