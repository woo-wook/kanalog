---
name: convention-plugins
description: build-logic 복합 빌드로 Gradle convention 플러그인(공통 Kotlin/Spring/JPA/App 빌드 로직)을 만들 때 사용. "convention plugin", "build-logic", "빌드 로직 공통화", "kotlin-dsl 플러그인" 요청에 사용. (멀티모듈 전용)
---

# Convention 플러그인 (build-logic)

여러 모듈의 빌드 로직을 `build-logic` 복합 빌드의 convention 플러그인으로 공통화.
**멀티모듈 전용** — 단일 모듈 모놀리식은 [version-catalog](../version-catalog/SKILL.md)만으로 충분.

## 구조

```
build-logic/
├── settings.gradle.kts          # versionCatalogs { from(files("../gradle/libs.versions.toml")) }
├── build.gradle.kts             # plugins { `kotlin-dsl` } + 플러그인 의존성
└── src/main/kotlin/
    ├── dutchlog.kotlin-common.gradle.kts     # JDK21 toolchain, 컴파일 옵션, JUnitPlatform
    ├── dutchlog.spring-library.gradle.kts    # Spring 라이브러리(BOM, kotlin api, test 공통)
    ├── dutchlog.spring-data-jpa.gradle.kts   # JPA + postgres/h2
    ├── dutchlog.spring-application.gradle.kts# bootJar + Jib
    └── VersionCatalogExtensions.kt           # libs 접근 헬퍼
```

## kotlin-common 예시

```kotlin
plugins { id("java"); id("org.jetbrains.kotlin.jvm") }
java { toolchain { languageVersion.set(JavaLanguageVersion.of(21)) } }
tasks.withType<KotlinCompile> {
    compilerOptions {
        freeCompilerArgs.addAll("-Xjsr305=strict", "-Xannotation-default-target=param-property")
        jvmTarget.set(JvmTarget.JVM_21)
    }
}
tasks.withType<Test> { useJUnitPlatform() }
```

## 헬퍼

```kotlin
fun VersionCatalog.library(alias: String) =
    findLibrary(alias).orElseThrow { IllegalStateException("Alias '$alias' not defined") }
fun VersionCatalog.libraryNotation(alias: String) = library(alias).get().toString()
```

## 규칙

- 루트 `settings.gradle.kts` 에 `includeBuild("build-logic")`
- 모듈은 `id("dutchlog.spring-application")` 처럼 1~3개 조합 적용
- 모놀리식이면 이 스킬 대신 카탈로그 + 단일 `build.gradle.kts`

## 관련 스킬

[version-catalog](../version-catalog/SKILL.md) · [jib-container](../jib-container/SKILL.md)

## 차용 원본

`build-logic/src/main/kotlin/dutchlog.*.gradle.kts`
