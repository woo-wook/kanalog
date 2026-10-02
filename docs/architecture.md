# 구조

## 구성

브라우저는 Next.js 16 프런트엔드에 접속한다. 프런트엔드의 `/api/*` Route Handler는 요청·쿠키·Range 헤더를 Kotlin 서버에 전달하는 전송 프록시이며 학습 규칙이나 데이터 저장을 맡지 않는다. 운영 Compose에서는 `BACKEND_API_URL=http://backend:8080`이다. Kotlin/Spring Boot 4 서버가 계정, 덱 소유권, 학습 세션, FSRS 결과, 검색, 통계를 처리한다. PostgreSQL 16에 사용자 데이터와 복습 이력을 저장한다. 계정 관리 CLI는 Spring Data JPA 저장소를 사용하고, 학습·import는 명시적인 SQL과 행 잠금이 필요한 구간에 JdbcTemplate을 사용한다. Flyway가 스키마를 적용하며 Hibernate는 `validate`만 한다.

| 구성 | 지속 데이터 | 외부 접근 |
| --- | --- | --- |
| Next.js 프런트엔드 | 앱 shell만 브라우저 캐시 | 기본 localhost:3200 |
| Kotlin API | 미디어 전용 볼륨 | Compose 내부 |
| PostgreSQL | 기존 infra-postgres의 kanalog 전용 DB | infra-backend 내부 |
| Supertonic 내부 계산 | 모델 읽기 전용, 최근 WAV 제한 RAM 캐시 | Compose 내부 8090, 공개 포트 없음 |
| APKG 변환 도구 | `private-data/converted` | 로컬 명령만 |

원본 APKG와 변환 JSONL은 `private-data`에 두고 Git 및 이미지 빌드에서 제외한다. 변환된 음성은 import 중 개인 미디어 볼륨으로 복사한다. `/api/media/{id}`는 DB 소유권을 확인한 후 제공하며, 미디어 볼륨을 웹 서버 정적 경로로 공개하지 않는다.

## 인증과 진도

로그인은 BCrypt 해시를 검증하고 무작위 세션 토큰을 HttpOnly SameSite=Lax 쿠키에 설정한다. DB에는 토큰 원문 대신 SHA-256 해시, 만료 시각, CSRF 토큰을 저장한다. 쓰기 요청은 `X-CSRF-Token`과 브라우저 Origin을 검증한다. 운영 HTTPS에서는 `COOKIE_SECURE=true`로 설정한다. Dutchlog의 계정, 키, DB와 공유하지 않는다.

학습 세션 생성은 명시적 POST다. 서버가 사용자와 덱 소유권, 복습 우선순위, 사용자 시간대의 일일 새 카드 한도를 확인한다. 서버는 [java-fsrs 1.0.0](https://central.sonatype.com/artifact/io.github.open-spaced-repetition/fsrs/1.0.0)의 결과를 계산한다. 이 구현체의 [MIT 라이선스](https://github.com/open-spaced-repetition/java-fsrs/blob/main/LICENSE)를 확인했다. 기본 목표 유지율은 0.9이며 fuzz는 끈다. 카드 상태 전체를 JSON으로 저장한다. 카드 상태와 복습 로그는 한 트랜잭션으로 확정한다. `(user_id, idempotency_key)` 유일 제약으로 재전송을 구분하고 카드 `version`이 오래되면 409를 반환한다. 모든 저장 시각은 UTC의 `timestamptz`이며 `Asia/Seoul` 등 사용자 시간대는 일일 한도와 통계 날짜에 적용한다. 시간대를 바꾸면 오늘 한도, 연속 학습일, 최근 7일·30일 지표를 새 시간대 기준으로 즉시 다시 계산한다. 기존 `ReviewLog` 시각과 FSRS `due`는 변경하지 않는다.

## 가져오기 경계

`tools/deck-import`의 Python 표준 라이브러리 도구는 JLPT MAX v2.1.2 APKG를 검증하고 JSONL과 media map으로 변환한다. Kotlin import 명령은 DB 트랜잭션, 계정 소유권, 안정적인 source GUID와 카드 방향 키, 미디어 저장을 담당한다. 원본 템플릿 JavaScript를 실행하지 않는다. 필드와 집계는 [데이터 출처](data-sources.md), 변환 형식과 재실행 정책은 [가져오기 형식](import-format.md)을 참고한다.

## PWA

manifest와 자체 SVG/PNG 아이콘을 제공한다. 서비스 워커는 오프라인 안내 화면만 캐시한다. 인증된 학습 API 응답, 음성, 사용자별 데이터, 미제출 답변은 오프라인 캐시에 넣지 않는다.

## 학습 코스와 브라우저 음성

`learning_course` → `course_lesson` → `lesson_card`가 콘텐츠를 레슨에 연결한다. 최초 기본 코스는 히라가나 46자, 가타카나 46자 순서이며 탁음·반탁음·요음은 선택 레슨으로 분리한다. MAX는 원본 어휘/문법과 급수를 유지하면서 어휘 20장/문법 5장 단위 레슨으로 연결한다. 매핑을 다시 실행해도 카드 ID와 FSRS 상태를 초기화하지 않는다. 레슨의 최초 연습 완료는 각 활성 카드에 GOOD/EASY를 최소 한 번 제출한 상태이며 암기 완료를 뜻하지 않는다. 제외 카드가 있는 레슨의 집계와 추천은 활성 카드 기준이다.

Supertonic 3는 브라우저 Web Worker에서 고정된 ONNX 모델로 일본어 음성을 생성한다. ONNX Runtime Web 1.30.0은 WebGPU를 우선 시도하고 사용할 수 없으면 WASM 단일 스레드를 사용한다. 모델은 별도 디렉터리에서 같은 origin의 `/tts/supertonic`으로 제공하며 이미지에 넣지 않는다. 브라우저 모드에서는 텍스트를 서버로 전송하지 않는다. iPhone·iPad(데스크톱 UA iPad 포함)는 대형 모델의 브라우저 메모리 사용을 피하기 위해 `/api/speech`로 텍스트·목소리를 자체 Kotlin API에 보내고 작은 WAV만 받는다. 기존 쿠키·Origin·CSRF 인증 후 고정 내부 계산 주소로 전달하며 타사 TTS로 전송하지 않는다. 읽기 필드가 있는 단어는 읽기를, 가나는 해당 글자를 합성한다. 한국어 문법 질문은 합성하지 않고 일본어 예문만 듣는다.

계정 설정의 `audioEngine`은 SUPERTONIC/ORIGINAL/DEVICE, `supertonicVoice`는 F1..F5/M1..M5이며 기본값은 SUPERTONIC/F1이다. 생성된 WAV는 해당 페이지 메모리의 Blob URL로만 재생하고 취소/페이지 이탈 시 해제한다. 취소된 요청의 결과는 재생하지 않는다. 원본 MAX 음성을 별도 버튼으로 비교할 수 있으며 기기 음성은 ja-JP만 사용한다.
# 레벨별 커리큘럼 읽기 모델

`CurriculumService`는 인증된 사용자의 `CourseService.list` 결과를 `CurriculumBuilder`로 구성한다. 고정 6레벨, 왕초보 기본 4단원·선택 확장 2단원, 각 JLPT 급수의 어휘/문법 비례 분산 단원이다. DB에 이미 저장된 카드·레슨 ID와 진도를 재사용하며 새로운 스케줄러나 별도 진도 테이블을 추가하지 않는다. 기존 FSRS 평가가 동일한 원천으로 레슨·단원·레벨 첫 연습 진도를 갱신한다.

프런트엔드의 `curriculum` Query를 홈·코스·레벨 상세·세션 완료·통계에서 공유한다. 현재 단원은 펼치고 다른 단원은 접힌 목차로 표시한다. 추천은 서버가 반환한 레슨 ID를 따른다. 기본 진도는 선택 확장을 제외하며, 복습 건수는 확장도 포함한다. 조회와 화면 이동은 학습 기록을 생성하지 않는다.


## 모바일 음성 계산 경계

`tools/voice-server`는 공식 helper를 동일하게 사용하고 ONNX Runtime Node 1.30.0 CPU로 추론한다. 모델 파일은 manifest의 크기·SHA-256 확인 후 읽기 전용 volume에서 직접 연다. 계정·DB·세션·진도에는 접근하지 않는다. 입력은 텍스트(최대 500자)와 고정 목소리 F1..F5/M1..M5뿐이다. 추론은 동시에 하나만 허용하며 바쁜 경우 429, 계산 실패는 503으로 반환한다. 완성 WAV는 최대 32MiB/256개 RAM LRU에 보관하며 재시작 때 제거한다. 사용자 본문과 WAV를 로그나 디스크 캐시에 저장하지 않는다. API 응답은 `private, no-store`다.

Kotlin adapter는 연결 3초·요청 45초 제한과 최대 8MiB WAV 검증을 적용한다. 실패 시 브라우저 모델 다운로드로 자동 전환하지 않는다. 프런트는 취소 후 도착한 결과를 버리고 기존 재생·페이지 이탈 정리를 유지한다. 재생 준비 중 사용자 동작 권한이 만료되면 준비된 음성 재생 버튼으로 다시 시작한다. Safari 재시작의 실기기 로그는 확보하지 않았으므로 메모리 종료를 확정한 것은 아니다.


## 가나 혼합 세션

섞기 UI는 문자 종류와 포함 분류만 전송한다. 서버는 가나 요청을 항상 전체 범위 자유 연습으로 처리하며 이전 클라이언트의 장수·모드값으로 축소하지 않는다. 레슨/덱 범위에도 명시적인 자유 연습을 적용할 수 있으며 서버의 소유권 검증과 세션 모드로 동작한다. 세션 생성의 `queueInfo`가 빈 큐 원인을 알려 주고, 프런트엔드는 답변 없는 진입과 실제 학습 완료를 분리한다. 자유 연습 저장 후에는 바뀌지 않은 복습 통계·커리큘럼 쿼리를 매 카드마다 다시 조회하지 않는다.

가나 범위는 기존 `learning_course`와 `course_lesson.position`의 기본 0~9·탁음 10~13·반탁음 14·요음 15로 실제 카드 ID를 찾는다. 소유자·READY·활성 카드만 포함하고 제외 상태를 큐에서 확인한다. 여러 덱을 포함하는 세션만 `deck_id`가 null이며 `session_title`에 표시 이름을 보관한다. 일반 학습은 같은 UserCardState·ReviewLog 트랜잭션, FSRS 버전·중복 키·전역 사용자 잠금을 재사용한다. 섞기 후보 및 순서를 무작위로 선택한 뒤 `session_card.position`으로 고정한다.

자유 연습 모드는 세션의 서버 저장 `practice` 플래그로 구분한다. `practice_answer`의 `(user_id,idempotency_key)`·`(session_id,card_id)` 유일 제약과 기존 사용자 행 잠금으로 중복 답변을 막는다. 일반 ReviewLog와 요청 키 충돌도 검사한다. UserCardState를 만들거나 변경하지 않으므로 이미 본 문자·미학습 문자 모두 원래 복습일과 한도를 유지한다. 기존 통계와 커리큘럼 집계는 ReviewLog 기준을 유지한다. V7은 컬럼·표를 추가하고 기존 ID·진도를 초기화하지 않는다.
