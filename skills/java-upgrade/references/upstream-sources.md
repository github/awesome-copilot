# Upstream sources (java-upgrade)

Fetch the page for the **target** version before editing; prefer it over this skill when they conflict. Replace `N` with the target JDK (17, 21, 25).

## JDK

- OpenJDK release page (JEP list per release): <https://openjdk.org/projects/jdk/N/> (e.g. <https://openjdk.org/projects/jdk/21/>, <https://openjdk.org/projects/jdk/25/>)
- JEP index: <https://openjdk.org/jeps/0>
- Oracle JDK release notes (incompatible changes, removals): <https://www.oracle.com/java/technologies/javase/21-relnote-issues.html> (change `21` to the target)
- Oracle JDK migration guide: <https://docs.oracle.com/en/java/javase/21/migrate/getting-started.html> and <https://docs.oracle.com/en/java/javase/25/migrate/getting-started.html>
- Find removed or deprecated API usage: `jdeprscan` <https://docs.oracle.com/en/java/javase/21/docs/specs/man/jdeprscan.html>, `jdeps` <https://docs.oracle.com/en/java/javase/21/docs/specs/man/jdeps.html>
- Adoptium support and release schedule: <https://adoptium.net/support/>

## Build tools and agents

- Gradle / JDK compatibility matrix: <https://docs.gradle.org/current/userguide/compatibility.html>
- Maven Compiler Plugin (`release`, `--enable-preview`): <https://maven.apache.org/plugins/maven-compiler-plugin/>
- Lombok changelog: <https://projectlombok.org/changelog>
- Byte Buddy (used by Mockito/Hibernate; check the supported class file version): <https://bytebuddy.net/>
- JaCoCo changes (JDK support per release): <https://www.jacoco.org/jacoco/trunk/doc/changes.html>
- Mockito: <https://site.mockito.org/>

## Automation (OpenRewrite)

- `org.openrewrite.java.migrate.UpgradeToJava17`: <https://docs.openrewrite.org/recipes/java/migrate/upgradetojava17>
- `org.openrewrite.java.migrate.UpgradeToJava21`: <https://docs.openrewrite.org/recipes/java/migrate/upgradetojava21>
- `org.openrewrite.java.migrate.UpgradeToJava25`: <https://docs.openrewrite.org/recipes/java/migrate/upgradetojava25>

## Related tooling

- The external Microsoft plugin `modernize-java` (<https://github.com/microsoft/modernize-java>, listed in this repository's `plugins/external.json`) is the more powerful option for automated, large or multi-step upgrades (upgrade plan, build-fix loops, CVE validation). This skill works without it; see "Need a more powerful, automated upgrade?" in `SKILL.md`.
