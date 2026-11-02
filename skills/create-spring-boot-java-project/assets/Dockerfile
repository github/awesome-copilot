# syntax=docker/dockerfile:1
#
# Multi-stage JVM image for a Spring Boot Maven project.
# Adapted from jdubois/dr-jskill (Apache-2.0); see references/PROVENANCE.md.
#
# - The Boot jar is exploded into layers and started with the JarLauncher.
# - A minimal runtime is assembled with jlink.
# - The runtime image is distroless (no shell, non-root, uid 65532).
# JVM flags go through JAVA_TOOL_OPTIONS because there is no shell.
#
#   docker build -t my-spring-app .
#   docker run --rm -p 8080:8080 my-spring-app

FROM eclipse-temurin:25-jdk-noble AS build

WORKDIR /app

COPY mvnw .
COPY .mvn .mvn
COPY pom.xml .
RUN chmod +x mvnw && ./mvnw dependency:go-offline -B

COPY src ./src
RUN ./mvnw clean package -DskipTests -B

RUN cp target/*.jar app.jar && \
    java -Djarmode=tools -jar app.jar extract --layers --launcher --destination extracted

# Module list suits typical web + JPA apps; run `jdeps --print-module-deps` if the app fails with NoClassDefFoundError.
RUN "$JAVA_HOME/bin/jlink" \
      --add-modules java.base,java.logging,java.naming,java.management,java.management.rmi,java.instrument,java.sql,java.sql.rowset,java.transaction.xa,java.xml,java.xml.crypto,java.desktop,java.security.jgss,java.security.sasl,java.scripting,java.compiler,java.net.http,java.rmi,java.prefs,jdk.unsupported,jdk.crypto.ec,jdk.crypto.cryptoki,jdk.jfr,jdk.management,jdk.management.agent,jdk.attach,jdk.zipfs,jdk.charsets,jdk.net,jdk.security.auth \
      --strip-debug --no-man-pages --no-header-files --compress=zip-6 \
      --output /javaruntime

FROM gcr.io/distroless/base-debian12:nonroot

ENV JAVA_HOME=/opt/java
ENV PATH="$JAVA_HOME/bin:$PATH"
COPY --from=build /javaruntime $JAVA_HOME

WORKDIR /app

COPY --from=build --chown=65532:65532 /app/extracted/dependencies/ ./
COPY --from=build --chown=65532:65532 /app/extracted/spring-boot-loader/ ./
COPY --from=build --chown=65532:65532 /app/extracted/snapshot-dependencies/ ./
COPY --from=build --chown=65532:65532 /app/extracted/application/ ./

USER nonroot

ENV JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=75.0 -XX:+ExitOnOutOfMemoryError"

EXPOSE 8080

ENTRYPOINT ["/opt/java/bin/java", "org.springframework.boot.loader.launch.JarLauncher"]
