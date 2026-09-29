---
name: test-config
description: 테스트용 application-test.yml 과 schema.sql(H2) 설정을 만들 때 사용. "테스트 설정", "application-test.yml", "schema.sql", "H2 테스트 DB", "show-sql" 요청에 사용.
---

# 테스트 설정 (H2)

리포지토리/슬라이스 테스트용 H2 인메모리 + 디버그 설정.

## 템플릿

`src/test/resources/application-test.yml`
```yaml
spring:
  datasource:
    url: jdbc:h2:mem:testdb;MODE=PostgreSQL;DB_CLOSE_DELAY=-1
    driver-class-name: org.h2.Driver
  jpa:
    hibernate:
      ddl-auto: create-drop
    show-sql: true
logging:
  level:
    org.hibernate.SQL: DEBUG
    org.hibernate.orm.jdbc.bind: TRACE
# 외부 의존(예: gRPC crypto)은 테스트에서 비활성
dutchlog:
  grpc:
    crypto:
      enabled: false
```

`src/test/resources/schema.sql` (스키마 분리 시)
```sql
CREATE SCHEMA IF NOT EXISTS ACCOUNTS;
```

## 규칙

- `@DataJpaTest` 는 엔티티 DDL 을 자동 생성, 스키마(namespace)만 schema.sql 로
- 외부 서비스 의존은 프로퍼티로 끄고 폴백 ([jpa-attribute-converter](../jpa-attribute-converter/SKILL.md)의 ObjectProvider)
- PostgreSQL 운영 시 `MODE=PostgreSQL` 로 방언 근접

## 관련 스킬

[datajpatest-repository](../datajpatest-repository/SKILL.md) · [jackson-config](../jackson-config/SKILL.md) · [version-catalog](../version-catalog/SKILL.md)

## 차용 원본

`account/src/test/resources/{application-test.yml,schema.sql}`
