# 검증 기록

2026-10-01 기준 실행 범위를 기록한다. 수치는 실제 JLPT MAX v2.1.2 개인 APKG의 변환 결과이며 공개 저장소에는 콘텐츠 본문과 음성을 넣지 않는다.

| 항목 | 결과 |
| --- | --- |
| 합성 APKG 변환 회귀 테스트 | `python3 -m unittest discover -s tools/deck-import -p 'test_*.py' -v`: 8개 통과. 경로 탈출, 누락 필드·미디어, 스크립트 제거, 미지원 스키마 포함 |
| 실제 N5 변환 검증 | `python3 tools/deck-import/verify_conversion.py private-data/converted/n5`: 카드 878장(어휘 779, 문법 99), 음성 1,795개 |
| 실제 전체 어휘·문법 변환 검증 | `python3 tools/deck-import/verify_conversion.py private-data/converted/all`: 카드 10,237장, 음성 20,157개. 하위 덱별 집계는 `docs/data-sources.md` |
| Frontend TypeScript·lint·빌드·Vitest | `pnpm exec tsc --noEmit`, `pnpm lint`, `pnpm test`, `pnpm build` 통과. Vitest 1개 테스트 통과. Docker production build도 통과 |
| Backend 빌드 및 테스트 | Docker image의 `bootJar -x test` 및 로컬 JDK 21 `./gradlew test` 통과. JUnit 10개 통과: FSRS 4, PostgreSQL persistence 5, 날짜 경계 1 |
| Compose 기동·DB 마이그레이션 | `docker compose up -d --build` 통과. PostgreSQL 17.11, Kotlin API, Next.js가 실행 중. Flyway 4개 migration 적용 및 backend healthy |
| HTTP 확인 | `GET /api/health/ready`가 `{"status":"UP"}` 반환. `GET /login` HTTP 200. 브라우저에서 `http://localhost:3200/login` 열기 완료 |
| Compose 설정 | `docker compose config --quiet` 통과. 호스트 포트 `127.0.0.1:3200`; 3000은 기존 Docker 프로세스가 사용 중이어서 분리했다 |
| 개인 실행 설정 | `.env`에 무작위 DB 비밀번호를 만들고 파일 권한을 `0600`으로 설정했다. `.env`와 private-data는 Git 및 이미지에서 제외 |

## 미실행 및 남은 확인

- 초기 사용자 이메일을 아직 받지 않아 계정을 만들지 않았고, APKG 변환 JSONL을 DB에 import하지 않았다. 이에 따라 실제 카드 학습·인증 음성·브라우저 E2E 흐름은 아직 확인하지 않았다.
- Docker daemon이 동작 중이므로 Playwright E2E는 초기 계정 생성과 import 후 실행할 수 있다.
- DB와 미디어 백업·복원 및 재시작 지속성은 아직 별도 확인하지 않았다.
- 실제 휴대폰·태블릿 음성과 iOS 설치는 해당 기기 접근이 없어 미실행이다.

다음 검증은 관리자 CLI로 사용자를 만든 뒤 실제 N5 데이터를 import하고, 로그인 → 학습 → 평가 → 새로고침 → 통계·음성 → 재import 후 진도 유지 순서로 진행한다. 운영 문서의 백업·복원은 별도 테스트 Compose 볼륨에서 확인한다.
