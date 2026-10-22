---
description: 'Pointer to the java-upgrade skill when changing the Java version in Maven or Gradle build files'
applyTo: '**/pom.xml, **/build.gradle, **/build.gradle.kts'
---

# Java Version Upgrades

When the task changes the Java version of this project (compiler release, toolchain, `java.version`), use the `java-upgrade` skill. It detects the current version and loads only the matching guide for Java 11 → 17, 17 → 21 or 21 → 25.

If the skill is not installed, install it with `gh skills install github/awesome-copilot java-upgrade` or copy `skills/java-upgrade/` from this repository.

- Upgrade one LTS version at a time and run the full test suite after each step.
- Check the minimum Java version supported by the project's frameworks and dependencies before raising the target.
