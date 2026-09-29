---
name: jwt-token-validator
description: JWT 를 검증/파싱하고 결과를 sealed 타입으로 반환하는 TokenValidator 를 만들 때 사용. "토큰 검증", "JWT 파싱", "TokenValidator", "TokenValidationResult" 요청에 사용.
---

# JWT 토큰 검증

토큰을 파싱하고 실패 원인(만료/위조/형식)을 타입으로 구분해 반환.

## 템플릿

```kotlin
sealed class TokenValidationResult<out T> {
    data class Success<T>(val value: T) : TokenValidationResult<T>()
    sealed class Failure : TokenValidationResult<Nothing>() {
        data object InvalidFormat : Failure()
        data object InvalidSignature : Failure()
        data object Expired : Failure()
        data class ParseError(val reason: String) : Failure()
    }
    fun isSuccess() = this is Success
    fun getOrNull(): T? = (this as? Success)?.value
}

object TokenValidator {
    fun parseToken(token: String, secretKey: String): TokenValidationResult<Claims> =
        try {
            val key = Keys.hmacShaKeyFor(secretKey.toByteArray())
            val claims = Jwts.parser().verifyWith(key).build()
                .parseSignedClaims(token).payload
            TokenValidationResult.Success(claims)
        } catch (e: SignatureException) { TokenValidationResult.Failure.InvalidSignature }
        catch (e: ExpiredJwtException) { TokenValidationResult.Failure.Expired }
        catch (e: MalformedJwtException) { TokenValidationResult.Failure.InvalidFormat }
        catch (e: Exception) { TokenValidationResult.Failure.ParseError(e.message ?: "unknown") }

    fun getSubject(token: String, secretKey: String): TokenValidationResult<String> =
        when (val r = parseToken(token, secretKey)) {
            is TokenValidationResult.Success -> TokenValidationResult.Success(r.value.subject)
            is TokenValidationResult.Failure -> r
        }
}
```

## 관련 스킬

[jwt-token-generator](../jwt-token-generator/SKILL.md) · [jwt-security-filter](../jwt-security-filter/SKILL.md) · [sealed-result-type](../sealed-result-type/SKILL.md)

## 차용 원본

`common/core/.../domain/token/{TokenValidator,TokenValidationResult}.kt`
