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
# 기존 Docker 네트워크 `infra-backend`에 `infra-postgres`가 실행 중이어야 한다.
# PostgreSQL 관리자 권한으로 `kanalog` DB와 `kanalog` 로그인 역할을 한 번 생성한다.
docker compose up -d --build
curl -fsS http://localhost:3200/api/health/ready
```

기본 공개 주소는 `http://localhost:3200`이다. Dutchlog 프런트엔드의 기본 개발 포트 3000과 분리했다. Kanalog Compose는 DB 컨테이너를 새로 만들거나 DB 포트를 추가 공개하지 않는다. 기존 PostgreSQL의 포트 공개 범위는 기존 인프라 설정을 따른다. Kotlin API는 Compose 내부에만 연결한다. Docker가 없을 때는 `backend/gradlew bootRun`을 실행하고 `cd frontend && pnpm install --frozen-lockfile && pnpm dev --port 3200`으로 프런트엔드를 실행한다. 이때 `RDB_HOST`, `RDB_USER=kanalog`, `RDB_PASSWORD`, `PUBLIC_APP_URL=http://localhost:3200`, `BACKEND_API_URL=http://localhost:8080`을 실제 환경에 맞게 설정한다.

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

로그인 후 덱에서 N5 어휘를 선택하고 학습을 시작한다. Space로 정답을 확인하고 1~4로 다시·어려움·보통·쉬움을 평가할 수 있다. 카드 평가가 서버에 저장된 뒤에 다음 카드로 넘어간다. 설정에서 하루 새 카드 수, 가나 힌트, 한글 발음 보조, 자동재생과 재생 속도를 조절한다. 한글 발음 보조는 [근사 표기 규칙](docs/hangul-hints.md)을 따르며 기본값이 꺼져 있다. MAX 원본에는 이 필드가 없어 자동 생성하지 않으며 개인이 입력하거나 검토된 값만 표시한다. 원본 음성이 없을 때 브라우저 일본어 TTS는 선택적으로만 사용한다.

## 환경변수

| 변수 | 사용처 | 설명 |
| --- | --- | --- |
| `RDB_HOST` | 백엔드 | Compose에서는 `infra-postgres`를 사용. 로컬 `bootRun`에서는 `localhost` 사용 |
| `RDB_PASSWORD` | DB·백엔드 | 기존 PostgreSQL에 만든 Kanalog 전용 역할의 비밀번호 |
| `PUBLIC_APP_URL` | 백엔드 | 브라우저가 사용하는 정확한 주소. Origin 확인 기준 |
| `COOKIE_SECURE` | 백엔드 | HTTPS 운영이면 `true` |
| `APP_BIND_IP`, `APP_PORT` | 프런트엔드 | 기본 `127.0.0.1:3200` |
| `BACKEND_API_URL` | 프런트엔드 내부 | Compose가 `http://backend:8080`으로 설정 |
| `MEDIA_ROOT` | 백엔드 내부 | Compose가 `/app/media`로 설정 |

HTTPS로 운영할 때 기존 nginx·Caddy·Cloudflare에서 프런트엔드의 localhost 포트로 전달하고 `PUBLIC_APP_URL`을 최종 HTTPS 주소로 맞춘다. 쿠키와 Origin 검사 때문에 브라우저 주소와 설정이 일치해야 한다. 역방향 프록시 예시는 [운영 문서](docs/operations.md)에 있다. 기존 인증서와 프록시는 자동 변경하지 않는다.

## 개발 확인

```sh
cd backend && ./gradlew test bootJar
cd ../frontend && pnpm install --frozen-lockfile && pnpm exec tsc --noEmit && pnpm lint && pnpm test && pnpm build
```

서버 시작 시 Flyway 마이그레이션을 적용한다. Hibernate는 스키마를 자동 생성하거나 삭제하지 않는다. 상태 확인은 `/api/health/live`와 `/api/health/ready`를 구분한다. Docker 명령, 업데이트, PostgreSQL과 미디어의 함께 백업·복원은 [운영 문서](docs/operations.md)에 있다.

## 라이선스와 데이터

JLPT MAX는 개인 학습용으로만 내려받아 가져온다. 공개 다운로드가 콘텐츠 재판매·재배포 허락을 뜻하지 않는다. 덱 본문과 음성을 Git, 공개 이미지, 공용 CDN에 넣지 않는다. 앱 자체 코드의 공개 라이선스는 정하지 않았다. 외부 코드·글꼴·데이터 권리는 [고지](THIRD_PARTY_NOTICES.md)를 확인한다.
