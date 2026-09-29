---
name: jwt-security-filter
description: 모놀리식(Servlet) 환경에서 Spring Security 필터로 JWT 인증을 거는 OncePerRequestFilter + SecurityConfig 를 만들 때 사용. "JWT 필터", "Security 설정", "인증 필터", "보호 경로", "OncePerRequestFilter" 요청에 사용.
---

# JWT Security 필터 (모놀리식)

Gateway 없는 단일 애플리케이션에서 Spring Security 필터체인으로 JWT 를 검증.

## 템플릿

```kotlin
@Component
class JwtAuthenticationFilter(
    private val tokenProperties: TokenProperties,
) : OncePerRequestFilter() {
    override fun doFilterInternal(req: HttpServletRequest, res: HttpServletResponse, chain: FilterChain) {
        val header = req.getHeader(HttpHeaders.AUTHORIZATION)
        val token = header?.takeIf { it.startsWith("Bearer ", true) }?.substring(7)
        if (token != null) {
            when (val r = TokenValidator.getSubject(token, tokenProperties.access.secret)) {
                is TokenValidationResult.Success -> {
                    val auth = UsernamePasswordAuthenticationToken(r.value, null, emptyList())
                    SecurityContextHolder.getContext().authentication = auth
                }
                is TokenValidationResult.Failure -> { /* 인증 미설정 → 보호경로에서 401 */ }
            }
        }
        chain.doFilter(req, res)
    }
}

@Configuration
@EnableWebSecurity
class SecurityConfig(private val jwtFilter: JwtAuthenticationFilter) {
    companion object {
        private val PUBLIC = arrayOf("/api/auth/**", "/actuator/**", "/h2-console/**")
    }
    @Bean
    fun filterChain(http: HttpSecurity): SecurityFilterChain = http
        .csrf { it.disable() }
        .sessionManagement { it.sessionCreationPolicy(SessionCreationPolicy.STATELESS) }
        .authorizeHttpRequests {
            it.requestMatchers(*PUBLIC).permitAll().anyRequest().authenticated()
        }
        .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter::class.java)
        .build()
}
```

## 규칙

- 레퍼런스의 Gateway `GlobalFilter`(reactive)를 Servlet `OncePerRequestFilter` 로 포팅한 것
- 시크릿은 [configuration-properties](../configuration-properties/SKILL.md)로 주입
- 필터에서 던진 예외를 표준 에러로 만들려면 `AuthenticationEntryPoint` 에서 [global-exception-handler](../global-exception-handler/SKILL.md)와 동일 포맷 반환

## 관련 스킬

[jwt-token-validator](../jwt-token-validator/SKILL.md) · [jwt-gateway-filter](../jwt-gateway-filter/SKILL.md) · [configuration-properties](../configuration-properties/SKILL.md)

## 차용 원본

`gateway/.../filter/JwtAuthenticationFilter.kt` (reactive → servlet 포팅)
