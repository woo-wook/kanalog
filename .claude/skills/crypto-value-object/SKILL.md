---
name: crypto-value-object
description: 암호화 저장 + 해시 인덱싱을 동시에 하는 민감정보 값 객체(Email 등)를 만들 때 사용. "암호화 VO", "EncryptedValue HashedValue", "민감정보 저장", "검색 가능한 암호화" 요청에 사용.
---

# 암호화 값 객체

복호화 가능한 `EncryptedValue`(조회용)와 단방향 `HashedValue`(유일성/인덱싱용)를 함께 가진 VO.

> 주의: 이 패턴은 외부 crypto 서비스(레퍼런스는 gRPC) 의존이 있어 모놀리식 초기엔 **선택사항**.
> 단순 케이스는 [value-object](../value-object/SKILL.md)로 충분.

## 템플릿

```kotlin
@Embeddable
data class EncryptedValue(
    @Convert(converter = CryptoConverter::class)
    @Column(name = "encrypted_value", nullable = false, length = 300)
    val value: String,
) {
    init { require(value.isNotBlank()) { "암호화 값이 비었습니다" } }
    companion object { fun of(v: String) = EncryptedValue(v) }
    override fun toString() = "EncryptedValue(****)"
}

@Embeddable
data class HashedValue(
    @Convert(converter = HashDataConverter::class)
    @Column(name = "hash_value", nullable = false, length = 255)
    val value: String,
) {
    init { require(value.isNotBlank()) { "해시 값이 비었습니다" } }
    companion object { fun of(v: String) = HashedValue(v) }
    override fun toString() = "HashedValue(****)"
}

@Embeddable
data class Email(
    @Embedded val encrypted: EncryptedValue,
    @Embedded val hash: HashedValue,
) {
    val value: String get() = encrypted.value
    companion object {
        private val REGEX = "^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$".toRegex()
        fun of(email: String): Email {
            val n = email.trim().lowercase()
            require(REGEX.matches(n)) { "이메일 형식 오류" }
            return Email(EncryptedValue.of(n), HashedValue.of(n))
        }
    }
    override fun toString() = "Email(****)"
}
```

엔티티에 박을 때는 `@AttributeOverrides` 로 컬럼명 매핑.

## 관련 스킬

[value-object](../value-object/SKILL.md) · [jpa-attribute-converter](../jpa-attribute-converter/SKILL.md)

## 차용 원본

`common/jpa/.../domain/vo/{Email,EncryptedValue,HashedValue}.kt`
