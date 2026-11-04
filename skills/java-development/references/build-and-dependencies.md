# Build tools, dependencies and vulnerabilities

Commands below were run on Maven 3.10.0 / 3.9.11 (wrapper) and Gradle 9.8.1 with JDK 21 and 25 unless marked unverified.

## Maven

```bash
mvn -v                               # shows Maven AND the JDK it runs on; check it matches the project's release
./mvnw -B verify                     # compile + unit tests + integration tests (+ checks bound to verify)
./mvnw -B -q test                    # unit tests only
./mvnw -B -pl service -am verify     # one module and what it depends on
./mvnw -B dependency:tree -Dincludes=org.slf4j
./mvnw -B versions:display-dependency-updates
./mvnw -B versions:display-plugin-updates
```

Generate a wrapper (only when the user wants one): `mvn wrapper:wrapper -Dmaven=3.9.11` creates `mvnw`, `mvnw.cmd`, `.mvn/wrapper/maven-wrapper.properties` (verified, wrapper 3.3.4, script-only distribution that downloads Maven on first run). Commit those files and keep `.mvn/` in version control.

Minimal `pom.xml` essentials:

```xml
<properties>
  <maven.compiler.release>21</maven.compiler.release>
  <project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>
</properties>
```

Pin plugin versions (`maven-compiler-plugin` 3.16.0, `maven-surefire-plugin` 3.6.0, `maven-jar-plugin` 3.5.1 were used in verification) instead of relying on Maven's defaults; an explicit `<release>` beats `source`/`target`.

`versions:display-dependency-updates` also proposes pre-releases (it proposed `slf4j-api 2.1.0-alpha1`). Hide them with `-Dmaven.version.ignore='(?i).*(alpha|beta|rc|-m)[-.0-9]*'` (verified: the alpha disappears). Report updates; do not apply majors without asking.

Multi-module: a parent `pom.xml` with `<packaging>pom</packaging>`, `<modules>`, and `<dependencyManagement>`/`<pluginManagement>`; children inherit versions. Do not use `-Dmaven.test.failure.ignore` to get a green build.

## Gradle

```bash
./gradlew build                      # compile + test + check
./gradlew test --tests 'demo.OrdersTest'
./gradlew dependencies --configuration runtimeClasspath
./gradlew dependencyInsight --dependency slf4j-api --configuration runtimeClasspath
./gradlew --version                  # Gradle + JVM
```

Generate a wrapper: `gradle wrapper --gradle-version 9.8.1` (verified; creates `gradlew`, `gradlew.bat`, `gradle/wrapper/*`). Upgrade later with `./gradlew wrapper --gradle-version <v>` only when asked.

```kotlin
plugins { java }
repositories { mavenCentral() }
java { toolchain { languageVersion = JavaLanguageVersion.of(21) } }
tasks.withType<JavaCompile>().configureEach { options.release = 21 }
dependencies {
    implementation("org.slf4j:slf4j-api:2.0.20")
    runtimeOnly("ch.qos.logback:logback-classic:1.6.5")
    testImplementation(platform("org.junit:junit-bom:6.0.3"))
    testImplementation("org.junit.jupiter:junit-jupiter")
    testRuntimeOnly("org.junit.platform:junit-platform-launcher")
}
tasks.test { useJUnitPlatform() }
```

A toolchain makes Gradle pick or download the right JDK; keep the toolchain version equal to the release. Prefer a version catalog (`gradle/libs.versions.toml`) when the project already has one. Use `api` vs `implementation` only in `java-library` projects.

## Dependency hygiene

- BOMs: Maven `<scope>import</scope>` in `dependencyManagement`; Gradle `platform("group:bom:version")`.
- When a transitive version is wrong, find who brings it (`dependency:tree` / `dependencyInsight`), then override with `dependencyManagement` or a Gradle `constraints {}` block with a comment saying why.
- Do not mix two logging backends or two JSON/mapping libraries without reason; check the tree for duplicates (e.g. both `logback-classic` and `slf4j-simple`).
- Remove unused dependencies (`mvn dependency:analyze` reports used-undeclared and unused-declared; review by hand before deleting, since reflection and runtime-only libraries are false positives).
- Scope correctly: test libs `test`, JDBC drivers/logging backends `runtime`.

## Automated updates

Dependabot (`.github/dependabot.yml`), unverified here but standard:

```yaml
version: 2
updates:
  - package-ecosystem: maven        # or gradle
    directory: "/"
    schedule: { interval: weekly }
    groups:
      minor-and-patch:
        update-types: [minor, patch]
  - package-ecosystem: github-actions
    directory: "/"
    schedule: { interval: weekly }
```

Renovate (`renovate.json`) is the alternative; both need the user's consent to enable. Merge update PRs only when `verify` passes.

## Vulnerability scanning (unverified here)

Not run in this skill's verification (it needs network downloads of vulnerability databases and, for NVD, an API key). Pick what fits the project:

- GitHub Dependabot alerts / dependency review action (no build change).
- OWASP dependency-check Maven plugin `org.owasp:dependency-check-maven` (13.0.0 on Maven Central when this was written): `mvn org.owasp:dependency-check-maven:check -DnvdApiKeyEnvironmentVariable=NVD_API_KEY`; set `NVD_API_KEY` via CI secret, never in the repo or as a literal command-line value. The parameter tells the plugin which environment variable to read; exporting the variable alone does not configure it.
- OSV-Scanner (`osv-scanner scan source -r .`) reads `pom.xml`/Gradle lockfiles.

Report findings with the vulnerable artifact, the fixed version and whether it is direct or transitive; fix by raising the managed version, and run `verify`.
