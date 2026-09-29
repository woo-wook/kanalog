---
name: protobuf-grpc-module
description: protobuf gradle 플러그인으로 .proto 에서 Java/Kotlin gRPC 스텁을 코드젠하는 모듈을 설정할 때 사용. "protobuf 설정", "gRPC 코드젠", "proto 스텁 생성" 요청에 사용. (멀티모듈/gRPC 전용)
---

# Protobuf / gRPC 코드젠 모듈

`.proto` 에서 Java + Kotlin 스텁을 생성하는 gradle 설정. **gRPC 통신 모듈 전용.**

## 템플릿 (build.gradle.kts)

```kotlin
import com.google.protobuf.gradle.id

plugins {
    // ... kotlin/spring 공통
    alias(libs.plugins.protobuf)
}

dependencies {
    api(libs.bundles.grpc.common)   // grpc-stub, grpc-protobuf, protobuf-kotlin, grpc-kotlin-stub
    runtimeOnly(libs.grpc.netty)
    testImplementation(libs.grpc.testing)
    testImplementation(libs.grpc.inprocess)
}

protobuf {
    protoc { artifact = libs.protobuf.protoc.get().toString() }
    plugins {
        id("grpc") { artifact = libs.grpc.protoc.gen.java.get().toString() }
        id("grpckt") { artifact = "${libs.grpc.protoc.gen.kotlin.get()}:jdk8@jar" }
    }
    generateProtoTasks {
        all().forEach {
            it.plugins { id("grpc"); id("grpckt") }
            it.builtins { id("kotlin") }
        }
    }
}
```

## 규칙

- `.proto` 는 `src/main/proto/` 에
- 버전: protobuf/grpc/grpcKotlin 은 버전 카탈로그에서 관리

## 관련 스킬

[grpc-client-config](../grpc-client-config/SKILL.md) · [version-catalog](../version-catalog/SKILL.md) · [convention-plugins](../convention-plugins/SKILL.md)

## 차용 원본

`common/grpc/build.gradle.kts`
