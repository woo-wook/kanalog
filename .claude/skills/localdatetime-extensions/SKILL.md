---
name: localdatetime-extensions
description: LocalDateTime 관련 Kotlin 확장 함수(예: toDate())를 만들 때 사용. "LocalDateTime 확장", "toDate 변환", "날짜 확장 함수" 요청에 사용.
---

# LocalDateTime 확장 함수

자주 쓰는 날짜 변환을 확장 함수로. JWT 발급 등에서 `java.util.Date` 변환에 사용.

## 템플릿

```kotlin
fun LocalDateTime.toDate(): Date =
    Date.from(this.atZone(ZoneId.systemDefault()).toInstant())
```

## 규칙

- `support/extensions/` 패키지에 모음
- 타임존 가정이 들어가므로 시스템 기본 vs 명시 타임존 주의

## 관련 스킬

[jwt-token-generator](../jwt-token-generator/SKILL.md) · [jackson-config](../jackson-config/SKILL.md)

## 차용 원본

`common/core/.../support/extensions/LocalDateTimeExtensions.kt`
