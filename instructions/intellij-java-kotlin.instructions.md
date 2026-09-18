---
description: 'Guidance for Java and Kotlin development in IntelliJ IDEA with portable Gradle/Maven builds, safe IDE workflows, and CI-aligned validation.'
applyTo: '**/*.java, **/*.kt, **/*.kts, **/*.gradle, **/gradle.properties, **/gradle/*.versions.toml, **/gradle/wrapper/gradle-wrapper.properties, **/gradlew, **/gradlew.bat, **/pom.xml, **/.mvn/**, **/mvnw, **/mvnw.cmd, **/.idea/**, **/*.iml, **/.run/*.run.xml'
---

# IntelliJ IDEA Java and Kotlin Development

Use these instructions for Java and Kotlin projects developed in IntelliJ IDEA. Follow repository-specific conventions first and apply language- or framework-specific guidance only when relevant. IDE actions are optional developer workflows: do not assume Copilot can operate the IDE or claim to have performed actions without tool evidence. Do not require paid IntelliJ features or additional IDE plugins.

## Project Model and Build Configuration

- Treat Gradle or Maven configuration, repository documentation, and CI workflows as the source of truth. Inspect the build files and existing module layout before changing code.
- Import or reload the project from its Gradle settings or Maven root POM. Define dependencies, repositories, source sets, compiler options, and test tasks in the build files rather than only in IntelliJ Project Structure.
- Use the repository's Gradle or Maven wrapper when present. Preserve wrapper versions, dependency catalogs, lockfiles, parent POMs, and dependency-management conventions; do not upgrade tooling as a side effect of an unrelated change.
- Align the IntelliJ project SDK, module SDKs, language level, Gradle JVM, and Maven runner/importer JDK with the build configuration. Distinguish the JDK running the build tool from compilation toolchains and target bytecode; they may intentionally differ. Do not select the newest installed JDK or enable preview features unless the repository requires them.
- After build changes, reload the Gradle or Maven project and resolve synchronization errors before interpreting IDE diagnostics. Fix missing dependencies and source roots in the build model rather than manually adding local JARs or machine-specific paths.

## Editing, Navigation, and Refactoring

- Follow the repository's `.editorconfig`, formatter, import order, and inspection settings. Use configured checks such as Spotless, Checkstyle, ktlint, or detekt only when already present; avoid unrelated whole-file reformatting or new formatter dependencies.
- Use Go to Declaration, Find Usages, and type or call hierarchies to understand a change. Also search configuration, reflection-based lookups, serialization names, and framework conventions that static IDE navigation may miss.
- Prefer semantic Rename, Move, Change Signature, Extract Method, and Safe Delete refactorings over textual replacement when available. Preview the affected usages and review the diff, including Java/Kotlin interop, public APIs, resources, and tests.
- Treat inspections and quick fixes as suggestions, not authority. Check them against the configured language level and project behavior; do not blanket-suppress warnings, weaken inspections, or change compiler settings merely to remove highlighting.
- If IDE actions are unavailable, make equivalent source/build edits with available tools and validate them from the command line. Do not add IDE automation or plugins just to complete a code change.

## Running, Debugging, and Testing

- Match run/debug configurations to the intended module classpath, JDK, working directory, JVM options, application arguments, environment, and active profiles. Keep secrets in the existing environment or secret-management mechanism, not in shared run configurations.
- Use Gradle/Maven tool windows or delegated build/test execution when the project relies on build-tool tasks, generated sources, or custom test setup. An IntelliJ-only compilation or green gutter test is not a substitute for the CI command.
- Use breakpoints, conditional breakpoints, watches, and exception breakpoints to investigate failures. Evaluate expressions cautiously because method calls can mutate state; do not introduce production behavior changes just to simplify debugging.
- Add or update focused tests in the repository's existing framework, source set, naming style, and assertion conventions. Preserve the distinction between unit and integration tests, including required services, profiles, fixtures, and test discovery rules.
- Keep run configurations local unless the repository explicitly shares them. When shared, prefer project-relative paths and documented environment requirements so another developer can reproduce the run.

## Kotlin Conventions

- Preserve the configured Kotlin language/API version, JVM target, and Java interoperability conventions. Do not accept IDE conversions that require a newer compiler or change Java-facing signatures unintentionally.
- Model nullability explicitly, especially at Java platform-type boundaries. Prefer safe calls, Elvis expressions, and explicit validation over introducing `!!` or unchecked casts to silence diagnostics.
- When coroutines are used, follow the existing scope, dispatcher, and lifecycle conventions. Prefer structured concurrency; do not introduce `GlobalScope`, block coroutine threads with `runBlocking`, or swallow cancellation exceptions.
- Use the project's existing coroutine test utilities and controlled dispatchers for asynchronous tests rather than sleeps or timing-dependent assertions.

## Spring Boot Projects

- Follow the existing Spring Boot version, dependency management, package layout, configuration format, profiles, and testing conventions. Do not add Spring Boot to a project that does not use it.
- Prefer the repository's constructor-injection patterns. Preserve component scanning, configuration-property binding, transaction boundaries, and validation behavior when refactoring.
- For Kotlin Spring or JPA code, preserve the build's existing compiler-plugin setup, such as `kotlin-spring` or `kotlin-jpa`, and check annotation use-site targets. Do not make every class `open` or add no-argument constructors simply to satisfy an IDE warning.
- Keep application startup and tests runnable through the existing build tasks or executable artifact. Spring-specific IDE dashboards and inspections are optional, never a prerequisite.

## Annotation Processing and Generated Sources

- Configure annotation processors and code generation in Gradle or Maven, including existing `annotationProcessor`, KSP, or kapt configuration as appropriate. Do not enable a processor only in IntelliJ or migrate between processing mechanisms without a task requirement.
- For unresolved generated types, first run the configured generation/compile task and reload the build model. Check processor dependencies, task ordering, and generated-source directories before treating the issue as an IDE cache problem.
- Treat generated sources as outputs: edit the source annotations, schemas, templates, or generator configuration instead. Do not hand-edit generated classes or copy them into normal source roots.
- Keep generated-source registration and dependencies reproducible in the build. IntelliJ source-root markings or annotation-processing settings must reflect that configuration, not replace it.

## Version Control Hygiene

- Respect `.gitignore` and existing tracking policy. Do not require committing `.idea/`, `*.iml`, or `.run/` files to build or test the project.
- Keep user-specific state such as `.idea/workspace.xml`, local histories, caches, absolute SDK paths, and credentials out of commits. Share only explicitly approved project settings, such as code styles, inspection profiles, or portable run configurations.
- Keep generated outputs such as `build/`, `target/`, `out/`, and `.gradle/` out of version control unless the repository explicitly requires them. Do not confuse the `.gradle/` cache with versioned Gradle wrapper files under `gradle/wrapper/`.
- Preserve intentionally tracked wrapper scripts, wrapper configuration, and required wrapper JARs. Review the diff after IDE synchronization to avoid committing incidental metadata churn.

## Command-Line Validation

- Run the same wrapper, JDK/toolchain configuration, tasks or Maven phases, profiles, and relevant environment settings as CI. Start with focused checks, then run the required broader build, formatting, static-analysis, unit-test, and integration-test checks.
- For a project that provides these tasks, a focused Gradle example is `./gradlew test --tests 'com.example.ExampleTest'`, followed by `./gradlew build`. Use the appropriate module task in a multi-project build and include any additional checks CI runs.
- For a project using the standard Maven test lifecycle, a focused example is `./mvnw -Dtest=ExampleTest test`, followed by `./mvnw verify`. Adapt module selection and profiles to the repository, and verify that integration tests are actually configured and executed.
- In Windows PowerShell, use `.\gradlew.bat` or `.\mvnw.cmd` with the equivalent arguments. If no wrapper exists, use the build-tool version documented by the repository rather than introducing a wrapper without agreement.
- Diagnose IDE/CLI differences by comparing JDKs, classpaths, profiles, generated sources, working directories, and environment settings. Do not fix an IDE-only failure by weakening CI checks.
- Report the commands run and their outcomes. If a check cannot run because a required tool, service, or credential is unavailable, state the limitation explicitly rather than claiming success.
