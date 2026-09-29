---
name: http-logging-filter
description: HTTP 요청/응답(메서드·경로·바디·소요시간)을 로깅하는 서블릿 필터와 FilterOrder 상수를 만들 때 사용. "HTTP 로깅", "요청 응답 로깅 필터", "OncePerRequestFilter 로깅", "FilterOrder" 요청에 사용.
---

# HTTP 로깅 필터

요청/응답 본문과 소요시간을 한 줄로 남기는 필터. 본문 캐싱 래퍼 사용.

## 템플릿

```kotlin
object FilterOrder {
    const val LOGGING_FILTER = Ordered.HIGHEST_PRECEDENCE + 10
}

@Component
@Order(FilterOrder.LOGGING_FILTER)
@ConditionalOnWebApplication(type = ConditionalOnWebApplication.Type.SERVLET)
@EnableConfigurationProperties(LoggingProperties::class)
class HttpLoggingFilter(
    private val props: LoggingProperties,
) : OncePerRequestFilter() {
    private val log = KotlinLogging.logger {}

    override fun shouldNotFilter(req: HttpServletRequest) =
        props.http.excludedPaths.any { AntPathMatcher().match(it, req.requestURI) }

    override fun doFilterInternal(req: HttpServletRequest, res: HttpServletResponse, chain: FilterChain) {
        val cachedReq = ContentCachingRequestWrapper(req)
        val cachedRes = ContentCachingResponseWrapper(res)
        val start = System.nanoTime()
        try {
            chain.doFilter(cachedReq, cachedRes)
        } finally {
            val ms = (System.nanoTime() - start) / 1_000_000
            log.info { "[$ms ms] [${cachedRes.status}] [${req.method}] ${req.requestURI}" }
            cachedRes.copyBodyToResponse()
        }
    }
}
```

```yaml
dutchlog:
  logging:
    http:
      excluded-paths: [/actuator/**, /swagger-ui.html, /webjars/**]
```

## 규칙

- 본문 로깅 시 길이 truncate, 민감 정보 마스킹 주의
- 제외 경로는 [configuration-properties](../configuration-properties/SKILL.md)로

## 관련 스킬

[configuration-properties](../configuration-properties/SKILL.md) · [jackson-config](../jackson-config/SKILL.md)

## 차용 원본

`common/core/.../presentation/filter/{HttpLoggingFilter,HttpLogFormatter,HttpLogWriter}.kt`, `constant/FilterOrder.kt`
