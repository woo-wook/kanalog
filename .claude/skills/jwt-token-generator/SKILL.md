---
name: jwt-token-generator
description: JWT 액세스 토큰을 발급하는 TokenGenerator 와 AccessToken 타입을 만들 때 사용. "토큰 발급", "JWT 생성", "TokenGenerator", "AccessToken" 요청에 사용.
---

# JWT 토큰 발급

JJWT 로 서명된 액세스 토큰을 생성. subject/issuer/만료/커스텀 claim 포함.

## 템플릿

```kotlin
data class AccessToken(val accessToken: String)

object TokenGenerator {
    fun generateAccessToken(
        subject: String,
        issuer: String,
        expired: Duration,
        claim: Any,
        key: String,
    ): AccessToken {
        val issuedAt = LocalDateTime.now()
        val expiration = issuedAt.plusSeconds(expired.toSeconds())
        val secretKey = Keys.hmacShaKeyFor(key.toByteArray())
        return AccessToken(
            Jwts.builder()
                .subject(subject)
                .issuer(issuer)
                .id(UUIDGenerator.generate())
                .issuedAt(issuedAt.toDate())
                .expiration(expiration.toDate())
                .claim("dutchlog", claim)
                .signWith(secretKey, Jwts.SIG.HS256)
                .compact()
        )
    }
}
```

## 규칙

- 의존성: `bundles.jjwt` (api/impl/jackson), 알고리즘 HS256
- 시크릿 키는 [configuration-properties](../configuration-properties/SKILL.md)로 주입 (하드코딩 금지)
- `jti` 는 [uuid-generator](../uuid-generator/SKILL.md), `LocalDateTime.toDate()` 는 [localdatetime-extensions](../localdatetime-extensions/SKILL.md)

## 관련 스킬

[jwt-token-validator](../jwt-token-validator/SKILL.md) · [jwt-security-filter](../jwt-security-filter/SKILL.md) · [localdatetime-extensions](../localdatetime-extensions/SKILL.md)

## 차용 원본

`common/core/.../domain/service/TokenGenerator.kt`, `domain/token/AccessToken.kt`
