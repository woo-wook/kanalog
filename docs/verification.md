# 검증 기록

2026-10-01 기준 실행 범위를 기록한다. 수치는 실제 JLPT MAX v2.1.2 개인 APKG의 변환 결과이며 공개 저장소에는 콘텐츠 본문과 음성을 넣지 않는다.

| 항목 | 결과 |
| --- | --- |
| 합성 APKG 변환 회귀 테스트 | `python3 -m unittest discover -s tools/deck-import -p 'test_*.py' -v`: 8개 통과. 경로 탈출, 누락 필드·미디어, 스크립트 제거, 미지원 스키마 포함 |
| 실제 N5 변환 검증 | `python3 tools/deck-import/verify_conversion.py private-data/converted/n5`: 카드 878장(어휘 779, 문법 99), 음성 1,795개 |
| 실제 전체 어휘·문법 변환 검증 | `python3 tools/deck-import/verify_conversion.py private-data/converted/all`: 카드 10,237장, 음성 20,157개. 하위 덱별 집계는 `docs/data-sources.md` |
| Frontend TypeScript·lint·빌드·Vitest | `pnpm exec tsc --noEmit`, `pnpm lint`, `pnpm test`, `pnpm build` 통과. 기본 Turbopack 빌드는 이 샌드박스의 포트 바인딩 금지로 실패하여 배포 빌드 스크립트를 webpack으로 고정 |
| Compose 구성 파싱 | `POSTGRES_PASSWORD=validation-only docker compose --env-file .env.example config --quiet` 통과 |
| 로컬 배포 준비 | Dutchlog의 기본 포트 3000이 Docker 프로세스에서 사용 중이고, 3200은 비어 있음을 확인했다. kanalog의 `.env`에 별도 DB 비밀번호를 생성해 권한을 `0600`으로 설정했고 `docker compose config --quiet`가 통과했다 |
| Playwright 스펙 발견 | 전용 테스트 환경변수를 제공한 `playwright test --list`에서 4개 실제 API 흐름 발견. 브라우저 흐름 실행은 미실행 |

## 이 환경에서 미실행

- Gradle 빌드와 JVM 테스트: JDK 21은 `/opt/homebrew/opt/openjdk@21`에 있으나 기본 `java` 경로가 없고, 지정 후에도 Gradle의 파일 잠금 소켓 생성이 `Operation not permitted`로 거부된다. 이 결과를 테스트 통과로 간주하지 않는다.
- Compose 이미지 빌드·기동·PostgreSQL 마이그레이션·API 흐름·DB 재시작 지속성·백업/복원: `docker compose up -d --build`를 시도했으나 Docker daemon 소켓 접근이 `Operation not permitted`로 거부된다. kanalog 컨테이너는 이 환경에서 시작되지 않았다.
- 실제 MAX 변환 JSONL을 Kotlin CLI로 PostgreSQL에 반영하고 인증된 음성까지 확인하는 흐름: 위 DB/컨테이너 제약으로 미실행.
- Kotlin `FsrsAdapterTest`, PostgreSQL `PersistenceFlowTest`, 브라우저 Playwright 테스트는 파일을 작성했으나 JVM/DB 환경 제한으로 미실행.
- 실제 휴대폰/태블릿 음성과 iOS 설치: 해당 기기 접근이 없어 미실행.

환경이 허용되면 저장소 루트에서 `docker compose up -d --build` 후 README의 계정·import 명령을 순서대로 실행하고, 로그인 → 덱 선택 → 평가 → 새로고침·재로그인 → 통계와 음성 → 재import → 복습 기록 보존을 확인한다. 마지막으로 운영 문서의 백업·복원을 별도 테스트 Compose 프로젝트에서 확인한다.
