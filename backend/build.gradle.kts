plugins {
    alias(libs.plugins.ktlint)
    alias(libs.plugins.kotlin.jvm)
    alias(libs.plugins.kotlin.spring)
    alias(libs.plugins.kotlin.jpa)
    alias(libs.plugins.spring.boot)
    alias(libs.plugins.spring.dependency.management)
}

group = "com.kanalog"
version = "0.1.0"

java { toolchain { languageVersion = JavaLanguageVersion.of(21) } }
repositories { mavenCentral() }
dependencies {
    implementation(libs.spring.boot.starter.webmvc)
    implementation(libs.spring.boot.starter.data.jpa)
    implementation(libs.spring.boot.starter.validation)
    implementation(libs.spring.boot.starter.security)
    implementation(libs.kotlin.reflect)
    implementation(libs.jackson.module.kotlin)
    implementation("org.springframework.boot:spring-boot-starter-flyway")
    implementation("org.flywaydb:flyway-database-postgresql")
    implementation("io.github.open-spaced-repetition:fsrs:1.0.0")
    implementation("com.atilika.kuromoji:kuromoji-ipadic:0.9.0")
    runtimeOnly(libs.postgresql)
    testImplementation(libs.spring.boot.starter.webmvc.test)
    testImplementation(libs.spring.boot.starter.data.jpa.test)
    testImplementation(libs.spring.security.test)
    testImplementation(libs.kotlin.test.junit5)
    testImplementation("org.testcontainers:testcontainers-junit-jupiter")
    testImplementation("org.testcontainers:testcontainers-postgresql")
    testRuntimeOnly(libs.junit.platform.launcher)
}
kotlin { compilerOptions { freeCompilerArgs.addAll("-Xjsr305=strict", "-Xannotation-default-target=param-property") } }
tasks.withType<Test> { useJUnitPlatform() }

ktlint {
    version.set(libs.versions.ktlint.get())
    filter {
        exclude("**/build/**", "**/generated/**")
    }
}

configurations.named("ktlint") { resolutionStrategy.activateDependencyLocking() }

configurations.named("runtimeClasspath") { resolutionStrategy.activateDependencyLocking() }
