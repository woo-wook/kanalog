---
name: jwt-gateway-filter
description: Spring Cloud Gateway(WebFlux)에서 JWT 를 검증하고 사용자 ID 를 헤더로 전파하는 GlobalFilter 를 만들 때 사용. "게이트웨이 필터", "Spring Cloud Gateway", "GlobalFilter JWT", "X-User-Id 전파" 요청에 사용. (멀티모듈/MSA 전용)
---

# JWT Gateway GlobalFilter (reactive)

API Gateway 에서 JWT 를 1차 검증하고 다운스트림에 `X-User-Id` 를 주입. **MSA/멀티모듈 전용** —
모놀리식이면 [jwt-security-filter](../jwt-security-filter/SKILL.md)를 쓴다.

## 템플릿

```kotlin
@Component
class JwtAuthenticationFilter(
    @Value("\${dutchlog.token.access.secret}") private val secretKey: String,
) : GlobalFilter, Ordered {
    companion object {
        private val PUBLIC = listOf("/api/auth/", "/actuator/", "/public/")
    }
    override fun filter(exchange: ServerWebExchange, chain: GatewayFilterChain): Mono<Void> {
        val path = exchange.request.uri.path
        if (PUBLIC.any { path.startsWith(it) }) return chain.filter(exchange)

        val token = exchange.request.headers.getFirst(HttpHeaders.AUTHORIZATION)
            ?.takeIf { it.startsWith("Bearer ", true) }?.substring(7)
            ?: return Mono.error(BusinessException(ErrorCode.Unauthorized.MISSING_TOKEN))

        return when (val r = TokenValidator.getSubject(token, secretKey)) {
            is TokenValidationResult.Success -> {
                val mutated = exchange.request.mutate().header("X-User-Id", r.value).build()
                chain.filter(exchange.mutate().request(mutated).build())
            }
            TokenValidationResult.Failure.Expired ->
                Mono.error(BusinessException(ErrorCode.Unauthorized.EXPIRED_TOKEN))
            else -> Mono.error(BusinessException(ErrorCode.Unauthorized.INVALID_TOKEN))
        }
    }
    override fun getOrder() = -100
}
```

## 관련 스킬

[jwt-security-filter](../jwt-security-filter/SKILL.md) · [jwt-token-validator](../jwt-token-validator/SKILL.md)

## 차용 원본

`gateway/.../filter/JwtAuthenticationFilter.kt`
