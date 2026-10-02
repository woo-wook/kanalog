# HTTP API

모든 업무 응답은 Kotlin 서버의 JSON이다. ID는 UUID 문자열, 시각은 UTC ISO 8601 문자열이다. 브라우저는 같은 출처의 `/api`로 요청한다. 로그인 후 `GET /api/me`의 `csrfToken`을 상태 변경 요청의 `X-CSRF-Token` 헤더에 보낸다. 쿠키는 HttpOnly이므로 JavaScript가 읽지 않는다.

## 계정과 조회

| 메서드 | 경로 | 주요 응답 |
| --- | --- | --- |
| POST | `/api/auth/login` | `{id,email,csrfToken}` 및 세션 쿠키 |
| POST | `/api/auth/logout` | 세션 삭제 및 쿠키 만료 |
| GET | `/api/me` | `{id,email,csrfToken}` |
| GET | `/api/dashboard` | `{dueCount,newRemaining,studiedCardsToday,answersToday,streak,selectedDeckId}` |
| GET | `/api/decks` | `{id,title,level,kind,totalCards,studiedCards,unseenCards,selected}[]` |
| GET | `/api/decks/{id}` | 덱 상세 |
| POST | `/api/decks/{id}/select` | 선택한 덱 변경 |
| GET | `/api/settings` | 저장된 학습 설정 |
| PATCH | `/api/settings` | 저장된 학습 설정 |
| GET | `/api/stats` | 7일·30일 답변과 고유 카드, 덱별 진행 |

`POST /api/auth/login` 본문은 `{"email":"...","password":"..."}`이다. 공개 회원가입 API는 없다. 설정은 `dailyNewLimit`, `showReadingHint`, `showHangulHint`, `autoPlayAudio`, `allowAudioBeforeReveal`, `ttsFallback`, `playbackSpeed`, `preferredVoice`, `timezone`을 사용한다. 새 카드 한도 단위는 카드다. 저장된 선호 음성이 현재 기기에 없으면 사용 가능한 일본어 음성으로 돌아간다.

## 학습

`POST /api/study/sessions` 본문은 `{"deckId":"UUID"}`다. 응답은 `{id,cards,answered}`이며 각 카드는 `id`, `version`, `kind`, `front`, `reading`, `meaning`, `example`, `exampleMeaning`, `examples`, `explanation`, `hangulHint`, `audioId`, `exampleAudioId`, `due`를 가진다. `examples`는 순서대로 `{japanese,reading,korean,audioId}`를 담는다. 선택한 덱의 복습 예정 카드를 먼저 담는다. `GET /api/study/sessions/{id}`는 저장된 세션에서 지금 학습 가능한 카드를 다시 조회한다.

`POST /api/study/reviews` 예시:

```json
{
  "sessionId": "SESSION_UUID",
  "cardId": "CARD_UUID",
  "version": 0,
  "rating": "GOOD",
  "idempotencyKey": "CLIENT_GENERATED_UUID"
}
```

`rating`은 `AGAIN`, `HARD`, `GOOD`, `EASY` 중 하나다. 응답은 `{due,version,state}`이다. 같은 사용자·키·동일 요청을 다시 보내면 이전 성공 결과를 돌려준다. 같은 키로 다른 내용을 보내거나 다른 탭에서 갱신된 `version`을 제출하면 409다. 이미 답한 카드를 실제 복습 시각 전에 새 키로 다시 평가해도 `CARD_NOT_DUE` 409다. 클라이언트는 저장 성공 후에만 다음 카드로 이동한다.

## 개인 콘텐츠와 운영

| 메서드 | 경로 | 설명 |
| --- | --- | --- |
| GET | `/api/notes?query=&page=0&size=20` | 표기·읽기·뜻 검색 |
| POST | `/api/notes` | 개인 단어 등록 |
| PATCH | `/api/notes/{id}` | 개인 단어 수정·메모·북마크·학습 제외 |
| GET | `/api/imports` | 내 import 작업 목록, 최근 100건 |
| GET | `/api/imports/{id}` | 내 import 결과 `{id,fileName,status,startedAt,finishedAt,reportJson,errorMessage}` |
| GET | `/api/media/{id}` | 소유권 확인 후 음성 제공, Range 지원 |
| GET | `/api/health/live` | 프로세스 상태 |
| GET | `/api/health/ready` | DB 준비 상태 |

웹 APKG 업로드 API는 제공하지 않는다. 대형 파일은 로컬 변환 후 Kotlin CLI로 가져온다.

## 오류

오류 응답은 `{code,message,requestId}`이며 검증 오류에는 필요할 때 `fieldErrors`가 추가된다. 401은 로그인 필요, 403은 CSRF·Origin 또는 권한 실패, 404는 사용자 범위에서 없는 리소스, 409는 중복 키의 다른 내용 또는 오래된 카드 상태다. 서버 내부 예외는 사용자에게 스택 트레이스를 반환하지 않는다.

## 통계 정의

- 오늘의 시작·끝, 7일·30일 범위와 연속 학습일은 사용자 `timezone`의 자정을 기준으로 한다. 시간대 변경은 과거 UTC 로그를 새 시간대로 다시 묶어 즉시 적용한다.
- 답변 횟수는 범위 안의 `review_log` 행 수다. 고유 카드는 같은 범위 안에서 답변한 서로 다른 카드 ID 수다.
- 한 번 이상 학습한 카드는 `user_card_state.first_seen_at`이 있는 활성 카드다. 이는 암기 완료를 뜻하지 않는다.
- 복습 예정 수는 활성·비제외 카드 중 `due_at <= 현재 서버 시각`인 수다. 홈은 선택한 덱에 한정하고 전체 통계는 내 모든 준비된 덱을 센다.
- 오늘 남은 새 카드는 선택한 덱의 미학습 카드 수와 `dailyNewLimit - 오늘 처음 학습한 카드 수` 중 작은 값이다.
- 연속 학습일은 오늘 학습 기록이 있으면 오늘부터, 없으면 어제부터 하루씩 거슬러 올라간 날 수다.

## 코스와 음성 설정

- `GET /api/courses`: 소유자 코스와 레슨별 활성/학습/최초연습완료/복습예정 카드 집계.
- `GET /api/courses/{id}`: 개인 코스 상세. 타인 코스는 404.
- `POST /api/courses/lessons/{id}/select`: 현재 레슨 선택.
- `POST /api/study/sessions`: `{ "lessonId": "uuid" }` 또는 기존 `{ "deckId": "uuid" }` 중 정확히 하나. 응답에 lessonId/lessonTitle 포함.
- 대시보드 `dailyNewRemaining`은 코스와 무관한 계정 전체의 오늘 신규 카드 잔여 한도. `newRemaining`은 선택한 레슨/덱에서 가능한 카드 수.
- 설정 GET/PATCH의 `audioEngine`: SUPERTONIC(기본값), ORIGINAL, DEVICE. `supertonicVoice`: F1(기본값)..F5/M1..M5. 설정은 사용자별로 저장한다. 잘못된 선택은 BAD_AUDIO_ENGINE/BAD_SUPERTONIC_VOICE(400).

음성 합성은 DB 진도 변경이 없으며 브라우저에서 실행한다. 생성 WAV와 개인 학습 데이터는 공개 캐시에 저장하지 않는다.
# 레벨별 커리큘럼

- `GET /api/curriculum`: 인증된 사용자 콘텐츠를 왕초보~고급 6레벨·단원·기존 레슨으로 구성한다. `version`, `levels`, `recommendedLevelKey`, `recommendedLessonId`를 반환한다.
- `GET /api/curriculum/levels/{key}`: `starter`, `n5`, `n4`, `n3`, `n2`, `n1` 중 한 레벨. 잘못된 키는 404 `CURRICULUM_LEVEL_NOT_FOUND`.
- 레벨에는 `goal`, `outcomes`, `units`, `available`와 기본 레슨의 `totalCards`, `studiedCards`, `completedCards`, `totalLessons`, `completedLessons`가 있다. 단원은 순서·선택 여부·기존 레슨을 포함하며 레슨에는 기존 `id`와 `courseId`, `kind`를 보존한다.
- 조회는 카드 예약·진도 갱신을 하지 않는다. 없는 급수는 `available=false`이고 가짜 레슨을 생성하지 않는다. 선택 확장은 레벨 기본 진도에서 제외한다. `completed`는 첫 연습 완료이며 장기 암기 완료를 뜻하지 않는다.
- 버전 2의 가나 항목은 행별 목록을 기본/확장 하나씩으로 집계한다. `id`는 기존 첫 활성 행의 안정된 식별자이며 집계 항목의 직접 학습 범위를 뜻하지 않는다. 가나 학습은 `courseId`로 코스를 열고 `kana.scripts/groups` 요청으로 시작한다. 옛 `lessonId` 요청은 기존 행 범위를 유지하므로 이전 세션도 읽을 수 있다.
- 실제 카드 평가 저장 성공 뒤 클라이언트가 `curriculum` 조회를 갱신한다. 기존 `/api/courses`와 학습 세션/평가 계약은 유지한다.


## 모바일 학습 음성

`POST /api/speech`는 로그인 쿠키, `Origin`, `X-CSRF-Token`이 필요하다. 본문은 `{"text":"ア","voice":"F1"}`이며 비어 있지 않은 text 최대 500자, voice `F1`..`F5`/`M1`..`M5`만 허용한다. 성공은 JSON 대신 `Content-Type: audio/wav`와 `Cache-Control: private, no-store`의 이진 응답이다. 학습 상태를 변경하지 않는다. 주소·언어·모델 설정은 클라이언트가 지정할 수 없다.

잘못된 입력 400, 미인증 401, Origin/CSRF 오류 403, 계산 중 429 `SPEECH_BUSY`, 잘못된 WAV 502 `BAD_SPEECH`, 계산 실패 503 `SPEECH_UNAVAILABLE`을 반환한다. 일반 오류 envelope를 사용한다. 클라이언트는 받은 WAV의 Blob URL을 재생하며 취소·페이지 이동 때 해제한다.


## 가나 섞어 학습과 자유 연습

가나 연습은 문자 종류와 포함 분류만 선택한다. 항상 활성·미제외 문자를 모두 마지막 평가 기준 다시 → 어려움 → 미연습 → 보통 → 쉬움 순으로 연습하며 장수·하루 한도·복습 시각 제한을 적용하지 않는다. 이전 클라이언트의 `kana.size`·`kana.practice`는 수신하더라도 무시한다. 기존 URL에 `size=4&practice=0`이 남아 있어도 전체 연습한다.

레슨 또는 덱에서도 `{ "lessonId":"uuid", "practice":true }` / `{ "deckId":"uuid", "practice":true }`로 자유 연습할 수 있다. 레슨은 전체 활성·미제외 범위, 덱은 최대 50장을 고른다. 소유권과 제외 상태를 검사하며 기존 FSRS 상태를 변경하지 않는다.

POST 세션 응답의 `queueInfo`는 선택 범위의 `eligibleCards`, `unseenCards`, 사용자 전체 `newRemaining`, 미래 복습의 최소 `nextDueAt`, 빈 큐의 `reason`을 제공한다. `DAILY_LIMIT`은 새 카드가 남았으나 하루 한도를 소진한 상태, `NOT_DUE`는 복습 시각 미도래, `NO_ELIGIBLE_CARDS`는 활성·미제외 카드가 없는 상태다. 복습일을 변경하거나 상태를 초기화하지 않는다. GET 세션은 이 진입 메타데이터를 반환하지 않는다.

`POST /api/study/sessions`에서 `deckId`·`lessonId`·`kana` 중 정확히 하나만 보낸다.

```json
{"kana":{"scripts":["hiragana","katakana"],"groups":["basic","voiced","semiVoiced","yoon"]}}
```

`scripts`는 히라가나·가타카나, `groups`는 기본(46)·탁음(20)·반탁음(5)·요음(33)의 중복 없는 비어 있지 않은 목록이다. 숫자는 문자 체계 한 종류당 수다. 기본 히라가나 46자부터 두 문자 체계의 모든 분류 208자까지 해당 범위 전체를 연습한다. 같은 평가 내에서는 시작할 때 순서를 섞으며 세션의 순서는 GET으로 재조회할 때 유지한다. 명시적으로 학습 제외한 카드는 빠진다.

가나 응답은 항상 `practice:true`다. 기존 `/study/reviews`에 같은 평가·idempotency key를 제출하되 자유 연습은 서버에 저장된 세션 모드로 판단한다. 응답은 `{version,state:"PRACTICED"}`이며 `due`는 없다. 답변을 `practice_answer`에 따로 저장하고 FSRS 상태·일일 새 카드 한도·ReviewLog 통계를 변경하지 않는다. 가나는 같은 트랜잭션에서 사용자·카드별 `kana_practice_state`의 최근 평가를 갱신하며 코스 첫 연습 진도에도 반영한다. 카드 응답의 선택적 `lastRating`이 최근 평가다. 같은 키의 재전송은 평가 횟수도 추가하지 않는다. 코스의 가나 `dueCount`는 최근 AGAIN/HARD 문자 수이며 N5~N1은 기존 FSRS due 집계다. 자유 연습 한 세션에서는 카드당 한 번만 답변하며 같은 키의 재전송은 기존 성공을 반환한다. 같은 키의 다른 요청은 409 `IDEMPOTENCY_CONFLICT`, 다른 키의 중복 카드 답변은 409 `PRACTICE_ALREADY_ANSWERED`다. 자유 연습과 일반 복습 사이에서도 이미 사용한 사용자 요청 키는 재사용할 수 없다.

`GET /api/study/sessions/{id}`는 소유자만 조회하며 자유 연습에서는 미답변 카드와 저장된 답변 수를 반환한다. 제외된 카드는 빠진다. 범위가 잘못되면 400 `BAD_KANA_SCOPE`, 학습 범위를 동시에 지정하면 400 `BAD_STUDY_SCOPE`다.
