---
name: jackson-config
description: Jackson 직렬화 정책과 공통 application.yml 기본 설정을 잡을 때 사용. "Jackson 설정", "직렬화 옵션", "null 제외", "날짜 포맷 타임존", "application yml 공통" 요청에 사용.
---

# Jackson / 공통 설정

null 미직렬화, 미지정 필드 무시, ISO 날짜·Asia/Seoul 타임존 등 가계부/금융 앱에 맞는 직렬화 정책.

## 템플릿 (application.yml)

```yaml
spring:
  jackson:
    default-property-inclusion: non_null      # null 필드 직렬화 안 함
    deserialization:
      fail-on-unknown-properties: false        # 미지정 필드 허용(상위호환)
    serialization:
      fail-on-empty-beans: false
    date-format: yyyy-MM-dd'T'HH:mm:ss
    time-zone: Asia/Seoul
  jpa:
    open-in-view: false                        # OSIV 비활성(권장)
    hibernate:
      ddl-auto: update
```

## 규칙

- 모놀리식이라 별도 `application-shared.yml` 없이 `application.yml` 에 직접
- 금액(`BigDecimal`)은 문자열 직렬화 고려(정밀도)
- 타임존은 도메인 정책에 맞게(KR 기준 Asia/Seoul)

## 관련 스킬

[configuration-properties](../configuration-properties/SKILL.md) · [localdatetime-extensions](../localdatetime-extensions/SKILL.md)

## 차용 원본

`common/core/src/main/resources/application-shared.yml`
