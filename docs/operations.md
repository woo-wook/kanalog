# 자체 서버 운영

## 처음 설치

```sh
test -f .env || cp .env.example .env
mkdir -p private-data/converted
# POSTGRES_PASSWORD를 고유한 긴 임의값으로 바꾼다.
docker compose up -d --build
docker compose ps
curl -fsS http://localhost:3200/api/health/live
curl -fsS http://localhost:3200/api/health/ready
```

기본 공개 포트는 호스트의 `127.0.0.1:3200`이다. DB 및 API는 Compose 네트워크에서만 접근한다. 미디어는 `kanalog_media`, DB는 `kanalog_postgres` 지속 볼륨에 저장한다. `docker compose down`은 볼륨을 삭제하지 않는다. `docker compose down -v`는 이 두 저장소를 삭제하므로 일반 운영 절차에 사용하지 않는다. Flyway는 시작 시 스키마 변경만 적용하며 데이터를 초기화하지 않는다.

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

`.env`의 `PUBLIC_APP_URL=https://study.example.com`, `COOKIE_SECURE=true`로 설정한다. 다른 도메인·포트에서 직접 접속하면 Origin 검사와 쿠키 동작이 달라질 수 있다. `APP_BIND_IP=0.0.0.0`은 외부 포트를 직접 열어야 할 때에만 사용한다. HTTPS 공개 환경에서는 프록시의 TLS 설정을 먼저 완료한다.

사용자 설정에서 시간대를 바꾸면 저장된 UTC 복습 시각은 유지되고, 오늘 새 카드 한도와 연속 학습일·7일·30일 통계는 새 시간대의 날짜 경계로 바로 다시 계산된다.

## 일반 재시작과 업데이트

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

Flyway migration 실패나 DB 준비 실패 시 `docker compose logs --tail=100 backend db`로 원인을 확인한다. 사용자 비밀번호, 세션 쿠키, 개인 단어 본문은 로그나 지원 요청에 붙이지 않는다.

## DB와 미디어를 함께 백업

복습 로그가 DB에, 음성이 별도 볼륨에 있으므로 두 자료를 같은 중단 시점에 백업한다. 아래 명령은 저장소 루트에서 실행한다.

```sh
mkdir -p private-data/backups
docker compose stop frontend backend
docker compose exec -T db pg_dump -U kanalog -d kanalog -Fc > private-data/backups/kanalog.dump
docker compose run --rm --no-deps -T --entrypoint sh backend -c 'tar -C /app/media -cf - .' > private-data/backups/media.tar
docker compose up -d backend frontend
```

`private-data/backups`는 Git과 이미지에서 제외된다. 백업 파일에 개인 콘텐츠와 계정 정보가 들어 있으므로 서버 밖의 암호화된 저장소에 접근을 제한해 보관한다. 덤프와 `media.tar`는 한 쌍이다. `private-data/downloads`의 APKG와 `private-data/converted`의 변환 결과는 이 두 파일에 들어 있지 않으므로 재import에 대비하려면 별도로 보관한다.

## 복원

기존 데이터를 대체하는 작업이므로 실제 운영 서버에서 실행할 때에는 대상 DB와 백업 시점을 먼저 확인한다. 테스트 환경에서는 별도 Compose 프로젝트 이름과 별도 볼륨을 사용한다. 복원 중 앱 쓰기를 멈춘다.

```sh
docker compose stop frontend backend
docker compose up -d db
docker compose exec -T db pg_restore -U kanalog -d kanalog --clean --if-exists --no-owner --no-privileges --single-transaction --exit-on-error < private-data/backups/kanalog.dump
docker compose run --rm --no-deps -T --entrypoint sh backend -c 'tar -C /app/media -xf -' < private-data/backups/media.tar
docker compose up -d backend frontend
curl -fsS http://localhost:3200/api/health/ready
```

복원 후 이전에 평가했던 카드의 통계와 음성 재생을 확인한다. DB 사용자/비밀번호는 현재 `.env`와 일치해야 한다. 테스트 복원에서는 원래 운영 볼륨을 사용하지 않는다.

## 장애 확인

- `/api/health/live` 실패: 프런트엔드 또는 백엔드 프로세스와 프록시 경로를 확인한다.
- `/api/health/ready` 실패: PostgreSQL health, 접속 설정, Flyway 오류를 확인한다.
- 401: 로그인 상태를 다시 확인한다. 403: `PUBLIC_APP_URL`, Origin, `COOKIE_SECURE`, CSRF 헤더를 확인한다.
- 음성만 실패: 사용자별 미디어 DB 레코드와 `kanalog_media` 볼륨을 함께 확인한다. 볼륨을 공개 정적 디렉터리로 연결하지 않는다.
- import 실패: `private-data/converted/.../report.json`과 import 작업 상태를 확인한다. 원문 전체를 로그로 출력하지 않는다.

## 이 작업 환경의 검증 범위

`docker compose config --quiet`는 통과했다. 이 로컬 작업 공간에는 독립 DB 비밀번호를 가진 `.env`를 만들었고 Git에서 제외했다. 3000번 포트는 기존 Docker 프로세스가 사용 중이며 3200번 포트는 비어 있었다. `docker compose up -d --build`는 Docker daemon 소켓 연결이 `operation not permitted`로 거부되어 이미지 빌드, 컨테이너 기동, PostgreSQL 백업·복원 실습까지 진행되지 않았다. 따라서 실제 기동과 복원 후 학습 기록 유지 여부는 Docker 사용 가능 환경에서 확인해야 한다.
