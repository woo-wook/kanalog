# Dutchlog 참고 기록

조사 대상은 현재 저장소의 형제 디렉터리 `../dutchlog`이다. 2026-09-29에 파일을 직접 읽었다. Dutchlog는 읽기 전용으로 두었고, 계정, 토큰, 환경 파일, 데이터베이스, 덱 및 운영 자산은 복사하지 않았다.

## 확인한 구조와 관례

| 항목 | 확인한 파일 | 실제 관례와 이번 프로젝트의 적용 |
| --- | --- | --- |
| 작업 규칙 | `../dutchlog/CODERULE.md`, `../dutchlog/.claude/skills/SKILLS.md`, `../dutchlog/frontend/AGENTS.md` | TDD와 Tidy First, 작은 변경과 명확한 이름. 코드 규칙 및 `.claude/skills` 전체를 복사했다. 스킬에 적힌 Dutchlog 패키지명, 가계부 도메인, JWT/BFF 선택은 예시이며 일본어 학습 앱 요구사항에 맞춰 판단한다. |
| 백엔드 빌드 | `../dutchlog/backend/build.gradle.kts`, `settings.gradle.kts`, `gradle/libs.versions.toml`, `gradle/wrapper/gradle-wrapper.properties` | 단일 Kotlin Spring Boot 애플리케이션, Gradle Kotlin DSL, 버전 카탈로그, JDK 21, Gradle 9.5.1. 조사 당시 카탈로그는 Kotlin 2.3.21, Spring Boot 4.1.0이다. Gradle wrapper와 카탈로그를 골격으로 복사했으며 실제 의존성은 앱 필요에 맞춰 정리한다. |
| 백엔드 계층 | `../dutchlog/backend/src/main/kotlin/com/dutchlog/backend/goal/{presentation,application,domain,infrastructure}/`, `../dutchlog/backend/src/main/kotlin/com/dutchlog/backend/auth/application/LoginService.kt` | 기능별 패키지 아래 presentation/application/domain/infrastructure, 서비스에서 `@Transactional`, JPA repository 사용. 이 패키지 구성과 책임 경계를 참고한다. |
| API 응답과 오류 | `../dutchlog/backend/src/main/kotlin/com/dutchlog/backend/common/response/{ApiController,Response,GlobalResponseHandler}.kt`, `../dutchlog/backend/src/main/kotlin/com/dutchlog/backend/common/error/GlobalExceptionHandler.kt` | 성공/오류 응답의 `code`, `message`, 성공의 `data`; 전역 예외 처리와 Bean Validation. 이번 앱의 충돌, 필드 오류, 요청 ID 요구사항을 추가한다. |
| 인증 | `../dutchlog/backend/src/main/kotlin/com/dutchlog/backend/common/security/SecurityConfig.kt`, `../dutchlog/backend/src/main/kotlin/com/dutchlog/backend/auth/presentation/AuthController.kt`, `../dutchlog/backend/src/main/kotlin/com/dutchlog/backend/auth/application/LoginService.kt`, `../dutchlog/frontend/proxy.ts` | Dutchlog는 공개 가입 및 Bearer JWT, 서버 비저장 인증, CSRF 비활성화이며 FE가 쿠키를 BFF로 전달한다. 이번 앱은 공개 가입을 막고 안전한 쿠키와 서버 측 검증, 로그아웃 처리를 구현한다. Dutchlog 사용자 DB와 토큰 비밀값을 공유하지 않는다. |
| DB와 스키마 | `../dutchlog/backend/src/main/resources/application.yml`, `../dutchlog/backend/src/main/resources/db/ddl.sql`, `../dutchlog/backend/src/main/resources/db/migrate_phase5_household.sql` 등 | PostgreSQL, Spring Data JPA, `open-in-view: false`, Hibernate `ddl-auto: none`. Dutchlog의 SQL 파일은 수동 적용 방식이며 Flyway/Liquibase 의존성이 없다. 이번 앱은 별도 PostgreSQL과 반복 가능한 버전 마이그레이션을 사용한다. |
| 테스트 | `../dutchlog/backend/src/test/kotlin/com/dutchlog/backend/auth/AuthIntegrationTest.kt`, `../dutchlog/backend/src/test/kotlin/com/dutchlog/backend/common/security/JwtSecurityIntegrationTest.kt`, `../dutchlog/frontend/vitest.config.ts`, `../dutchlog/frontend/playwright.config.ts` | 백엔드는 JUnit Platform, Kotest, MockK, H2 테스트 의존성. 프런트는 Vitest와 Playwright. 이번 앱은 학습 상태와 DB 제약의 실제 위험을 검증할 때 PostgreSQL 기준을 우선한다. |
| 프런트엔드 | `../dutchlog/frontend/package.json`, `pnpm-lock.yaml`, `app/`, `src/`, `next.config.ts`, `Dockerfile` | Next.js 16 App Router, React 19, TypeScript, pnpm, Tailwind 4, TanStack Query, Feature-Sliced Design, standalone 배포. FE는 화면과 API 클라이언트를 맡고 학습 업무 규칙은 Kotlin BE에서 확정한다. |
| 배포 | `../dutchlog/backend/Dockerfile`, `../dutchlog/frontend/Dockerfile` | BE는 Temurin 21 다단계 빌드, FE는 Node 22 Alpine standalone. 저장소 루트에 Compose 파일은 확인되지 않았다. 이번 앱은 독립 DB, 미디어 볼륨, 포트와 Compose를 별도로 만든다. |

## 복사한 기본 파일

- `CODERULE.md`
- `.claude/skills/` 전체: `SKILLS.md`와 하위 `SKILL.md` 75개. 일부 스킬은 가계부 도메인, 구버전 Next 또는 별도 인프라를 전제로 하므로 해당 기능에 그대로 적용하지 않는다.
- `.gitignore`: 원본 규칙에 개인 APKG/DB 파일과 `private-data/` 제외 규칙을 추가했다.
- `.dockerignore`: 새 파일로, 개인 데이터와 개발 산출물이 루트 Docker 빌드 문맥에 들어가지 않게 했다.
- `backend/gradlew`, `backend/gradlew.bat`, `backend/gradle/wrapper/`, `backend/gradle/libs.versions.toml`

원본 소스 코드, SQL 스키마, Dockerfile, 환경 설정값은 제품별 결정과 비밀값 혼입을 피하려고 그대로 복사하지 않았다. 프런트엔드 골격은 별도 구현 작업에서 Dutchlog 구성을 참고해 구성한다.
