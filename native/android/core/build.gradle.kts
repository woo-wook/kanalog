plugins {
    kotlin("jvm")
    kotlin("plugin.serialization")
    id("org.jlleitschuh.gradle.ktlint")
}
ktlint { version.set("1.8.0") }
dependencyLocking { lockAllConfigurations() }
val syncReadingDomain by tasks.registering(Sync::class) {
    from(rootProject.file("../../backend/src/main/kotlin")) {
        include(
            "com/kanalog/content/domain/ReadingGuide.kt",
            "com/kanalog/content/domain/HangulPronunciation.kt",
            "com/kanalog/content/domain/VerbConjugation.kt",
        )
    }
    into(layout.buildDirectory.dir("generated/reading-domain"))
}
kotlin {
    sourceSets["main"].kotlin.srcDir(syncReadingDomain.map { it.destinationDir })
    jvmToolchain(21)
    compilerOptions { jvmTarget.set(org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17) }
}
tasks.withType<JavaCompile>().configureEach { options.release.set(17) }
dependencies {
    implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.9.0")
    implementation("io.github.open-spaced-repetition:fsrs:1.0.0")
    testImplementation(kotlin("test-junit"))
}
tasks.test {
    inputs.file(rootProject.file("../shared/verb-fixtures.json")).withPropertyName("verbFixtures")
    systemProperty("builtinFile", rootProject.file("../shared/builtin-content.json").absolutePath)
    systemProperty("readingFixtureFile", rootProject.file("../shared/reading-fixtures.json").absolutePath)
    systemProperty("verbFixtureFile", rootProject.file("../shared/verb-fixtures.json").absolutePath)
    systemProperty("privateContentDirectory", rootProject.file("../../private-data/native/android").absolutePath)
    systemProperty("verifyPrivateContent", providers.gradleProperty("verifyPrivateContent").orNull ?: "false")
}
