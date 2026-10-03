# 일본어 학습

JLPT MAX 덱을 개인 계정으로 가져와 단어와 문법을 복습하는 자체 호스팅 웹앱이다. 백엔드는 Kotlin·Spring Boot, 프런트엔드는 TypeScript·Next.js, 저장소는 PostgreSQL이다. 공식 덱의 원본·추출 데이터·음성은 저장소와 배포 이미지에 포함하지 않는다.

## 준비

- Docker Engine 및 Docker Compose plugin. 로컬 개발은 Java 21, Python 3.9 이상, Node.js 22와 pnpm 11.9.0도 사용한다.
- JLPT MAX v2.1.2 APKG를 받을 약 1.2 GB의 공간과 변환·음성을 위한 추가 여유 공간. 현재 검증한 크기와 SHA-256은 [데이터 출처](docs/data-sources.md)에 있다.
- 기존 PostgreSQL 서버를 사용하되, Kanalog 전용 `kanalog` 데이터베이스와 `kanalog` 로그인 역할을 분리해 사용한다. Dutchlog의 DB, 사용자, 토큰은 공유하지 않는다.

## 빠른 시작

```sh
test -f .env || cp .env.example .env
mkdir -p private-data/converted
python3 tools/tts/download.py
# 기존 Docker 네트워크 `infra-backend`에 `infra-postgres`가 실행 중이어야 한다.
# PostgreSQL 관리자 권한으로 `kanalog` DB와 `kanalog` 로그인 역할을 한 번 생성한다.
docker compose up -d --build
curl -fsS http://localhost:3200/api/health/ready
```

현재 배포 주소는 `https://kanalog.hanwook.me`이며 기존 프록시가 `127.0.0.1:3200`으로 전달한다. `.env.example`과 Compose 기본값도 이 HTTPS 주소 및 Secure 쿠키에 맞췄다. 브라우저에서 직접 로컬 HTTP로 개발할 때는 `.env`의 `PUBLIC_APP_URL=http://localhost:3200`, `COOKIE_SECURE=false`로 함께 변경하고 컨테이너를 재생성한다. Dutchlog 프런트엔드의 기본 개발 포트 3000과 분리했다. Kanalog Compose는 DB 컨테이너를 새로 만들거나 DB 포트를 추가 공개하지 않는다. 기존 PostgreSQL의 포트 공개 범위는 기존 인프라 설정을 따른다. Kotlin API는 Compose 내부에만 연결한다. Docker가 없을 때는 `backend/gradlew bootRun`을 실행하고 `cd frontend && pnpm install --frozen-lockfile && pnpm dev --port 3200`으로 프런트엔드를 실행한다. 이때 `RDB_HOST`, `RDB_USER=kanalog`, `RDB_PASSWORD`, `PUBLIC_APP_URL=http://localhost:3200`, `COOKIE_SECURE=false`, `BACKEND_API_URL=http://localhost:8080`을 실제 환경에 맞게 설정한다.

### 초기 계정과 개인 덱

공개 회원가입은 없다. 컨테이너의 관리자 CLI로 계정을 만든다. 대화형 터미널에서 비밀번호를 숨김 입력으로 제공한다. 비밀번호는 명령 인자에 넣지 않는다. 초기 비밀번호는 코드와 문서에 고정하지 않는다.

```sh
docker compose run --rm backend \
  --spring.main.web-application-type=none \
  --app.cli=create-user --app.email=USER@example.com
# 나중에 비밀번호를 바꿀 때
docker compose run --rm backend \
  --spring.main.web-application-type=none \
  --app.cli=reset-password --app.email=USER@example.com
```

명령은 DB가 준비된 상태에서 실행한다. 셸의 대화형 입력이 어려우면 CLI의 안전한 stdin 입력을 사용한다.

공식 APKG의 다운로드·변환은 서비스 컨테이너 밖에서 수행한다. 다운로드는 공식 공개 릴리스에서 개인 저장 영역으로 진행하며 이미지 빌드에는 영향을 주지 않는다.

```sh
mkdir -p private-data/downloads private-data/converted/n5
python3 tools/deck-import/download_max.py private-data/downloads
python3 tools/deck-import/convert_max.py \
  private-data/downloads/JLPT-MAX-Deck-2.1.2.apkg \
  private-data/converted/n5 --scope n5
python3 tools/deck-import/verify_conversion.py private-data/converted/n5
```

변환 결과는 개인 파일이며 `private-data/converted`가 backend 컨테이너의 `/app/import`에 읽기 전용으로 연결된다. DB import는 다음 명령으로 실행한다. `--app.input-dir`는 호스트 경로가 아닌 컨테이너 내부 경로다.

```sh
docker compose run --rm backend \
  --spring.main.web-application-type=none \
  --app.cli=import-max --app.email=USER@example.com \
  --app.input-dir=/app/import/n5
```

같은 원본을 재실행해도 기존 복습 진도는 유지하도록 설계한다. 변환 형식과 미지원 유형은 [가져오기 형식](docs/import-format.md)을 참고한다.

## 학습

로그인 후 왕초보 → 입문(N5) → 초급(N4) → 중급(N3) → 중고급(N2) → 고급(N1)의 레벨별 단원과 레슨을 따라 학습한다. 왕초보는 히라가나 기본 46자부터 가타카나 기본 46자로 이어지며 탁음·반탁음·요음은 선택 확장이다. 각 급수에서는 실제 가져온 단어와 문법 레슨을 번갈아 연습한다. 현재 단원은 펼쳐 표시하고 다른 단원은 목차로 접는다. [전체 커리큘럼과 실제 데이터 기준 목차](docs/curriculum.md)를 참고한다.

왕초보 화면의 **가나 섞어 연습**에서 히라가나·가타카나·둘 다를 선택하고 포함할 기본·탁음·반탁음·요음만 고른다. 장수나 연습 방식 선택 없이 해당 범위를 모두 연습한다. 기본 히라가나 46개부터 두 문자 체계의 모든 분류 208개까지 하루 한도·복습 시각 제한 없이 포함한다(명시적으로 제외한 문자는 빠짐). 답변과 최근 평가를 저장하며 가나 코스 진도와 다음 연습 순서에 반영한다. 기존 FSRS 복습 일정은 유지한다. 완료 뒤 다시 섞어 연습으로 반복할 수 있다.

Space로 정답을 확인하고 1~4로 다시·어려움·보통·쉬움을 평가한다. 서버 저장 후 다음 카드로 넘어가며 홈·단원 진도·다음 학습도 갱신한다. 첫 연습을 마친 상태를 장기 암기 완료로 표시하지 않는다. 기존 카드와 MAX 학습 기록은 유지된다.

설정에서 하루 새 카드 수, 힌트, 자동재생·속도와 음성 재생 방식을 조절한다. 화면의 `학습 음성 (추천)`은 Supertonic 3다. iPhone·iPad는 인증된 API로 서버에서 생성한 작은 WAV만 받아 재생하며 휴대폰에 모델을 내려받지 않는다. 같은 모델·목소리를 사용하고 최근 계산 결과를 제한된 서버 메모리 캐시로 재사용한다. 다른 기기는 기존 브라우저 모드를 사용하며 처음 음성을 사용할 때 약 401MB의 모델을 불러온다. 다운로드 용량을 표시하고 실제 진행이 있는 동안 준비 작업을 유지한다. 파일 해시를 포함한 주소로 모델을 캐시하며 코드 해시가 포함된 worker 파일 이름으로 이전 배포의 코드가 재사용되지 않도록 한다. 10개 목소리를 미리 들어 선택할 수 있다. 학습 카드의 `기본 음성 듣기` 버튼으로 가져온 음성을 재생한다. 기기 음성은 해당 기기의 일본어 음성이 있을 때만 사용할 수 있다. 한글 보조는 [근사 표기 규칙](docs/hangul-hints.md)을 따르며 기본값은 꺼져 있다.

모바일 상단의 회전 화살표 또는 데스크톱 메뉴의 `새로고침`으로 현재 화면을 다시 연다. 저장 완료된 진도와 계정 설정은 유지한다. 자동재생 설정이 켜져 있어도 앱을 다시 열거나 새로고침한 직후 브라우저가 소리를 차단할 수 있다. 이때 카드의 `자동재생 시작`을 누르면 이미 준비된 음성을 새로 생성하지 않고 재생한다. 자동재생 설정이 꺼진 수동 듣기는 같은 위치에 `준비된 음성 재생`을 표시한다. 긴 설명과 음성 조절은 카드 안에서 스크롤하며 평가 버튼은 화면에 유지한다.

모델 다운로드/로컬 개발 연결은 다음 명령을 사용한다. 모델 파일은 Git과 이미지에서 제외되며 Compose가 읽기 전용으로 연결한다.

```sh
python3 tools/tts/download.py
mkdir -p frontend/public/tts
ln -s ../../../private-data/supertonic/models frontend/public/tts/supertonic
# pnpm dev/build가 worker와 일치하는 WASM runtime을 자동 생성한다.
```

Docker 없이 `bootRun`으로 개발할 때 iPhone/iPad 음성은 다음 내부 계산 프로세스도 실행한다. 먼저 위 명령으로 모델을 준비한다. 이 프로세스는 회원·DB·학습 API를 제공하지 않는다. 운영 Compose는 8090 포트를 외부에 공개하지 않는다.

```sh
cd tools/voice-server
ONNXRUNTIME_NODE_INSTALL=skip npm ci
npm run build
npm start
```

전용 QA 계정으로 실제 서버 테스트를 실행할 수 있다. 비밀번호는 Git에 없는 권한 0600 파일에 저장하며 출력하지 않는다. 공개 도메인 배포 설정은 `python3 tools/e2e/check_deployment.py`로 검사한다. 로컬 HTTP 테스트라면 위의 로컬 개발 설정으로 전환한 후 실행한다. `provision.py`/`run_live.py`는 `E2E_BASE_URL`로 접속 주소를 선택할 수 있으며 외부 프록시가 해당 테스트 클라이언트의 요청을 허용해야 한다.

```sh
python3 tools/e2e/provision.py
python3 tools/e2e/run_live.py
```

## 환경변수

| 변수 | 사용처 | 설명 |
| --- | --- | --- |
| `RDB_HOST` | 백엔드 | Compose에서는 `infra-postgres`를 사용. 로컬 `bootRun`에서는 `localhost` 사용 |
| `RDB_PASSWORD` | DB·백엔드 | 기존 PostgreSQL에 만든 Kanalog 전용 역할의 비밀번호 |
| `PUBLIC_APP_URL` | 백엔드 | 브라우저가 사용하는 정확한 주소. Origin 확인 기준 |
| `COOKIE_SECURE` | 백엔드 | HTTPS 운영이면 `true` |
| `APP_BIND_IP`, `APP_PORT` | 프런트엔드 | 기본 `127.0.0.1:3200` |
| `BACKEND_API_URL` | 프런트엔드 내부 | Compose가 `http://backend:8080`으로 설정 |
| `SPEECH_URL` | 백엔드 내부 | Compose는 `http://voice:8090`. 로컬 개발 기본값 `http://127.0.0.1:8090` |
| `MEDIA_ROOT` | 백엔드 내부 | Compose가 `/app/media`로 설정 |

HTTPS로 운영할 때 기존 nginx·Caddy·Cloudflare에서 프런트엔드의 localhost 포트로 전달하고 `PUBLIC_APP_URL`을 최종 HTTPS 주소로 맞춘다. 쿠키와 Origin 검사 때문에 브라우저 주소와 설정이 일치해야 한다. 역방향 프록시 예시는 [운영 문서](docs/operations.md)에 있다. 기존 인증서와 프록시는 자동 변경하지 않는다.

## 개발 확인

백엔드는 기능별 `domain/application/infrastructure/presentation` 구조다. 도메인 정책은 순수 Kotlin, 트랜잭션은 application 서비스, JDBC/JPA·FSRS·파일·HTTP 구현은 infrastructure에 둔다. 변경할 때 [구조와 의존 규칙](docs/architecture.md#백엔드-패키지와-의존-방향), [Dutchlog 참고 규칙](docs/dutchlog-reference.md), `CODERULE.md`를 따른다. Gradle 테스트에 계층 의존성 검사와 PostgreSQL/실제 HTTP 회귀 테스트가 포함된다.

```sh
cd backend
./gradlew ktlintFormat          # Kotlin 소스·테스트·Gradle 스크립트 자동 포맷
./gradlew ktlintCheck check bootJar
# check에도 ktlintCheck가 포함되며, 형식 위반은 빌드 실패로 처리한다.
cd ../frontend && pnpm install --frozen-lockfile && pnpm exec tsc --noEmit && pnpm lint && pnpm test && pnpm build
```

서버 시작 시 Flyway 마이그레이션을 적용한다. Hibernate는 스키마를 자동 생성하거나 삭제하지 않는다. 상태 확인은 `/api/health/live`와 `/api/health/ready`를 구분한다. Docker 명령, 업데이트, PostgreSQL과 미디어의 함께 백업·복원은 [운영 문서](docs/operations.md)에 있다.

## 라이선스와 데이터

JLPT MAX는 개인 학습용으로만 내려받아 가져온다. 공개 다운로드가 콘텐츠 재판매·재배포 허락을 뜻하지 않는다. 덱 본문과 음성을 Git, 공개 이미지, 공용 CDN에 넣지 않는다. 앱 자체 코드의 공개 라이선스는 정하지 않았다. 외부 코드·글꼴·데이터 권리는 [고지](THIRD_PARTY_NOTICES.md)를 확인한다.

### 가나 연습

왕초보에서 히라가나·가타카나 중 하나를 열고 기본/탁음/반탁음/요음을 선택합니다. 행별 레슨과 장수 제한 없이 선택 범위를 모두 연습합니다. 두 종류를 함께 하려면 ‘가나 섞어 연습’을 이용합니다. ‘다시·어려움’ 평가를 저장하면 다음 연습에서 먼저 나오고, 같은 평가 내에서는 순서를 섞습니다. 가나 첫 연습 진도에도 반영되며 기존 FSRS 복습 기록은 보존됩니다.
