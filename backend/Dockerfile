FROM eclipse-temurin:21.0.12.1_1-jdk-alpine-3.24 AS build
WORKDIR /workspace
COPY gradlew settings.gradle.kts build.gradle.kts ./
COPY gradle ./gradle
COPY src ./src
RUN ./gradlew --no-daemon bootJar -x test && \
    find build/libs -maxdepth 1 -name '*.jar' ! -name '*-plain.jar' -exec cp '{}' /tmp/app.jar \; && \
    test -s /tmp/app.jar

FROM eclipse-temurin:21.0.12.1_1-jre-alpine-3.24
RUN addgroup -S app && adduser -S -G app -u 10001 app && \
    mkdir -p /app/media && chown -R app:app /app
WORKDIR /app
COPY --from=build /tmp/app.jar /app/app.jar
COPY licenses /app/licenses
USER app
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
