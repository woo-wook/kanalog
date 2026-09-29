---
name: jib-container
description: Jib 으로 도커리스 컨테이너 이미지를 빌드하는 설정을 만들 때 사용. "Jib 설정", "컨테이너 이미지", "도커 없이 이미지 빌드", "이미지 푸시" 요청에 사용. (배포 단계)
---

# Jib 컨테이너 이미지

Dockerfile 없이 컨테이너 이미지를 빌드/푸시. 베이스/JVM 플래그/환경/포트를 코드로 관리.

## 템플릿 (애플리케이션 모듈 build.gradle.kts)

```kotlin
jib {
    from {
        image = "amazoncorretto:21-alpine"
        platforms { platform { architecture = "arm64"; os = "linux" } }
    }
    to {
        image = "ghcr.io/dutch-log/backend"
        tags = setOf("latest", version.toString())
        auth {
            username = System.getProperty("JIB_TO_AUTH_USERNAME")
            password = System.getProperty("JIB_TO_AUTH_PASSWORD")
        }
    }
    container {
        ports = listOf("8080")
        mainClass = "com.dutchlog.backend.BackendApplicationKt"
        jvmFlags = listOf("-Xms128m", "-Xmx256m", "-XX:+UseSerialGC", "-Djava.security.egd=file:/dev/./urandom")
        environment = mapOf("SPRING_PROFILES_ACTIVE" to "prod", "TZ" to "Asia/Seoul")
        creationTime.set("USE_CURRENT_TIMESTAMP")
    }
}
```

## 규칙

- 빌드: `./gradlew jib` (푸시) / `./gradlew jibDockerBuild` (로컬)
- 자격증명은 시스템 프로퍼티/환경변수로 주입
- 메모리/GC 는 서비스 규모에 맞게 조정

## 관련 스킬

[convention-plugins](../convention-plugins/SKILL.md) · [version-catalog](../version-catalog/SKILL.md)

## 차용 원본

`build-logic/.../dutchlog.spring-application.gradle.kts`, `account/build.gradle.kts` jib 블록
