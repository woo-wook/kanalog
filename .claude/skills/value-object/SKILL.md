---
name: value-object
description: 검증 로직을 가진 불변 값 객체(@Embeddable)를 만들 때 사용. "값 객체", "VO", "Money/금액 타입", "Embeddable", "of() 팩토리로 검증하는 타입" 요청에 사용.
---

# 값 객체 (Value Object)

검증·정규화를 생성 시점에 강제하는 불변 `data class`. JPA `@Embeddable` 로 엔티티에 박힌다.

## 규칙

- `private constructor` 느낌으로, 생성은 `companion object.of(...)` 팩토리를 통해서만
- 검증 실패는 도메인 예외로 (`init` 또는 `of()` 안에서)
- 민감 값은 `toString()` 마스킹 (`"Money(****)"` 등 — 로그 유출 방지)
- 같은 값이면 같음 → `data class` 사용

## 템플릿 (예: Money)

```kotlin
@Embeddable
data class Money(
    @Column(name = "amount", nullable = false)
    val amount: BigDecimal,
    @Column(name = "currency", nullable = false, length = 3)
    val currency: String = "KRW",
) {
    init {
        require(amount.scale() <= 2) { "금액 소수점은 2자리까지" }
    }

    operator fun plus(other: Money): Money {
        require(currency == other.currency) { "통화가 다릅니다" }
        return Money(amount + other.amount, currency)
    }

    companion object {
        fun of(amount: Long, currency: String = "KRW") =
            Money(BigDecimal.valueOf(amount), currency)
    }
}
```

암호화가 필요한 VO(이메일/식별자 등)는 [crypto-value-object](../crypto-value-object/SKILL.md)를 사용.

## 관련 스킬

[aggregate-root](../aggregate-root/SKILL.md) · [crypto-value-object](../crypto-value-object/SKILL.md) · [domain-error-code](../domain-error-code/SKILL.md)

## 차용 원본

`common/jpa/.../domain/vo/Email.kt`, `Password.kt`
