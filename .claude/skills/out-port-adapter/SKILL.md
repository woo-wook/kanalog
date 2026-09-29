---
name: out-port-adapter
description: application 의 외부 의존(메시징/메일/외부 API)을 port-out 인터페이스 + 인프라 어댑터로 분리할 때 사용. "아웃 포트", "MessagePublisher", "외부 의존 추상화" 요청에 사용.
---

# Out-Port + 어댑터

application 이 외부 시스템에 의존할 때, 인터페이스(port-out)를 application 에 두고
구현(adapter)을 infrastructure 에 둔다. 도메인/유스케이스는 기술을 모른다.

## 규칙

- `application/<x>/port/out/<X>Publisher.kt` 인터페이스
- `infrastructure/<x>/.../adapter/<X>PublisherAdapter.kt` 구현 (`@Component`)
- 구현은 구체 기술(SQS/메일 등) 호출 → [sqs-message-publisher](../sqs-message-publisher/SKILL.md)

## 템플릿

```kotlin
// application port/out
interface MessagePublisher {
    fun publish(message: <DomainMessage>)
}

// infrastructure adapter
@Component
class <X>MessagePublisherAdapter(
    private val sqsMessagePublisher: SqsMessagePublisher,
) : MessagePublisher {
    override fun publish(message: <DomainMessage>) =
        sqsMessagePublisher.publish(message.toSqsMessage())
}
```

## 관련 스킬

[application-usecase-port](../application-usecase-port/SKILL.md) · [sqs-message-publisher](../sqs-message-publisher/SKILL.md)

## 차용 원본

`account/.../application/member/port/out/MessagePublisher.kt` + `infrastructure/message/`
