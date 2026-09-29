---
name: command-result-model
description: application 레이어의 입력 Command / 출력 Result DTO 모델을 만들 때 사용. "커맨드 객체", "Command/Result", "유스케이스 입출력 DTO" 요청에 사용.
---

# Command / Result 모델

유스케이스 경계의 입출력 DTO. 도메인 엔티티를 application 밖으로 노출하지 않기 위한 장치.

## 규칙

- `application/<x>/model/` 에 위치
- Command: 유스케이스 입력 (불변 `data class`). 표현계층 요청을 변환해 받음
- Result: 유스케이스 출력 (불변 `data class`)
- 타입별 분기가 필요하면 Command 를 sealed 계층으로 (예: NativeRegisterCommand)

## 템플릿

```kotlin
sealed interface <X>Command {
    val type: <Type>
}
data class Native<X>Command(
    val name: String,
    val identifier: String,
    override val type: <Type> = <Type>.NATIVE,
) : <X>Command

data class <X>Result(
    val id: String,
    val createdAt: LocalDateTime,
)
```

## 관련 스킬

[application-usecase-port](../application-usecase-port/SKILL.md) · [entity-to-dto-extension](../entity-to-dto-extension/SKILL.md) · [strategy-factory](../strategy-factory/SKILL.md)

## 차용 원본

`account/.../application/member/model/{MemberRegisterCommand,MemberRegisterResult}.kt`
