---
name: version-catalog
description: Gradle 버전 카탈로그(libs.versions.toml)를 만들거나 의존성을 추가할 때 사용. "버전 카탈로그", "libs.versions.toml", "의존성 버전 관리", "libs.xxx" 요청에 사용.
---

# Gradle 버전 카탈로그

모든 버전·라이브러리·번들·플러그인을 `gradle/libs.versions.toml` 한 곳에서 관리.

## 템플릿

```toml
[versions]
kotlin = "2.3.21"
springBoot = "4.1.0"
springDependencyManagement = "1.1.7"
jjwt = "0.13.0"
kotest = "6.0.6"
mockk = "1.13.8"
uuidGenerator = "5.1.1"
kotlinLogging = "7.0.3"

[libraries]
spring-boot-starter-webmvc = { group = "org.springframework.boot", name = "spring-boot-starter-webmvc" }
spring-boot-starter-data-jpa = { group = "org.springframework.boot", name = "spring-boot-starter-data-jpa" }
spring-boot-starter-validation = { group = "org.springframework.boot", name = "spring-boot-starter-validation" }
spring-boot-starter-security = { group = "org.springframework.boot", name = "spring-boot-starter-security" }
spring-boot-h2console = { group = "org.springframework.boot", name = "spring-boot-h2console" }
kotlin-reflect = { group = "org.jetbrains.kotlin", name = "kotlin-reflect" }
jackson-module-kotlin = { group = "tools.jackson.module", name = "jackson-module-kotlin" }
java-uuid-generator = { group = "com.fasterxml.uuid", name = "java-uuid-generator", version.ref = "uuidGenerator" }
kotlin-logging = { group = "io.github.oshai", name = "kotlin-logging-jvm", version.ref = "kotlinLogging" }
h2 = { group = "com.h2database", name = "h2" }
jjwt-api = { group = "io.jsonwebtoken", name = "jjwt-api", version.ref = "jjwt" }
jjwt-impl = { group = "io.jsonwebtoken", name = "jjwt-impl", version.ref = "jjwt" }
jjwt-jackson = { group = "io.jsonwebtoken", name = "jjwt-jackson", version.ref = "jjwt" }
# test
spring-boot-starter-webmvc-test = { group = "org.springframework.boot", name = "spring-boot-starter-webmvc-test" }
kotlin-test-junit5 = { group = "org.jetbrains.kotlin", name = "kotlin-test-junit5" }
junit-platform-launcher = { group = "org.junit.platform", name = "junit-platform-launcher" }
kotest-runner = { group = "io.kotest", name = "kotest-runner-junit5", version.ref = "kotest" }
kotest-assertions = { group = "io.kotest", name = "kotest-assertions-core", version.ref = "kotest" }
kotest-extensions-spring = { group = "io.kotest", name = "kotest-extensions-spring", version.ref = "kotest" }
mockk = { group = "io.mockk", name = "mockk", version.ref = "mockk" }

[bundles]
jjwt = ["jjwt-api", "jjwt-impl", "jjwt-jackson"]
testing-jvm = ["kotlin-test-junit5", "kotest-runner", "kotest-assertions", "mockk", "junit-platform-launcher"]
testing-spring = ["spring-boot-starter-webmvc-test", "kotest-extensions-spring"]

[plugins]
kotlin-jvm = { id = "org.jetbrains.kotlin.jvm", version.ref = "kotlin" }
kotlin-spring = { id = "org.jetbrains.kotlin.plugin.spring", version.ref = "kotlin" }
kotlin-jpa = { id = "org.jetbrains.kotlin.plugin.jpa", version.ref = "kotlin" }
spring-boot = { id = "org.springframework.boot", version.ref = "springBoot" }
spring-dependency-management = { id = "io.spring.dependency-management", version.ref = "springDependencyManagement" }
```

## 규칙

- 현재 프로젝트 버전(Boot 4.1.0 / Kotlin 2.3.21) 유지 — 레퍼런스(4.0.0/2.2.21)로 내리지 않음
- Boot 4.x starter 네이밍(`-webmvc`, `-webmvc-test`, `h2console`) 사용
- `build.gradle.kts` 에서 `libs.xxx`, `libs.bundles.xxx`, `alias(libs.plugins.xxx)` 로 참조

## 관련 스킬

[convention-plugins](../convention-plugins/SKILL.md) · [test-config](../test-config/SKILL.md)

## 차용 원본

`gradle/libs.versions.toml`
