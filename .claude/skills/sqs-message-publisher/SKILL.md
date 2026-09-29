---
name: sqs-message-publisher
description: AWS SQS 메시지 발행기와 SqsMessage 추상화, AwsProperties 설정을 만들 때 사용. "SQS 발행", "메시지 큐", "SqsMessagePublisher", "AWS SDK" 요청에 사용. (외부 메시징 필요 시)
---

# SQS 메시지 발행기

AWS SDK v2 로 SQS 에 메시지 발행. FIFO(dedup/group) 지원. application out-port 뒤에 둔다.

## 템플릿

```kotlin
interface SqsMessage {
    fun toMessageBody(): String
    fun getDeduplicationId(): String? = null
    fun getGroupId(): String? = null
}

@Component
class SqsMessagePublisher(
    private val sqsClient: SqsClient,
    private val awsProperties: AwsProperties,
) {
    private val log = KotlinLogging.logger {}
    fun publish(message: SqsMessage) {
        val builder = SendMessageRequest.builder()
            .queueUrl(awsProperties.sqs.queueUrl)
            .messageBody(message.toMessageBody())
        message.getDeduplicationId()?.let { builder.messageDeduplicationId(it) }
        message.getGroupId()?.let { builder.messageGroupId(it) }
        val res = sqsClient.sendMessage(builder.build())
        log.info { "SQS published: ${res.messageId()}" }
    }
}

@ConfigurationProperties(prefix = "dutchlog.aws")
data class AwsProperties(val region: String, val sqs: Sqs) {
    data class Sqs(val queueUrl: String)
}
```

## 규칙

- 의존성: `bundles.aws` + `platform(aws-sdk-bom)` (버전 카탈로그)
- application 은 [out-port-adapter](../out-port-adapter/SKILL.md)의 인터페이스만 알고, 이 발행기는 어댑터가 호출
- 도메인 메시지 → `SqsMessage` 매핑

## 관련 스킬

[out-port-adapter](../out-port-adapter/SKILL.md) · [configuration-properties](../configuration-properties/SKILL.md)

## 차용 원본

`common/aws/.../sqs/{SqsMessage,SqsMessagePublisher}.kt`, `config/AwsProperties.kt`
