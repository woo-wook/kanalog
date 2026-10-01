# 검증 기록

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
