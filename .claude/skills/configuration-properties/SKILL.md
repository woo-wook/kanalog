---
name: configuration-properties
description: 타입 안전한 @ConfigurationProperties 설정 바인딩 클래스를 만들 때 사용. "설정 프로퍼티", "ConfigurationProperties", "yml 바인딩", "타입 안전 설정" 요청에 사용.
---

# @ConfigurationProperties

`application.yml` 값을 타입 안전 객체로 바인딩. `@Value` 산발보다 그룹핑이 명확.

## 템플릿

```kotlin
@ConfigurationProperties(prefix = "dutchlog.token")
data class TokenProperties(
    val access: Access,
) {
    data class Access(
        val secret: String,
        val expiration: Duration,
        val issuer: String,
    )
}
```

```yaml
dutchlog:
  token:
    access:
      secret: ${ACCESS_TOKEN_SECRET}
      expiration: 1h
      issuer: dutchlog
```

## 규칙

- 활성화: 메인 클래스에 `@ConfigurationPropertiesScan` 또는 `@EnableConfigurationProperties(X::class)`
- 불변 `data class` 생성자 바인딩 권장
- 시크릿은 환경변수 placeholder 로

## 관련 스킬

[jwt-token-generator](../jwt-token-generator/SKILL.md) · [jackson-config](../jackson-config/SKILL.md) · [http-logging-filter](../http-logging-filter/SKILL.md)

## 차용 원본

`common/aws/.../config/AwsProperties.kt`, `common/core/.../bootstrap/properties/LoggingProperties.kt`
