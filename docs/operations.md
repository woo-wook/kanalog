# 자체 서버 운영

## 처음 설치

```sh
test -f .env || cp .env.example .env
mkdir -p private-data/converted
python3 tools/tts/download.py
# RDB_PASSWORD를 강한 임의 비밀번호로 설정한다.
# 최초 1회 기존 infra-postgres 서버에 전용 DB와 로그인 역할을 만든다.
docker compose up -d --build
docker compose ps
curl -fsS http://localhost:3200/api/health/live
curl -fsS http://localhost:3200/api/health/ready
```

기존 Docker 네트워크 `infra-backend`의 PostgreSQL 16 서버 `infra-postgres`를 사용한다. `.env`의 `RDB_PASSWORD`와 동일한 비밀번호로 Kanalog 전용 역할과 데이터베이스를 한 번 만든다.

```sh
set -a
. ./.env
set +a
docker exec -i infra-postgres sh -lc 'PGPASSWORD="$POSTGRES_PASSWORD" psql -h 127.0.0.1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1' <<SQL
CREATE ROLE kanalog LOGIN PASSWORD '$RDB_PASSWORD';
SQL
docker exec infra-postgres sh -lc 'PGPASSWORD="$POSTGRES_PASSWORD" createdb -h 127.0.0.1 -U "$POSTGRES_USER" -O kanalog kanalog'
unset RDB_PASSWORD
```

기본 앱 포트는 호스트의 `127.0.0.1:3200`이다. Kanalog는 Dutchlog와 PostgreSQL 서버를 공유하지만 데이터베이스와 로그인 역할은 분리한다. DB 포트는 기존 인프라 정책을 따른다. 앱은 `infra-backend` 네트워크에서 DB에 접속한다. 개인 음성은 Kanalog 전용 `kanalog_media` 볼륨에 저장된다. `docker compose down`은 이 볼륨을 삭제하지 않는다. `docker compose down -v`는 이를 삭제하므로 일반 운영 절차에 사용하지 않는다. Flyway는 Kanalog 데이터베이스에만 스키마를 적용한다.

APKG는 `private-data/downloads`, JSONL은 `private-data/converted`에 두고 Git·이미지에서 제외한다. 백엔드는 변환 결과를 `/app/import`에서 읽고 등록된 개인 음성만 `/app/media`에 저장한다. 계정 생성·import 명령은 README의 CLI 절을 따른다. Compose 안에서 import 입력 경로는 `/app/import/n5`다.

## 기존 프록시에 연결

기존 TLS 종료 프록시에서 `127.0.0.1:3200`으로 HTTP를 전달한다. 예를 들어 nginx를 쓰는 경우 다음 별도 설정 조각을 기존 서버 구성에 맞게 적용할 수 있다. 이 저장소의 Compose는 인증서나 기존 프록시를 변경하지 않는다.

```nginx
location / {
    proxy_pass http://127.0.0.1:3200;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
}
```

현재 배포의 `.env`는 `PUBLIC_APP_URL=https://kanalog.hanwook.me`, `COOKIE_SECURE=true`다. 다른 서버에 설치할 때는 실제 브라우저 주소로 바꾼다. 다른 도메인·포트에서 직접 로그인하면 Origin 검사로 거부된다. HTTPS용 Secure 쿠키는 로컬 HTTP 개발과 함께 사용할 수 없으므로 로컬 개발에서는 두 설정을 각각 `http://localhost:3200`, `false`로 바꾼다. `APP_BIND_IP=0.0.0.0`은 외부 포트를 직접 열어야 할 때에만 사용한다. HTTPS 공개 환경에서는 프록시의 TLS 설정을 먼저 완료한다.

환경변수를 수정한 후에는 `restart`가 아니라 컨테이너 재생성이 필요하다. 다음 검사는 Compose 설정과 실행 중인 컨테이너 모두를 확인하며 DB 비밀번호나 세션을 출력하지 않는다.

```sh
docker compose up -d backend
# backend가 healthy 상태가 된 후
python3 tools/e2e/check_deployment.py
# 로컬 HTTP 개발 설정을 검사할 때
E2E_BASE_URL=http://localhost:3200 python3 tools/e2e/check_deployment.py
```

사용자 설정에서 시간대를 바꾸면 저장된 UTC 복습 시각은 유지되고, 오늘 새 카드 한도와 연속 학습일·7일·30일 통계는 새 시간대의 날짜 경계로 바로 다시 계산된다.

## 일반 재시작과 업데이트

### 기존 문법 강조 정보 갱신

2026-10-02 문법 강조 업데이트에는 DB migration이 없다. 같은 공식 APKG를 기존 계정의 import 범위로 다시 변환한 후 `refresh-grammar-focus` 명령으로 원본 강조 정보만 갱신한다. 상세 변환 명령과 계약은 [가져오기 형식](import-format.md)을 참고한다. 기존 학습 기록은 초기화하지 않는다.

```sh
docker compose build backend frontend
# 아래 DB 백업 절차에 따라 갱신 전 dump 보관
docker compose run --rm --no-deps -T backend \
  --spring.main.web-application-type=none \
  --app.cli=refresh-grammar-focus --app.email=YOUR_EMAIL \
  --app.input-dir=/app/import/n5
docker compose up -d --no-deps backend frontend
python3 tools/e2e/check_deployment.py
```

모든 문법을 import한 계정에는 전체 변환 디렉터리(`/app/import/all`)를 사용한다. 원본 출처·GUID·질문·정답이 기존 콘텐츠와 다르면 갱신하지 않고 실패한다. 미디어 volume과 내부 음성 서비스는 변경하지 않는다.

```sh
docker compose restart
docker compose ps
```

업데이트 전 DB와 미디어를 함께 백업한다. 소스·환경 파일을 갱신한 후 다음을 실행한다.

```sh
docker compose up -d --build
docker compose ps
curl -fsS http://localhost:3200/api/health/ready
```

Flyway migration 실패나 DB 준비 실패 시 `docker compose logs --tail=100 backend`와 `infra-postgres` 상태를 확인한다. 사용자 비밀번호, 세션 쿠키, 개인 단어 본문은 로그나 지원 요청에 붙이지 않는다.

## DB와 미디어를 함께 백업

복습 로그가 DB에, 음성이 별도 볼륨에 있으므로 두 자료를 같은 중단 시점에 백업한다. 아래 명령은 저장소 루트에서 실행한다.

```sh
mkdir -p private-data/backups
docker compose stop frontend backend
docker exec infra-postgres sh -lc 'PGPASSWORD="$POSTGRES_PASSWORD" pg_dump -h 127.0.0.1 -U "$POSTGRES_USER" -d kanalog -Fc' > private-data/backups/kanalog.dump
docker compose run --rm --no-deps -T --entrypoint sh backend -c 'tar -C /app/media -cf - .' > private-data/backups/media.tar
docker compose up -d backend frontend
```

`private-data/backups`는 Git과 이미지에서 제외된다. 백업 파일에 개인 콘텐츠와 계정 정보가 들어 있으므로 서버 밖의 암호화된 저장소에 접근을 제한해 보관한다. 덤프와 `media.tar`는 한 쌍이다. `private-data/downloads`의 APKG와 `private-data/converted`의 변환 결과는 이 두 파일에 들어 있지 않으므로 재import에 대비하려면 별도로 보관한다.

## 복원

기존 데이터를 대체하는 작업이므로 실제 운영 서버에서 실행할 때에는 대상 DB와 백업 시점을 먼저 확인한다. 테스트 환경에서는 별도 Compose 프로젝트 이름과 별도 볼륨을 사용한다. 복원 중 앱 쓰기를 멈춘다.

```sh
docker compose stop frontend backend
docker exec -i infra-postgres sh -lc 'PGPASSWORD="$POSTGRES_PASSWORD" pg_restore -h 127.0.0.1 -U "$POSTGRES_USER" -d kanalog --clean --if-exists --no-owner --no-privileges --single-transaction --exit-on-error' < private-data/backups/kanalog.dump
docker compose run --rm --no-deps -T --entrypoint sh backend -c 'tar -C /app/media -xf -' < private-data/backups/media.tar
docker compose up -d backend frontend
curl -fsS http://localhost:3200/api/health/ready
```

복원 후 이전에 평가했던 카드의 통계와 음성 재생을 확인한다. DB 사용자/비밀번호는 현재 `.env`와 일치해야 한다. 테스트 복원에서는 원래 운영 볼륨을 사용하지 않는다.

## 장애 확인

- `/api/health/live` 실패: 프런트엔드 또는 백엔드 프로세스와 프록시 경로를 확인한다.
- `/api/health/ready` 실패: `infra-postgres` health, `infra-backend` 네트워크 연결, Kanalog 역할/DB 접속 설정, Flyway 오류를 확인한다.
- 401: 로그인 상태를 다시 확인한다. 403: `PUBLIC_APP_URL`, Origin, `COOKIE_SECURE`, CSRF 헤더를 확인한다.
- 음성만 실패: 사용자별 미디어 DB 레코드와 `kanalog_media` 볼륨을 함께 확인한다. 볼륨을 공개 정적 디렉터리로 연결하지 않는다.
- import 실패: `private-data/converted/.../report.json`과 import 작업 상태를 확인한다. 원문 전체를 로그로 출력하지 않는다.

## 이 작업 환경의 검증 범위

Kanalog는 기존 `infra-postgres` 서버 안의 전용 `kanalog` 데이터베이스와 앱 역할을 사용한다. `.env`는 Git에서 제외되고 권한 `0600`으로 관리한다. 앱 포트는 `127.0.0.1:3200`; Kanalog Compose는 DB 포트를 공개하지 않는다. PostgreSQL 연결과 Flyway V1~V6 적용을 확인했다.

앱 쓰기를 중단한 같은 시점에 DB와 개인 미디어를 백업했다. 별도 테스트 DB·볼륨에 복원해 UserCardState·ReviewLog·설정의 전체 행 해시와 미디어 21,950개 파일의 SHA-256 목록이 일치함을 확인했다. 앱 재시작 후 학습 기록도 유지됐다. 검증에 사용한 임시 DB·볼륨만 제거했고 원래 DB·미디어 볼륨은 유지했다. 로컬 백업은 `private-data/backups`의 권한 `0600` 파일이며 Git에서 제외된다.

Supertonic 모델은 `private-data/supertonic/models`를 프런트엔드에 읽기 전용으로 연결한다. 모델을 다시 받을 때 `python3 tools/tts/download.py`로 고정 revision과 해시를 확인한다. 코드 업데이트 뒤 `docker compose up -d --build`를 실행하면 worker와 해당 ONNX 버전의 WASM 파일을 함께 생성한다. 모델은 배포 이미지에 포함하지 않는다.

음성 worker는 `worker.<코드 해시>.js`로 생성하며 빌드 도구가 `src/tts-version.ts`를 함께 갱신한다. 새 배포는 새로운 worker 파일을 사용하므로 브라우저·프록시가 이전 `worker.js`를 캐시해도 새 코드에 연결된다. 모델 요청의 `v` 파라미터는 다운로드 manifest의 파일 해시다. 이 요청만 장기 캐시하며 개인 `/api`와 `/media` 응답은 캐시하지 않는다. 모델 크기와 다운로드 완료 여부를 확인한 후 추론을 시작한다.


## iPhone/iPad 음성 계산

`voice` 컨테이너는 같은 고정 Supertonic 모델을 CPU로 실행하며 프런트와 함께 `private-data/supertonic/models`를 읽기 전용으로 연결한다. 초기 모델 해시 확인·세션 로딩 후 health가 UP이 되면 백엔드를 시작한다. 메모리 상한 2GiB·CPU 2개이며 호스트 포트를 열지 않는다. DB 역할·계정·미디어 volume 설정은 변경하지 않는다. 현재 Apple Silicon/Linux arm64 Compose에서 빌드·실행을 확인했으며 다른 플랫폼은 이번에 실행하지 않았다.

```sh
docker compose up -d --build
docker compose ps
# 휴대폰 음성만 실패하면
docker compose logs --tail=50 voice
docker stats --no-stream kanalog-voice-1
# 모델을 다시 다운로드한 경우 재초기화
docker compose restart voice
```

voice는 manifest 누락·크기/해시 불일치 시 준비 완료로 표시하지 않는다. 기존 기본 음성·학습 진도는 음성 계산과 독립적이며, 계산 실패 시 휴대폰에서 대형 모델을 다시 받지 않고 재시도 오류를 표시한다. 생성 WAV 캐시는 RAM에만 있으므로 별도 백업 대상이 아니며 기존 DB·MAX 미디어 백업 절차는 유지한다. 모델은 서버가 재시작해도 디스크에서 읽고 휴대폰으로 전송하지 않는다. 공개 TTS 모델 URL은 다른 기기의 기존 브라우저 모드를 위해 유지한다.


## 가나 혼합 세션 업데이트

V7은 혼합 세션의 표시 이름·자유 연습 모드·`practice_answer` 표를 추가한다. 기존 카드와 ReviewLog/UserCardState를 초기화하지 않는다. 적용 전 DB dump를 보관하고 `docker compose up -d --build` 후 backend healthy와 왕초보 화면의 히라가나 우선 순서, 섞어 연습을 확인한다. 표는 기존 PostgreSQL DB 안에 있으며 기존 `pg_dump` 백업에 자동 포함된다. 자유 연습은 ReviewLog와 분리되어 기존 복습 통계에 포함되지 않는다.

### 후리가나·한글 발음 보조 갱신

V11은 사용자별 `show_furigana` 열 하나를 기본 true로 추가한다. 기존 설정과 진도는 보존한다. 기존 MAX 개인 데이터는 [후리가나 메타데이터 갱신](furigana.md)의 `enrich_readings.py` → `refresh-readings` 순서로 복원한다. 갱신 전 DB dump와 JSONL 백업을 보관하고 계정의 기존 import 범위(all/n5)를 일치시킨다. 새 변환은 원본 ruby를 처음부터 포함한다. 읽기만 변경할 때 전체 reimport와 미디어 재추출은 필요하지 않다.
