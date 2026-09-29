---
name: jpa-attribute-converter
description: 컬럼 저장/조회 시 변환(암호화·해시·직렬화)을 하는 JPA AttributeConverter 를 만들 때 사용. "AttributeConverter", "컬럼 암호화", "@Convert", "DB 변환기" 요청에 사용.
---

# JPA AttributeConverter

엔티티 속성 ↔ DB 컬럼 변환을 투명하게 처리. 암호화/해시/커스텀 직렬화에 사용.

## 템플릿

```kotlin
@Converter
@Component
class CryptoConverter(
    private val clientProvider: ObjectProvider<CryptoClient>,
) : AttributeConverter<String, String> {
    override fun convertToDatabaseColumn(attribute: String?): String? {
        if (attribute.isNullOrBlank()) return null
        val client = clientProvider.ifAvailable ?: return attribute  // 폴백
        return client.encrypt(attribute)
    }
    override fun convertToEntityAttribute(dbData: String?): String? {
        if (dbData.isNullOrBlank()) return null
        val client = clientProvider.ifAvailable ?: return dbData
        return client.decrypt(dbData)
    }
}
```

## 규칙

- 단방향 해시 변환기는 `convertToEntityAttribute` 에서 입력 그대로 반환
- `ObjectProvider` 로 선택적 의존 → 클라이언트 없으면 평문 폴백(테스트 편의)
- 필드에 `@Convert(converter = XxxConverter::class)` 부착

## 관련 스킬

[crypto-value-object](../crypto-value-object/SKILL.md) · [grpc-client-config](../grpc-client-config/SKILL.md)

## 차용 원본

`common/jpa/.../infrastructure/jpa/converter/{CryptoConverter,HashDataConverter,HashPasswordConverter}.kt`
