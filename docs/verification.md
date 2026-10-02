# 검증 기록

## 긴 문법 해설·모바일 배치 개선 (2026-10-02)

- 원본 문법 정답의 줄바꿈을 보존하고 16px 왼쪽 정렬 본문으로 표시한다. 질문은 별도 18~22px 제목이며 가나·어휘의 큰 글자는 유지한다. 내용 없는 설명 패널과 재생할 수 없는 문법의 중복 음성 안내를 제거했다. 카드·세션 전환 시 스크롤을 초기화한다.
- DB에 저장된 개인·QA 계정의 MAX 문법 1,177개에서 원본 해설의 줄바꿈과 `Kind`의 보이지 않는 U+2063 구분 문자를 확인했다. 초기 브라우저 검사는 이 문자 때문에 빈 설명란이 남아 실패했다. 같은 문자의 synthetic fixture로 실패를 재현한 뒤 표시에서만 걸러내고 재실행했다. 원본 DB나 import 내용은 변경하지 않았다.
- Vitest **56개**, TypeScript, ESLint 통과. 원본 문단 보존, 음성 없는 문법의 자동재생 호출 없음, 빈 설명란 없음, 다음 카드 스크롤 초기화를 검증했다. Next.js Docker production build와 frontend 재배포, 공개 HTTPS·Secure 쿠키·backend healthy 확인도 통과했다.
- 실제 N5의 400자 이상 문법 해설로 **모바일 WebKit 360×640·390×740·390×844**, Chromium 태블릿 768×1024·PC 1280×900에서 문단 보존·본문 크기·정렬·가로 넘침 없음·질문 위치를 확인했다. 모바일은 페이지 전체 스크롤 없이 카드 내부에서 마지막 문장을 읽을 수 있고 네 평가 버튼이 하단 탐색 위에 남는다. 스크롤한 답변 제출 뒤 다음 카드의 scrollTop=0도 확인했다. 실제 화면 캡처를 개인 디렉터리에 저장하고 시각적으로 확인했다.
- 새로고침/다음 카드 음성 자동재생 검증도 통과했다. 처음에는 이미 전체 연습을 마친 QA 계정에서 미학습 가나 행을 찾던 이전 검사 조건이 실패했다. 현재 전체 가나 연습 경로와 연습 기록 저장 계약에 맞춰 수정했고, 46자 범위·실제 Supertonic WAV 재생·다음 카드 자동재생·새로고침 후 DB 연습 기록과 로그인 유지·FSRS 통계 불변을 재검증했다.

문법 모바일·데스크톱 2개, 새로고침/자동재생 1개, 가나 3개 크기와 긴 어휘 예문 4개로 **브라우저 7개 케이스** 최종 통과했다. 개인 MAX 원문·화면 캡처·계정 비밀번호는 Git에 포함하지 않는다. 실제 iPhone Safari와 설치 PWA 실기기 검증은 미실행이다. 이번 변경은 프런트만 재배포하며 기존 DB·복습 기록을 유지했다.

```sh
pnpm -C frontend test
pnpm -C frontend exec tsc --noEmit
pnpm -C frontend lint
docker compose up -d --no-deps --build frontend
E2E_BASE_URL=https://kanalog.hanwook.me python3 tools/e2e/run_live.py e2e/grammar-layout.spec.ts e2e/grammar-desktop.spec.ts e2e/refresh-autoplay.spec.ts e2e/mobile-study.spec.ts
python3 tools/e2e/check_deployment.py
```

## 가나 단일 코스·다음 연습 평가 반영 (2026-10-02)

- PostgreSQL 16 Testcontainers/JUnit **31개** 통과. 최근 AGAIN/HARD 우선, AGAIN→EASY 변경 시 뒤로 이동, 혼합·단일 문자 기록 공유, 멱등 재전송 시 횟수 불변, 사용자 분리·범위·제외·FSRS 상태 불변 검증. V8 실제 SQL을 별도 synthetic 스키마에서 실행해 일반/연습 기록 통합 이관과 어휘·타 사용자 기록 제외를 확인했다.
- TypeScript·ESLint·Vitest **53개** 통과. 왕초보에서 두 코스만 표시, 행 링크 제거, 고정 문자 코스의 분류 선택, 홈·재연습의 코스 진입과 평가 저장 설명을 확인했다.
- Kotlin/Next.js Docker production build 및 Compose 재배포 성공. HTTPS·Secure 쿠키·backend healthy, V8 성공 확인. 배포 직전 DB dump를 개인 백업 디렉터리에 저장했다. 배포 전후 UserCardState/ReviewLog 전체 행 해시, 카드/레슨 ID 목록 해시가 일치했다. 이관 건수와 최근 평가도 원본 로그 집계에 일치했다.
- 공개 주소 실제 로그인 후 데스크톱 가타카나 코스와 모바일 WebKit의 히라가나/가타카나 각 기본 46자, 반탁음 혼합 10자, 다시·어려움 우선순위, 쉬움 변경, 재로그인 뒤 단일 코스에서 같은 평가 적용을 확인했다. 360·390px/740px 화면에서 가로 넘침 없음과 네 평가 버튼의 화면 내 배치를 확인했다. 모바일 혼합 10자 완주·인증 WAV HTTP 200·실제 브라우저 재생도 통과했다.
- 전체 분류 208자를 실제 UI로 끝까지 제출하고 세션 재조회·반복·이전 제한 URL·일일 한도 소진 뒤 동일 범위 자유 연습도 재검증해 통과했다.
- 첫 브라우저 배치에서 데스크톱 단축키 숫자를 빠뜨린 버튼 선택자와 이동 완료 전 URL을 저장한 검사 코드가 실패했다. 선택자·이동 대기를 수정한 단독 재실행은 통과했다. N5 회귀 검사도 화면 이동 완료 전 레슨의 보임 여부를 판단해 두 항목이 실패하여 입문 화면·행 렌더링 대기를 추가한 뒤 두 항목도 통과했다. 설정 복원 오류가 원래 실패를 가리지 않도록 검사도 수정했다.

전체 범위 1개, N5·인증·음성·설정·화면 5개, 가나 단일 코스·혼합·평가 반영 3개로 **서로 다른 브라우저 9개 케이스**를 재실행 포함 최종 통과했다.

실제 iPhone와 설치 PWA의 실기기 검증은 미실행이다. 테스트는 전용 QA 계정에만 평가를 추가했다.

```sh
E2E_BASE_URL=https://kanalog.hanwook.me python3 tools/e2e/run_live.py e2e/kana-rating-priority.spec.ts e2e/courses.spec.ts e2e/kana-mix.spec.ts
E2E_BASE_URL=https://kanalog.hanwook.me python3 tools/e2e/run_live.py e2e/kana-complete-range.spec.ts e2e/learning.spec.ts
```

## 가나 분류 선택과 전체 연습 (2026-10-02)

가나 화면에서 장수와 연습 방식 선택을 제거했다. 히라가나/가타카나/둘 다와 기본·탁음·반탁음·요음만 고른다. 클라이언트는 scripts/groups만 전송하고, 서버는 항상 선택한 활성·미제외 문자 전체를 자유 연습으로 저장한다. 이전 링크와 요청의 `size`·`practice`도 범위를 줄이지 않는다.

- PostgreSQL Testcontainers/JUnit **28개** 통과. 신규 한도 소진·미래 복습 카드가 있는 상태에서도 기본 46자/모든 분류 208자 전부 포함, 이전 size=4/practice=false 무시, 기존 FSRS 상태 보존, 소유권·제외·멱등 저장 검증.
- TypeScript·ESLint·Vitest **50개** 통과. 불필요한 두 select 제거, 분류만으로 시작, 범위 없는 시작 차단, 이전 URL 제한값을 API에 전송하지 않음, 완료 후 새 세션 반복 검증.
- Kotlin/Next.js production Docker build와 Compose 배포 성공. 공개 HTTPS·Secure 쿠키·backend healthy 확인. 배포 전후 UserCardState/ReviewLog 행 해시 및 카드/레슨 ID 목록 해시 일치.
- 공개 모바일 WebKit에서 장수/모드 select 없음, 기본 46자, 이전 `size=4&practice=0` 링크도 46자, 모든 분류 208자 끝까지 제출·재조회·반복, 반탁음 혼합 10자와 실제 음성 재생을 확인했다. 기존 모바일 배치·음성 재로드·다음 카드 자동재생 포함 8개 케이스를 검증했다. 첫 일괄 실행은 7개 통과, 360x740 검사는 로그인 시 일반 오류로 실패했다. 해당 검사 단독 재실행에서 로그인 HTTP 200과 배치가 통과했다. 최초 오류의 HTTP 응답을 수집하지 못해 발생 지점은 확정하지 않았다.

실제 iPhone·설치 PWA 실기기 검증은 미실행이다. 공개 모바일 WebKit의 실제 사용자 흐름 검증 명령은 다음과 같다.

```sh
E2E_BASE_URL=https://kanalog.hanwook.me python3 tools/e2e/run_live.py e2e/kana-complete-range.spec.ts e2e/kana-mix.spec.ts e2e/mobile-study.spec.ts e2e/safari-speech.spec.ts e2e/refresh-autoplay.spec.ts
```

## 선택 범위 조기 종료와 빈 큐 수정 (2026-10-02)

실제 개인 계정의 하루 신규 한도 10장을 모두 사용한 상태를 확인했다. 최근 일반 세션에는 0장인 큐도 있었으며 기존 UI는 답변 0회도 완료로 표시했다. 섞기 UI의 기본 모드를 자유 연습으로 변경했고, 예정된 학습·복습은 한도 적용을 명시하여 따로 선택한다. 완료한 레슨 중 복습 시각 미도래는 바로 다시 연습한다. 빈 일반 세션은 서버의 한도·미도래·제외 상태와 다음 복습 시각을 표시하고 같은 범위 자유 연습으로 연결한다. 409 오류는 서버의 실제 메시지와 재조회·연습 버튼을 제공한다.

- PostgreSQL 16 Testcontainers/JUnit 27개 통과: 한도 소진 레슨의 빈 큐 이유·미도래·전체 제외·소유권·같은 레슨 반복·FSRS 기록 불변 포함.
- TypeScript, ESLint, Vitest 50개 통과: 섞기 기본 자유 연습·빈 진입/완료 분리·연습 전환·완료 레슨 링크·다른 탭의 한도 소진 메시지 포함.
- 공개 주소 모바일 WebKit에서 신규 한도가 **4장 남은 상태**로 기본 자유 연습을 선택하고 **전체 208장**을 버튼으로 하나씩 제출했다. 중복 없는 208장, 208회 저장 후 DB 세션 재조회, 같은 전체 범위 재시작, 한도 소진으로 빈 레슨 진입 후 동일 레슨 자유 연습 전환, 가로 넘침 없음, 복습 통계 불변을 확인했다.
- 동일 공개 주소에서 두 문자 체계 반탁음 10장·실제 WAV 재생·반복·통계 불변 검사도 통과했다.
- Kotlin/Next.js Docker production build와 Compose 배포 성공. backend/voice healthy 및 공개 URL·Secure 쿠키 검사를 통과했다. 배포 전후 전체 UserCardState/ReviewLog 행 해시와 카드/레슨 ID 목록 해시가 일치했다. DB migration이나 진도 초기화는 수행하지 않았다.

브라우저 총 **8개 검사 통과(5분)**: 전체 208장, 혼합 반탁음 10장, Safari 음성 반복/재로드, 모바일 가나 3개 크기·긴 MAX 예문, 새로고침/다음 카드 자동재생. 마지막 자동재생 검사는 일반 FSRS 평가와 저장 후 다음 카드까지 확인했다. 실제 iPhone Safari·설치 PWA 실기기 검증은 수행하지 않았다.

```sh
E2E_BASE_URL=https://kanalog.hanwook.me python3 tools/e2e/run_live.py e2e/kana-complete-range.spec.ts e2e/kana-mix.spec.ts e2e/mobile-study.spec.ts e2e/safari-speech.spec.ts e2e/refresh-autoplay.spec.ts
```

## 히라가나 우선·가나 섞어 학습 (2026-10-02)

새 계정의 기본 코스·왕초보 단원은 히라가나 → 가타카나다. 기존 카드·레슨 ID·선택 레슨·학습 기록은 유지한다. 왕초보 화면에서 문자 종류, 기본/탁음/반탁음/요음, 5·10·20·30장/선택 범위 전체를 고른다. 학습·복습은 같은 FSRS 상태로 원래 레슨 진도를 갱신하고, 자유 연습은 서버의 세션 모드와 별도 답변 표를 사용해 복습일·진도·통계를 보존한다.

| 검증 | 이번 실행 결과 |
| --- | --- |
| 백엔드 | JUnit 25개 통과. 히라가나 우선, 섞기 범위·소유권·208개 전체·중복 없음·세션 순서 유지·일일 한도·미래 카드 자유 연습·제외·중복 키 재전송/충돌·다른 키 중복 답변·연습과 FSRS의 키 충돌·FSRS 불변 포함 |
| 프런트엔드 | 타입·lint·Vitest 47개 통과. 모든 범위 조합과 전체 장수, 범위 없는 시작 차단, 선택한 요청 계약, 자유 연습 완료·답변 저장·새 세션 다시 섞기 포함 |
| 실제 모바일 흐름 | 최종 공개 WebKit에서 반탁음 두 문자 체계 10장 연습 완료·DB 답변 재조회·FSRS 통계/첫 연습 불변·다시 섞기·실제 서버 음성 재생·모델 다운로드 없음 확인. 로그인 안내도 히라가나 우선. 기존 모바일 카드 4개·Safari 음성 1개·새로고침/다음 카드 자동재생 1개의 회귀도 통과(브라우저 총 7개 케이스) |
| 모바일 입력 | 공개 WebKit에서 새 select의 실제 높이 19/21px 실패를 확인. 기존 `.field`에 명시적인 48px 높이·appearance·화살표·16px 글자 크기를 적용. 최종 360/390px에서 모든 select ≥44px·가로 넘침 없음 통과 |
| 배포와 보존 | V7 마이그레이션·Kotlin/Next.js Docker build·Compose healthy·공개 HTTPS·Secure 쿠키 검사 성공. 배포 전 DB dump(권한 0600) 보관, 배포 전후 전체 UserCardState/ReviewLog 행 해시 및 카드/레슨 ID 목록 해시 일치 |

초기 단계의 순서·섞기 API·자유 연습·프런트 연동 테스트를 각각 실패시킨 뒤 구현했다. 공개 주소의 Python `check_curriculum_api.py`는 Cloudflare가 403으로 차단하여 이번 실행은 통과로 기록하지 않는다. 공개 WebKit에서 같은 커리큘럼의 히라가나 우선 응답과 학습 흐름을 검증했다. 원문 콘텐츠나 비밀번호는 검증 산출물에 포함하지 않는다. 실제 iPhone·설치 PWA·청취 품질은 이번에도 실기기 검증을 하지 않았다.

```sh
cd backend
JAVA_HOME=/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home ./gradlew test --rerun-tasks --no-daemon
cd ../frontend
pnpm exec tsc --noEmit
pnpm lint
pnpm test
cd ..
docker compose up -d --build
E2E_BASE_URL=https://kanalog.hanwook.me python3 tools/e2e/run_live.py e2e/kana-mix.spec.ts e2e/mobile-study.spec.ts e2e/safari-speech.spec.ts e2e/refresh-autoplay.spec.ts
python3 tools/e2e/check_deployment.py
```

## 모바일 Safari의 반복 모델 다운로드 방지 (2026-10-02)

사용자가 보고한 재생 후 자동 재로드에 대해 코드상의 자동 reload는 없었다. 약 401MB 모델과 브라우저 추론 메모리로 인한 WebKit 프로세스 재시작을 의심하지만 실기기 종료 로그를 확보하지 않아 원인을 확정하지 않는다. iPhone/iPad(데스크톱 UA iPad 포함)는 브라우저 worker를 초기화하지 않고 인증된 자체 서버의 동일 Supertonic 계산 결과 WAV만 받도록 변경했다. Desktop browser mode와 MAX 기본 음성은 유지한다.

| 검증 | 이번 실행 결과 |
| --- | --- |
| 프런트엔드 | 타입 검사·lint·Vitest 45개 통과. iPhone은 worker/model 없이 server route, desktop UA iPad 판별, binary API CSRF/cookie/cache 계약 포함 |
| 백엔드 | JDK 21 전체 JUnit 22개 통과. 실제 HTTP adapter의 WAV 검증·계산 실패·입력 크기 제한 포함 |
| 내부 계산 서비스 | Node 테스트 2개 통과. 입력 제한·같은 WAV 캐시 재사용·동시 추론 429·실패 후 슬롯 복구 |
| 실제 모델 | 동일 고정 revision과 전체 파일 크기/SHA-256 검증 후 Linux arm64 CPU 실행. 로컬 실제 `ア` 합성 122,924 bytes, 1.39초·RMS 0.0468로 비무음 확인. synthetic WAV를 실제 생성 결과로 사용하지 않음 |
| iPhone WebKit | 공개 HTTPS 배포와 QA 계정으로 실제 음성 3회 재생 완료. 의도하지 않은 주 문서 이동 0회, `/tts/supertonic`, `/tts/runtime`, worker 요청 0개. 생성 WAV 각각 1MiB 미만. 직접 새로고침 후 재생 요청 성공·모델 요청 0개·답변 집계 유지 |
| 음성 API 접근 | 같은 실제 테스트에서 Origin만 있고 CSRF 없는 요청 403, 잘못된 목소리 400, 로그아웃 후 정상 Origin 요청 401 확인 |
| 기존 브라우저 흐름 | Chrome 계열 모바일 viewport 360×640/390×844/360×740 가나 3개와 긴 MAX 단어 1개 통과. 새로고침 후 생성 음성·평가 저장·다음 카드 자동재생 1개 통과. WebKit 포함 E2E 총 6개 통과 |
| 배포 | voice/frontend/backend Docker production build 및 Compose 기동 성공. voice/backend healthy, 공개 HTTPS·Secure 쿠키 검사 통과. voice 약 587MiB 사용 관측(2GiB 상한). 기존 PostgreSQL 전용 DB와 개인 미디어 유지, migration 없음 |

초기 WebKit 테스트의 로그아웃 검증은 Origin을 생략해 인증보다 앞선 Origin 검사에서 403을 받았다. 정상 Origin을 명시하고 로그아웃 요청이 끝나 로그인 화면으로 이동한 뒤 미인증 401을 확인하도록 테스트를 수정했다. 최종 voice 재배포 후 WebKit 테스트를 두 번 연속 반복해 모두 통과했다. 실제 iPhone의 재시작 로그·설치 PWA·오디오 청취 품질·장시간 메모리 사용은 확인하지 않았다. iPhone UA/터치/모바일 viewport를 사용하는 실제 Playwright WebKit 검증이며 실기기 검사와 구분한다.

```sh
cd backend
JAVA_HOME=/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home ./gradlew test --rerun-tasks --no-daemon
cd ../frontend
pnpm exec tsc --noEmit
pnpm lint
pnpm test
pnpm exec playwright install webkit
cd ../tools/voice-server
npm test
cd ../..
docker compose up -d --build
E2E_BASE_URL=https://kanalog.hanwook.me python3 tools/e2e/run_live.py e2e/safari-speech.spec.ts e2e/mobile-study.spec.ts e2e/refresh-autoplay.spec.ts
python3 tools/e2e/check_deployment.py
```

## PWA 새로고침과 자동재생 복구 (2026-10-02)

학습 화면은 문서 대신 카드 내부를 스크롤하므로 당겨서 새로고침하는 동작에 의존하지 않도록 모바일 상단·데스크톱 메뉴에 명시적인 새로고침 버튼을 추가했다. 현재 페이지를 완전히 다시 열어 로그인과 서버 데이터를 복원한다. `/api/me`가 일시적인 네트워크 오류로 실패할 때 로그인으로 이동하던 동작은 실패 테스트로 확인했고, 다시 확인 버튼을 제공하도록 수정했다. 실제 401은 로그인으로 이동한다.

자동재생 `play()`가 `NotAllowedError`로 거부된 뒤 준비된 음성을 재사용하는 테스트를 실패시킨 후 수정했다. 카드의 재생 버튼은 이 경우 `자동재생 시작` 또는 수동 듣기의 `준비된 음성 재생`으로 바뀐다. 터치 핸들러에서 즉시 같은 audio 요소의 `play()`를 호출하며 모델 계산을 다시 시작하지 않는다. 카드·version·음성 설정을 기준으로 이미 시도한 자동재생을 구분하여 단순 설정 갱신이나 정답 표시가 같은 카드의 음성을 중복 생성하지 않도록 했다. 이전 카드의 늦은 재생 실패도 다음 카드에 표시하지 않는다.

공개 `/sw.js` 응답은 수정 전 `public, max-age=14400`, 수정 후 `no-cache, no-store, must-revalidate`였다. 앱 시작 때 `updateViaCache: none`과 명시적인 서비스워커 업데이트로 새 코드를 확인한다. 모델의 기존 장기 캐시 설정은 유지한다.

| 검증 | 실제 결과 |
| --- | --- |
| 프런트엔드 | 타입 검사·린트·Vitest 42개 통과. 자동재생 차단·같은 음성 재생·다음 카드·중복 계산 방지, 새로고침, 네트워크 재시도와 401 분리, 서비스워커 갱신 회귀 포함 |
| 실제 새로고침 | 수정 전 공개 배포본에서 버튼 부재로 브라우저 테스트 실패. 재배포 후 390×844에서 버튼 클릭에 따른 문서 재로드·로그인 유지·설정 및 서버 진도 복원 확인 |
| 실제 생성 음성 | 공개 HTTPS 주소와 전용 QA 계정의 가타카나 카드에서 실제 모델로 WAV를 생성하고 오디오 재생 시간이 증가함을 확인. 정답 표시에도 같은 음성 src 유지 |
| 다음 카드 자동재생 | 보통 평가를 저장한 뒤 음성 버튼을 추가로 누르지 않고 다음 카드의 새로운 오디오 재생 시간 증가 확인 |
| 기록 영속성 | QA 답변 횟수 +1 및 다시 새로고침한 뒤 같은 값 유지. 자동재생 설정도 유지. 검증 종료 후 QA 설정을 이전 값으로 복원 |
| 모바일 | 360×640, 390×844, 360×740 가나 및 360×640 실제 N5 단어·오디오 조절의 화면 넘침·버튼 겹침 없음. 브라우저 테스트 총 5개 통과 |
| 배포 | Docker production build·Compose 재배포 성공. 주소·Secure 쿠키·backend healthy 검사 통과. 내장 브라우저에서도 새로고침 버튼으로 설정 화면 복원 확인 |

```sh
cd frontend
pnpm exec tsc --noEmit
pnpm lint
pnpm test
cd ..
docker compose up -d --build frontend
E2E_BASE_URL=https://kanalog.hanwook.me python3 tools/e2e/run_live.py e2e/refresh-autoplay.spec.ts e2e/mobile-study.spec.ts
python3 tools/e2e/check_deployment.py
```

브라우저의 자동재생 정책을 해제하지 않았다. 차단 및 재생 재시도는 단위 테스트에서 제어해 검증했으며 실제 브라우저 흐름은 Chrome 계열 viewport에서 검증했다. 사용자의 기기·설치된 PWA·iOS/Safari 실기기와 청취 품질은 직접 검증하지 않았다. DB 스키마·서버 학습 로직은 변경하지 않았다.

## 모바일 학습 카드와 평가 버튼 (2026-10-01)

모바일 학습 화면은 `100dvh` 안에 상단 헤더·카드·평가·하단 탐색을 배치한다. 정답에서 가나의 로마자와 근사 발음을 카드 내부에 함께 표시하며, 추가 발음 안내와 긴 예문·설명은 카드 안에서 펼쳐 읽는다. 평가는 네 버튼을 한 줄로 제공하고 각 버튼의 높이를 56px로 확보했다. 단어 카드의 개인 한글 보조 표시 설정은 유지한다.

컴포넌트 테스트에서 정답 전 근사 발음 숨김, 정답 후 카드 내부 표시, 카드 밖 평가 영역을 확인했다. 실제 브라우저에서 기본 `.btn` 스타일이 높이를 44px로 덮어쓰는 것을 실패 테스트로 확인하고 학습 버튼 스타일을 수정했다.

| 검증 | 실제 결과 |
| --- | --- |
| 프런트엔드 | 타입 검사·린트·Vitest 37개 통과 |
| 가나 모바일 화면 | 공개 HTTPS 주소의 실제 QA 계정으로 360×640, 390×844, 360×740에서 로그인·레슨 시작·정답·발음 안내 펼치기 확인. 문서 가로/세로 넘침 없음, 평가 영역과 하단 탐색 겹침 없음, 버튼 높이 56px 이상 |
| N5 모바일 화면 | 360×640에서 실제 가져온 단어 정답·추가 설명·기본 음성 조절을 표시한 상태에도 카드와 평가가 화면에 유지됨. 인증된 오디오 readyState ≥ 2 확인 |
| 브라우저 테스트 | `mobile-study.spec.ts` 4개 통과. API·콘텐츠·오디오 mock 없음. 평가 제출 없이 검증하여 학습 기록 변경 없음 |
| 배포 | Compose production build 및 재배포 성공. 공개 주소·Secure 쿠키·backend healthy 검사 통과 |
| 화면 확인 | 390×844 실제 브라우저 스크린샷 확인. 개인 데이터 디렉터리에만 저장 |

```sh
cd frontend
pnpm exec tsc --noEmit
pnpm lint
pnpm test
cd ..
docker compose up -d --build frontend
E2E_BASE_URL=https://kanalog.hanwook.me python3 tools/e2e/run_live.py e2e/mobile-study.spec.ts
python3 tools/e2e/check_deployment.py
```

Chromium 브라우저의 viewport 크기로 검증했으며 실제 휴대폰·iOS/Safari·음질 청취를 검증한 것으로 표시하지 않는다. 긴 카드 내용은 카드 내부 스크롤을 사용한다. 이번 변경은 화면 구성으로 DB 스키마와 학습 저장 로직을 변경하지 않는다.

## 음성 로딩·캐시·출처 표시 수정 (2026-10-01)

공개 도메인에서 모델 파일과 런타임은 접근 가능했고 최초 확인에서는 2.020136초 오디오가 생성됐다. 그러나 새 화면을 배포한 뒤에도 브라우저가 기존 `/tts/worker.js`의 옛 출처 문구를 계속 표시했다. 공개 응답의 `Cache-Control: public, max-age=14400`과 최신 서버 파일의 해시를 비교하여 브라우저가 이전 worker를 재사용하는 배포 문제를 확인했다.

- 빌드가 `worker.<코드 SHA-256 앞 16자리>.js`와 `src/tts-version.ts`를 함께 생성한다. 실제 공개 해시 경로의 파일이 로컬 번들과 일치함을 확인했다.
- 모델을 크기가 확인된 버퍼에 청크 단위로 받고 다운로드 용량·진행을 표시한다. 누락/크기 불일치/HTTP 오류는 추론 전에 차단한다.
- 생성 요청의 타임아웃을 전체 3분에서 마지막 진행 후 3분으로 바꿨다. 다운로드가 진행 중인 상황의 조기 종료를 fake clock 회귀 테스트로 재현한 뒤 수정했다.
- 모델 해시가 포함된 요청만 `public, max-age=31536000, immutable`로 캐시한다. 실제 공개 HTTP 헤더를 확인했다. 개인 콘텐츠/API 캐시 정책은 유지했다.
- 화면의 공급자·덱 이름·출처 문구를 제거하고 `학습 음성 (추천)`·`기본 음성`·`기기 음성`·`목소리`로 표시한다. 단어장의 원본/개인 편집 권한 판단은 유지한다.

수정 후 실제 내장 브라우저에서 공개 도메인의 새 worker가 일반적인 준비 문구를 표시하고, 2.020136초 오디오를 생성·재생 완료했다(currentTime=duration, readyState=4, error 없음). 생성 취소 버튼 이후 취소 안내와 paused 상태를 확인했고, 다시 요청했을 때 같은 길이의 오디오가 생성·재생됐다. 단어장 20개 항목의 출처 라벨이 없어졌고 설정 페이지 이탈 후 오디오 요소가 제거된 것도 확인했다. 실제 N5 학습 카드에서도 1.393197초 오디오의 생성·재생 완료와 출처 미표시를 확인했다. 브라우저 DOM의 실제 오디오 상태를 검사한 결과이며 WAV RMS/청취 품질·실기기 성능을 검증한 것으로 표시하지 않는다.

프런트엔드 36개 테스트, 타입 검사·린트·Docker production build를 통과했다. 백엔드 21개 및 변환기 8개 테스트도 통과했다. Compose로 현재 공개 도메인에 재배포했고 주소·Secure 쿠키·backend health 검사도 통과했다.

## 공개 도메인 로그인 복구 (2026-10-01)

현재 배포 주소는 `https://kanalog.hanwook.me`다. 해당 주소에서는 Codex 브라우저 접근이 허용되었다. 로그인 화면에서 전용 QA 계정으로 실패를 재현했고 `허용되지 않은 요청 출처입니다`가 표시됐다. 실행 중인 백엔드의 `PUBLIC_APP_URL=http://localhost:3200`, `COOKIE_SECURE=false`가 HTTPS 공개 주소와 불일치한 것이 원인이다. 비밀번호 문제가 아니며 Origin 검사를 제거하지 않았다.

`.env`와 Compose/예시 파일의 배포 주소를 `https://kanalog.hanwook.me`, HTTPS 쿠키 설정을 `true`로 맞추고 `docker compose up -d backend`로 컨테이너를 재생성했다. 기존 DB·미디어·계정·복습 기록은 유지했다.

| 검증 | 실제 결과 |
| --- | --- |
| 설정 회귀 검사 | `python3 tools/e2e/check_deployment.py`: 수정 전 주소 불일치로 실패, 수정 후 Compose/실행 컨테이너 주소·Secure 설정·health 모두 통과. 비밀값 출력 없음 |
| 브라우저 로그인 | 공개 도메인 로그인 → 실제 홈 화면 진입. 새로고침 후 로그인 유지 |
| 학습 저장 | 실제 QA N5 카드 정답 확인 → 보통 평가 → 다음 카드(1/20 → 2/20). 오늘 답변 3 → 4 증가 및 재로그인 후 4 유지 |
| MAX 음성 | 인증된 원본 MP3 재생. DOM 오디오 상태 duration/currentTime 1.26712초, readyState 4, error 없음, 재생 종료 확인. 청취 품질이나 새 Supertonic WAV 검증으로 간주하지 않음 |
| 로그아웃 | 로그인 화면 복귀. `/stats` 직접 진입도 로그인 화면으로 이동 |
| 잘못된 비밀번호 | 로그인 오류 안내 표시. 올바른 비밀번호로 재로그인 성공 |
| 커리큘럼 | 공개 도메인의 실제 코스 화면에서 6레벨·QA N5 진도·미확보 급수 표시 확인 |
| API 접근 통제 | 실제 공개 주소에 익명 `/api/me` 401, 외부 Origin 로그인 403 `BAD_ORIGIN` 확인 |
| Backend | JDK 21 `./gradlew test --rerun-tasks --no-daemon`: 21개 통과. `bootJar` 성공 |
| Frontend | 타입 검사·린트 통과. `pnpm test`: 28개 통과 |
| 변환기 | synthetic fixture 단위 테스트 8개 통과 |

브라우저 확인은 내장 브라우저로 수행했다. 별도 Playwright 전체 suite·360/390px·Supertonic 실제 WAV 합성은 이번 로그인 복구 검증에 포함하지 않았다. Python urllib의 공개 도메인 요청은 Cloudflare 403/1010으로 거부되어 그 클라이언트의 API suite를 통과로 표시하지 않았고, 차단을 우회하지 않았다. 공개 도메인의 브라우저와 허용된 curl 요청에서는 위 항목을 실제 확인했다.

```sh
docker compose up -d backend
python3 tools/e2e/check_deployment.py
curl -fsS https://kanalog.hanwook.me/api/health/ready
```

## 이전 레벨별 커리큘럼 변경의 확인

2026-10-01 후속 변경에서 Backend 21개(Builder 7, PostgreSQL 통합 9, FSRS 4, 날짜 1), Frontend 28개 테스트가 통과했다. 프런트 타입 검사·lint, Kotlin/Next.js Docker production build와 Compose 재배포가 성공했다.

`python3 tools/e2e/check_curriculum_api.py`로 현재 서버의 실제 QA 계정 로그인을 사용해 인증 필수, 6레벨 순서, 기존 모든 레슨 ID의 단일 연결, core 집계, 레벨 상세 응답, 없는 키 404를 확인했다. QA 계정은 왕초보 기본 92장·20레슨과 N5 878장·59레슨을 제공하고 N4~N1은 `available=false`다. 전체 개인 데이터의 목차는 `curriculum.md`에 기록했다.

재배포 전후 모든 UserCardState·ReviewLog 전체 행 해시와 카드·레슨 ID 목록 해시가 동일했다. 새로운 migration이나 학습 기록 초기화가 없다. 현재 backend는 healthy이고 readiness는 UP이다.

컴포넌트 테스트에서는 6레벨·현재 레슨·단원 접기/펼치기·완료·데이터 없음·홈의 이어서 학습·세션 완료 후 다음 단계·레벨 통계를 확인했다. 브라우저의 저장된 접근 차단으로 실제 화면 청취·모바일 크기·E2E 재실행은 계속 미확인이다. 기존 E2E는 새로운 레벨 경로와 접힌 단원 구조에 맞게 갱신했으나 통과로 표시하지 않는다. 아래는 이전 Supertonic 변경 시점의 검증 기록이다.

2026-10-01, Apple Silicon 개발 환경과 현재 로컬 Compose 기준이다. 실제 MAX 콘텐츠·음성·QA 비밀번호·백업은 `private-data` 또는 개인 volume에 두고 Git과 이미지에서 제외한다.

## 이번 변경에서 실행한 검증

| 항목 | 결과 |
| --- | --- |
| Backend | JDK 21 `./gradlew test --rerun-tasks --no-daemon` 성공. JUnit 13개 통과: FSRS 4, PostgreSQL 16 Testcontainers persistence 8, 날짜 경계 1 |
| 서버 도메인 검증 | 평가·재전송·payload 충돌·version 경쟁·신규 한도·소유권·코스 순서·제외 카드·재import 진도 유지·음성 설정 영속성/잘못된 엔진 및 목소리 차단 |
| Frontend | `pnpm test` 12개 통과. `pnpm exec tsc --noEmit`, `pnpm lint` 성공. 취소한 음성 요청의 늦은 응답 무시, worker 오류 재시도, 일본어 읽기 선택, 예문 듣기 가능 여부, 코스 추천, 탐색 접근성, 설치 앱 색상, ONNX 런타임 파일 포함 검증 |
| Production build | Compose의 Kotlin `bootJar` 및 Next.js production build 성공. 최신 backend/frontend 이미지 재배포 |
| 변환기 | `python3 -m unittest discover -s tools/deck-import -p 'test_*.py' -v` 8개 통과. ZIP 경로 탈출·누락 필드/미디어·스크립트 제거·미지원 스키마 포함 |
| 실제 MAX 변환 | `verify_conversion.py private-data/converted/n5`: 878장(어휘 779, 문법 99), 음성 1,795개. 전체 변환 10,237장(어휘 9,159, 문법 1,078), 음성 레코드 20,157개. 급수별 수는 `data-sources.md` |
| 실제 재import | 전용 QA 계정의 N5를 관리 CLI로 재import. 카드 건수, UserCardState 전체 행 및 ReviewLog 전체 행의 해시가 실행 전후 동일 |
| Supertonic 모델 | 공식 고정 revision `aafc6e32416a594460b32413efc49d7fe4ce6d46`, 401,276,744 bytes 확보. 다운로드 도구가 파일 크기와 제공된 LFS SHA-256을 확인. 로컬 manifest에 각 파일 해시 기록 |
| ONNX 런타임 수정 | 초기 브라우저 테스트에서 ORT 1.30이 요구하는 `asyncify.mjs/.wasm` 누락으로 초기화 실패. 실패 회귀 테스트를 만든 뒤 worker 번들에서 실제 런타임 이름을 추출해 복사하도록 수정. 회귀 테스트 통과. 재배포 후 worker·해당 mjs/wasm·모델 manifest의 HTTP 200 확인 |
| 현재 서버 | `docker compose config --quiet` 성공. backend healthy, `/api/health/ready` UP, `/login` 200. PostgreSQL 16 `infra-postgres`의 Kanalog 전용 DB/역할 사용, Flyway V1~V6 적용 |
| DB·미디어 복원 | 같은 앱 중단 시점의 DB dump와 media tar를 별도 테스트 DB·volume에 복원. UserCardState·ReviewLog·설정의 전체 행 해시 및 21,950개 실제 미디어 파일 SHA-256 목록 일치. 임시 테스트 대상 제거 |
| 재시작 지속성 | 앱 중단·재시작 뒤 기존 학습 상태·복습 로그·설정 해시 유지 |
| 데이터 분리 | 실제 개인 계정 MAX 10,237장과 QA 계정 N5 878장을 분리. 각 계정에 가타카나 104장·히라가나 104장 생성. 앱 포트 `127.0.0.1:3200`, 개인 미디어 volume 유지 |

## 이전 브라우저 검증과 최종 미실행 범위

권한 설정 변경 전 전용 QA 계정으로 기존 Playwright 학습 흐름 5개와 MAX 오디오 테스트를 통과했다. 로그인·평가 저장·통계·로그아웃 권한·설정 재로그인·360/390px 가로 넘침·MP3 비무음 디코딩·재생 시간 증가·range 206·로그아웃 후 media 401을 확인했다. 해당 결과를 마지막 재배포 뒤 재실행한 것으로 간주하지 않는다.

새 코스 E2E는 복습 우선 큐에서 고유 카드 증가를 잘못 가정해 실패했다. 신규 카드까지 평가하도록 테스트를 수정했으나 최종 재실행은 못 했다. Supertonic 브라우저 E2E 역시 런타임 누락 수정 후 실제 WAV 생성/재생을 다시 확인하지 못했다.

사용자가 전체 접근을 허용한 뒤에도 브라우저 도구는 **저장된 사용자 설정이 `localhost:3200` 접근을 차단한다**고 거부했다. 우회 브라우저나 별도 자동화로 이 차단을 피하지 않았다. 따라서 Supertonic 실제 합성 재생·취소·최종 코스 UI 검증은 미완료다. 모델 확보나 파일 HTTP 200만으로 이를 통과로 표시하지 않는다. 실제 휴대폰·태블릿 청취 품질, iOS/Safari PWA 설치, 다른 CPU 플랫폼은 검증하지 않았다.

## 재현 명령

```sh
cd backend
./gradlew test --rerun-tasks --no-daemon
cd ../frontend
pnpm test
pnpm exec tsc --noEmit
pnpm lint
cd ..
python3 -m unittest discover -s tools/deck-import -p 'test_*.py' -v
docker compose up -d --build
curl -fsS http://localhost:3200/api/health/ready
```

브라우저의 저장된 차단 설정이 해제된 테스트 환경에서는 다음을 실행한다. QA 계정은 무작위 비밀번호를 `private-data/e2e/account.json`에 권한 0600으로 저장하며 공개하지 않는다. provision은 실제 개인 계정의 진도를 바꾸지 않는다.

```sh
python3 tools/e2e/provision.py
python3 tools/e2e/run_live.py
```

코스 테스트는 남은 신규 카드와 일일 한도가 필요하다. QA 계정은 반복 검증을 위해 하루 한도를 100장으로 설정한다. Supertonic 테스트는 실제 모델을 읽어 WAV 비무음·재생 시간 진행·페이지 이탈 정리를 확인한다. 고정 응답이나 mock 오디오를 성공으로 사용하지 않는다.
