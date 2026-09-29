---
name: grpc-client-config
description: gRPC 블로킹/코루틴 클라이언트와 채널 설정 빈을 만들 때 사용. "gRPC 클라이언트", "ManagedChannel", "blocking stub", "coroutine stub" 요청에 사용. (외부 gRPC 서비스 연동 시)
---

# gRPC 클라이언트 설정

외부 gRPC 서비스(예: crypto)에 붙는 클라이언트. blocking/coroutine 두 스타일. **외부 서비스 있을 때만.**

## 템플릿

```kotlin
@ConfigurationProperties(prefix = "dutchlog.grpc.crypto")
data class CryptoServiceProperties(
    val enabled: Boolean = false,
    val host: String = "localhost",
    val port: Int = 9090,
)

@Configuration
@ConditionalOnProperty(prefix = "dutchlog.grpc.crypto", name = ["enabled"], havingValue = "true")
@EnableConfigurationProperties(CryptoServiceProperties::class)
class CryptoGrpcConfiguration(private val props: CryptoServiceProperties) {
    @Bean(destroyMethod = "shutdown")
    fun cryptoChannel(): ManagedChannel =
        ManagedChannelBuilder.forAddress(props.host, props.port).usePlaintext().build()

    @Bean
    fun blockingCryptoClient(channel: ManagedChannel) = BlockingCryptoServiceClient(channel)
}
```

## 규칙

- `@ConditionalOnProperty` 로 비활성 시 빈 미생성(테스트 편의) → [jpa-attribute-converter](../jpa-attribute-converter/SKILL.md)의 `ObjectProvider` 폴백과 짝
- proto/스텁 생성은 [protobuf-grpc-module](../protobuf-grpc-module/SKILL.md)

## 관련 스킬

[protobuf-grpc-module](../protobuf-grpc-module/SKILL.md) · [jpa-attribute-converter](../jpa-attribute-converter/SKILL.md)

## 차용 원본

`common/grpc/.../infrastructure/grpc/{BlockingCryptoServiceClient,CoroutineCryptoServiceClient,configuration/CryptoGrpcConfiguration}.kt`
