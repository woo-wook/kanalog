# 검증 기록

2026-10-01 기준 실행 범위를 기록한다. 수치는 실제 JLPT MAX v2.1.2 개인 APKG의 변환 결과이며 공개 저장소에는 콘텐츠 본문과 음성을 넣지 않는다.

| 항목 | 결과 |
| --- | --- |
| 합성 APKG 변환 회귀 테스트 | `python3 -m unittest discover -s tools/deck-import -p 'test_*.py' -v`: 8개 통과. 경로 탈출, 누락 필드·미디어, 스크립트 제거, 미지원 스키마 포함 |
| 실제 N5 변환 검증 | `python3 tools/deck-import/verify_conversion.py private-data/converted/n5`: 카드 878장(어휘 779, 문법 99), 음성 1,795개 |
| 실제 전체 어휘·문법 변환 검증 | `python3 tools/deck-import/verify_conversion.py private-data/converted/all`: 카드 10,237장, 음성 20,157개. 하위 덱별 집계는 `docs/data-sources.md` |
| Frontend TypeScript·lint·빌드·Vitest | `pnpm exec tsc --noEmit`, `pnpm lint`, `pnpm test`, `pnpm build` 통과. Vitest 1개 테스트 통과. Docker production build도 통과 |
| Backend 빌드 및 테스트 | Docker image의 `bootJar -x test` 및 로컬 JDK 21 `./gradlew test` 통과. JUnit 10개 통과: FSRS 4, PostgreSQL persistence 5, 날짜 경계 1 |
| 현행 Compose·DB 마이그레이션 | 기존 Dutchlog 인프라 PostgreSQL 16 `infra-postgres`에 Kanalog 전용 `kanalog` DB와 전용 로그인 역할 생성. 별도 Kanalog DB 컨테이너 제거 후 backend를 `infra-backend`에 연결. 이미지 재빌드·기동, Flyway 4개 적용, backend healthy, `/api/health/ready` UP 확인 |
| HTTP 확인 | `GET /api/health/ready`가 `{"status":"UP"}` 반환. `GET /login` HTTP 200. 브라우저에서 `http://localhost:3200/login` 열기 완료 |
| Compose 설정 | `docker compose config --quiet` 통과. 호스트 포트 `127.0.0.1:3200`; 3000은 기존 Docker 프로세스가 사용 중이어서 분리했다 |
| 개인 실행 설정 | `.env`에 무작위 DB 비밀번호를 만들고 파일 권한을 `0600`으로 설정했다. `.env`와 private-data는 Git 및 이미지에서 제외 |
| 실제 MAX import 및 브라우저 E2E | 임시 격리 Compose 프로젝트에 일회용 계정을 만들고 N5 실데이터 878장·음성 1,795개 import. Playwright 실제 API 흐름 5개(평가·통계, 로그아웃 권한, 실제 오디오 재생과 로그아웃 후 미디어 거부, 설정 재로그인, 360/390px overflow) 통과 후 테스트 DB·미디어 볼륨 제거 |

## 미실행 및 남은 확인

- 사용자의 실제 계정 정보가 없어 기본 kanalog 인스턴스에는 계정과 개인 덱을 생성하지 않았다. 기본 인스턴스는 현재 비어 있고 로그인 화면을 제공한다. 실제 N5 import 및 E2E는 별도 일회용 Compose 프로젝트에서 실행했다.
- DB와 미디어 백업·복원 및 재시작 지속성은 아직 별도 확인하지 않았다.
- 실제 휴대폰·태블릿 음성과 iOS 설치는 해당 기기 접근이 없어 미실행이다.

다음 검증은 관리자 CLI로 사용자를 만든 뒤 실제 N5 데이터를 import하고, 로그인 → 학습 → 평가 → 새로고침 → 통계·음성 → 재import 후 진도 유지 순서로 진행한다. 운영 문서의 백업·복원은 별도 테스트 Compose 볼륨에서 확인한다.
