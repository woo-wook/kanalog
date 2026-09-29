# dutchlog 스킬 하네스 (SKILLS.md)

레퍼런스 프로젝트 `/Users/doyle/Develop/workspace/kotlin/dutchlog-backend`
(Pragmatic DDD + Hexagonal, Spring Boot Kotlin)에서 검증된 패턴들을
**개별 호출 가능한 스킬**로 추출한 모음이다. 새 가계부(monolith) 백엔드를 만들 때
이 스킬들을 조합해 일관된 코드를 생성한다.

- 형식: 각 패턴 = `.claude/skills/<name>/SKILL.md` (frontmatter 포함, Claude Code 호출 가능)
- 버전 기준: Spring Boot 4.1.0 / Kotlin 2.3.21 / Java 21 / 기본 패키지 `com.dutchlog.backend`
- TDD: 모든 구현은 [tdd-tidy-first](tdd-tidy-first/SKILL.md) 규율을 따른다 (CODERULE.md)

## 카테고리 인덱스

### A. 아키텍처 / DDD 구조
| 스킬 | 설명 |
|---|---|
| [ddd-layered-architecture](ddd-layered-architecture/SKILL.md) | domain/application/infrastructure/presentation 레이어 + 의존 규칙 |
| [aggregate-root](aggregate-root/SKILL.md) | 불변식을 가진 애그리거트 루트 엔티티 |
| [value-object](value-object/SKILL.md) | @Embeddable 값 객체 (of() 팩토리 + 검증 + 마스킹) |
| [domain-repository-interface](domain-repository-interface/SKILL.md) | 도메인 Repository 인터페이스 (애그리거트 중심) |
| [repository-adapter](repository-adapter/SKILL.md) | 인프라 `*RepositoryAdapter` (Spring Data 위임) |
| [spring-data-jpa-repository](spring-data-jpa-repository/SKILL.md) | Spring Data `JpaRepository` 컨벤션 |
| [application-usecase-port](application-usecase-port/SKILL.md) | UseCase port-in + Service + @Transactional 경계 |
| [query-service-cqrs](query-service-cqrs/SKILL.md) | CQRS-lite 조회 서비스 + QueryPort |
| [command-result-model](command-result-model/SKILL.md) | application 레이어 Command/Result DTO |
| [entity-to-dto-extension](entity-to-dto-extension/SKILL.md) | 확장 함수로 Entity→DTO 매핑 |
| [strategy-factory](strategy-factory/SKILL.md) | 전략 패턴 + 팩토리 |
| [domain-factory](domain-factory/SKILL.md) | 엔티티 생성 팩토리 (draft→entity) |
| [out-port-adapter](out-port-adapter/SKILL.md) | application out-port + 인프라 어댑터 |

### B. 응답 / 에러 표준화
| 스킬 | 설명 |
|---|---|
| [api-response-wrapper](api-response-wrapper/SKILL.md) | `Response<T>` sealed + ResponseFactory |
| [api-controller-stereotype](api-controller-stereotype/SKILL.md) | @ApiController + GlobalResponseHandler 자동 래핑 |
| [error-code-catalog](error-code-catalog/SKILL.md) | ErrorCode 인터페이스 + 그룹 enum |
| [business-exception](business-exception/SKILL.md) | BusinessException |
| [global-exception-handler](global-exception-handler/SKILL.md) | @RestControllerAdvice 전역 예외 처리 |
| [domain-error-code](domain-error-code/SKILL.md) | 모듈별 도메인 ErrorCode + 예외 |
| [sealed-result-type](sealed-result-type/SKILL.md) | 제네릭 sealed Result 패턴 (메타) |

### C. JPA / 영속성
| 스킬 | 설명 |
|---|---|
| [base-jpa-entity](base-jpa-entity/SKILL.md) | BaseJpaEntity 감사필드 + JpaAuditingConfiguration |
| [uuid-generator](uuid-generator/SKILL.md) | 시간기반 정렬가능 UUID 생성기 |
| [crypto-value-object](crypto-value-object/SKILL.md) | EncryptedValue/HashedValue + 암호화 VO |
| [jpa-attribute-converter](jpa-attribute-converter/SKILL.md) | AttributeConverter (암호화/해시) |

### D. 보안 / JWT
| 스킬 | 설명 |
|---|---|
| [jwt-token-generator](jwt-token-generator/SKILL.md) | TokenGenerator + AccessToken 발급 |
| [jwt-token-validator](jwt-token-validator/SKILL.md) | TokenValidator + TokenValidationResult |
| [jwt-security-filter](jwt-security-filter/SKILL.md) | OncePerRequestFilter + SecurityConfig (모놀리식) |
| [jwt-gateway-filter](jwt-gateway-filter/SKILL.md) | Spring Cloud Gateway GlobalFilter (reactive) |

### E. 공통 유틸 / 설정
| 스킬 | 설명 |
|---|---|
| [configuration-properties](configuration-properties/SKILL.md) | @ConfigurationProperties 타입 안전 설정 |
| [http-logging-filter](http-logging-filter/SKILL.md) | HTTP 요청/응답 로깅 필터 + FilterOrder |
| [jackson-config](jackson-config/SKILL.md) | Jackson/공통 application.yml 설정 |
| [localdatetime-extensions](localdatetime-extensions/SKILL.md) | LocalDateTime 확장 함수 |

### F. 메시징 / 클라우드
| 스킬 | 설명 |
|---|---|
| [sqs-message-publisher](sqs-message-publisher/SKILL.md) | SQS 발행기 + SqsMessage + AwsProperties |
| [grpc-client-config](grpc-client-config/SKILL.md) | gRPC blocking/coroutine 클라이언트 + 설정 |
| [protobuf-grpc-module](protobuf-grpc-module/SKILL.md) | protobuf gradle 모듈 코드젠 |

### G. 빌드 / 그래들
| 스킬 | 설명 |
|---|---|
| [version-catalog](version-catalog/SKILL.md) | libs.versions.toml 버전 카탈로그 |
| [convention-plugins](convention-plugins/SKILL.md) | build-logic convention 플러그인 |
| [jib-container](jib-container/SKILL.md) | Jib 컨테이너 이미지 설정 |

### H. 테스트
| 스킬 | 설명 |
|---|---|
| [kotest-behaviorspec](kotest-behaviorspec/SKILL.md) | Kotest BehaviorSpec 단위 테스트 |
| [mockk-service-test](mockk-service-test/SKILL.md) | MockK 애플리케이션 서비스 테스트 |
| [datajpatest-repository](datajpatest-repository/SKILL.md) | @DataJpaTest 리포지토리 통합 테스트 |
| [mockmvc-controller-test](mockmvc-controller-test/SKILL.md) | MockMvc standalone 컨트롤러 테스트 |
| [test-data-builder](test-data-builder/SKILL.md) | 테스트 픽스처/빌더 헬퍼 |
| [test-config](test-config/SKILL.md) | application-test.yml + schema.sql |

### I. 워크플로
| 스킬 | 설명 |
|---|---|
| [tdd-tidy-first](tdd-tidy-first/SKILL.md) | TDD Red-Green-Refactor + Tidy First (CODERULE) |
| [git-commit](git-commit/SKILL.md) | Udacity 커밋 컨벤션 (type: Subject), 작성자 흔적 없이 |

---

# 프론트엔드 스킬 (Next.js 15 + FSD)

`frontend/` (Next.js 15 App Router + BFF, Feature-Sliced Design, TypeScript)에서 사용하는 패턴.
백엔드 계약(`Response<T>`, JWT Bearer, ErrorCode)을 소비한다.

### J. 아키텍처 / FSD
| 스킬 | 설명 |
|---|---|
| [fsd-architecture](fsd-architecture/SKILL.md) | FSD 레이어 + 의존 규칙 (Next 적응형) |
| [fsd-slice-segment](fsd-slice-segment/SKILL.md) | 슬라이스 내부 segment (ui/model/api/lib) |
| [public-api-barrel](public-api-barrel/SKILL.md) | 슬라이스 public API (index.ts) + import 경계 |
| [nextjs-app-routing](nextjs-app-routing/SKILL.md) | Next App Router 얇은 라우팅 + route group |

### K. API 통합
| 스킬 | 설명 |
|---|---|
| [response-zod-schema](response-zod-schema/SKILL.md) | Response<T> Zod 파싱 스키마 |
| [api-client](api-client/SKILL.md) | BFF 호출 + data 언랩 fetch 래퍼 |
| [api-error-mapping](api-error-mapping/SKILL.md) | ErrorCode → 사용자 메시지, AppError |
| [bff-route-handler](bff-route-handler/SKILL.md) | Spring 프록시 BFF (쿠키→Bearer) |
| [tanstack-query-setup](tanstack-query-setup/SKILL.md) | TanStack Query Provider/옵션 |
| [query-keys-factory](query-keys-factory/SKILL.md) | 엔티티별 쿼리 키 팩토리 |

### L. 인증
| 스킬 | 설명 |
|---|---|
| [auth-bff-cookies](auth-bff-cookies/SKILL.md) | 로그인/로그아웃 BFF + httpOnly 쿠키 |
| [auth-middleware](auth-middleware/SKILL.md) | Next middleware 라우트 보호 |
| [session-entity](session-entity/SKILL.md) | entities/session + useSession |

### M. UI / 디자인시스템
| 스킬 | 설명 |
|---|---|
| [tailwind-setup](tailwind-setup/SKILL.md) | Tailwind v4 토큰/설정 |
| [shadcn-component](shadcn-component/SKILL.md) | shadcn/ui + cn + CVA variants |
| [ui-component-pattern](ui-component-pattern/SKILL.md) | shared/ui 컴포넌트 규약 |
| [form-rhf-zod](form-rhf-zod/SKILL.md) | React Hook Form + Zod 폼 |
| [theme-dark-mode](theme-dark-mode/SKILL.md) | 다크모드 테마 provider/토글 |

### N. 상태 / 설정
| 스킬 | 설명 |
|---|---|
| [zustand-store](zustand-store/SKILL.md) | 클라이언트(UI) 상태 스토어 |
| [env-validation](env-validation/SKILL.md) | Zod 환경변수 검증 (t3-env) |
| [app-config](app-config/SKILL.md) | shared/config 전역 상수 |

### O. 테스트
| 스킬 | 설명 |
|---|---|
| [vitest-setup](vitest-setup/SKILL.md) | Vitest + RTL + jsdom 환경 |
| [testing-library-component](testing-library-component/SKILL.md) | 컴포넌트 테스트 (role/label) |
| [msw-api-mock](msw-api-mock/SKILL.md) | MSW 백엔드 응답 모킹 |
| [playwright-e2e](playwright-e2e/SKILL.md) | Playwright 인증/플로우 E2E |

### P. 툴링 / 워크플로
| 스킬 | 설명 |
|---|---|
| [nextjs-project-setup](nextjs-project-setup/SKILL.md) | Next 15 + pnpm 스캐폴드/스크립트 |
| [typescript-strict](typescript-strict/SKILL.md) | TS strict + @/* 경로 별칭 |
| [eslint-prettier-fsd](eslint-prettier-fsd/SKILL.md) | ESLint + Prettier + Steiger (FSD 경계) |
| [frontend-tdd](frontend-tdd/SKILL.md) | Vitest Red-Green-Refactor + Tidy First |
