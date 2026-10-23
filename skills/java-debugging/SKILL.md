---
name: java-debugging
description: 'Debug Java applications systematically: JDWP remote debugging, jdb, VS Code and IntelliJ attach, debugging Maven/Gradle tests, Spring Boot and Quarkus dev mode, containers, breakpoints/logpoints, and reading stack traces. Use when the user needs to find the cause of a Java bug, exception, wrong behavior, or failing test, or asks how to attach a debugger.'
---

# Java Debugging

Find the root cause of a Java defect with a reproducible, hypothesis-driven loop, and attach a debugger safely when logs are not enough.

## Safety rules

- Bind JDWP to loopback only (`127.0.0.1`). Never bind `*:5005` on a reachable network; use an SSH tunnel or `kubectl port-forward` for remote hosts.
- Use `suspend=n` for running applications. `suspend=y` is acceptable only for short local test runs bound to loopback (waiting for the IDE to attach). Never leave a debug agent enabled on production; JDWP gives full code execution to whoever connects.
- Do not attach a debugger to production without explicit user instruction. Prefer reproducing locally or use read-only diagnostics (see the `java-diagnostics` skill).
- `JAVA_TOOL_OPTIONS` is picked up by every JVM started in that environment (build tools, forked test JVMs, child processes), causing `Address already in use` clashes. Prefer scoping the flag to the one process you want to debug.

## Method

Reproduce deterministically, minimize, read the evidence ([stack traces](references/stack-traces.md)), test one falsifiable hypothesis with the least intrusive tool (log line or logpoint before breakpoints), then add a regression test and remove debug flags and temporary logging.

## Version-dependent behavior (verified)

- **Helpful NullPointerException messages** (JEP 358) are off by default in JDK 14 (`-XX:+ShowCodeDetailsInExceptionMessages`) and on by default from JDK 15 (JEP 358 documents the message format). Source: <https://openjdk.org/jeps/358>.
- JDWP bare `address=5005` binds all interfaces before JDK 9 and loopback from JDK 9 (see below).
- Gradle `--debug-jvm` passes a bare address, so on JDK 8 it listens on all interfaces.

## Attach a debugger (JDWP)

Start the JVM:

```bash
java -agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=127.0.0.1:5005 -jar app.jar
```

Always write the explicit `127.0.0.1:5005` on every JDK version: a bare `address=5005` listens on all interfaces before JDK 9 and only on loopback from JDK 9. On JDK 8 and older, the `host:port` form may not be honored, so also restrict access with a firewall or tunnel.

Attach with `jdb`:

```bash
jdb -attach 127.0.0.1:5005
# stop in com.example.OrderService.place | stop at com.example.OrderService:42
# cont | next | step | locals | print order | where | catch java.lang.NullPointerException
```

### VS Code (Extension Pack for Java)

`.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "java",
      "name": "Attach to JVM",
      "request": "attach",
      "hostName": "127.0.0.1",
      "port": 5005
    }
  ]
}
```

### IntelliJ IDEA

Run | Edit Configurations | + | Remote JVM Debug; host `127.0.0.1`, port `5005`, debugger mode Attach. The dialog shows the matching JVM argument string.

## Debug tests and frameworks

| Scenario | Command (port 5005) |
|----------|---------------------|
| Maven Surefire unit test | `mvn test -Dmaven.surefire.debug -Dtest=OrderServiceTest` |
| Maven Failsafe IT | `mvn verify -Dmaven.failsafe.debug -Dit.test=OrderIT` |
| Gradle test | `gradle test --debug-jvm --tests '*OrderServiceTest'` |
| Spring Boot (Maven) | `mvn spring-boot:run -Dspring-boot.run.jvmArguments="-agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=127.0.0.1:5005"` |
| Spring Boot (Gradle) | Configure `bootRun` as below, then `gradle bootRun` (loopback, no suspend) |
| Quarkus dev mode | `mvn quarkus:dev` (debug port 5005 open by default; `-Ddebug=5006` changes it, `-Ddebug=false` disables) |

Surefire/Failsafe debug mode and `--debug-jvm` suspend until a debugger attaches, which is fine for a local run. Surefire and Failsafe accept a custom agent string instead of the bare flag, e.g. `-Dmaven.surefire.debug="-agentlib:jdwp=transport=dt_socket,server=y,suspend=y,address=127.0.0.1:5005"`. Verified listeners on `127.0.0.1` (via `lsof -nP -iTCP:5005 -sTCP:LISTEN`) for Gradle 9.7 `--debug-jvm`, Maven Surefire 3.5 `-Dmaven.surefire.debug` and Quarkus 3.40 dev mode on JDK 26; Gradle 7.6.4, 8.0.2 (JDK 17), 8.5 (JDK 21) and 8.14.3 also listened on `127.0.0.1`. Gradle passes a bare `address=5005` (no host), so the bind address comes from the JDK: loopback on JDK 9+, but all interfaces (`0.0.0.0:5005`, checked in an `eclipse-temurin:8-jdk` container with Gradle 7.6.4 and 8.14.3) on JDK 8. Older Gradle/plugin versions were not tested; run the same `lsof` check and use an explicit loopback agent on shared networks or JDK 8.

Explicit Gradle configuration (Gradle 7.6+; `debugOptions.host` was added in 7.6; Kotlin DSL):

```kotlin
tasks.withType<Test> {
    debugOptions { enabled.set(true); host.set("127.0.0.1"); port.set(5005); server.set(true); suspend.set(true) }
}

// BootRun extends JavaExec, not Test; configure it separately when the Boot plugin is applied.
tasks.named<JavaExec>("bootRun") {
    debugOptions { enabled.set(true); host.set("127.0.0.1"); port.set(5005); server.set(true); suspend.set(false) }
}
```

Then run `gradle test --tests '*OrderServiceTest'` or `gradle bootRun`, without `--debug-jvm` (which enables suspension). Configure only the task you are debugging; do not run both listeners on port 5005 at once. For Gradle before 7.6, use `jvmArgs("-agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=127.0.0.1:5005")` on the target task instead (`suspend=y` for local tests), without also enabling `debugOptions` or `--debug-jvm`. On JDK 8 and older, retain the firewall/tunnel precaution above.

## Containers

Publish the port to loopback only and let the JVM listen inside the container:

```bash
docker run --rm -p 127.0.0.1:5005:5005 \
  -e JAVA_TOOL_OPTIONS="-agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=*:5005" my-app
```

Inside the container the agent must bind `*` for the port mapping to work, so JDWP (full code execution) is reachable by every other container on the same Docker network; the `127.0.0.1:` mapping only blocks access from other hosts. Use this only on a developer machine where no untrusted containers share the network: run it on a dedicated user-defined network (not the shared default bridge) containing only this container, or keep the agent on `127.0.0.1` inside the container and reach it with `docker exec`/`kubectl port-forward` style forwarding instead of publishing it. For Kubernetes use `kubectl port-forward pod/<name> 5005:5005` against a dev/staging pod only.

## Common pitfalls

- **Hot code replace** only swaps method bodies; adding/removing methods or fields or changing signatures needs a restart (or Quarkus dev mode / Spring DevTools).
- **Missing debug info**: code compiled without `-g` shows unavailable variables (Maven and Gradle include it by default). In lambdas, step into the lambda body.
- **Heisenbugs/races**: pausing changes timing. Prefer logpoints, thread dumps, or JFR; suspend only the current thread, not all threads.
- **Async and reactive code**: stack traces show scheduler frames, not the caller. Use IDE async stack traces, correlation IDs, or Reactor `Hooks.onOperatorDebug()` in dev only.
- **Virtual threads (JDK 21+)**: there can be thousands; use `jcmd <pid> Thread.dump_to_file -format=json file.json` for an overview.
- **Timeouts**: long pauses can trip HTTP, DB, or heartbeat timeouts; raise them locally.
- **toString() side effects**: debugger evaluation calls `toString()`, which may trigger lazy loading or mutate state.

## Optional code-navigation aid

If the Copilot CLI `lsp` tool is configured (see the `lsp-setup` skill), go-to-definition, find-references, and call hierarchy help trace the execution path. It is optional; grep and reading code work as well.

## References

- [Reading stack traces](references/stack-traces.md)
- For runtime symptoms (CPU, memory, deadlocks, slow startup) use the `java-diagnostics` skill.

Official tool docs (prefer them over this skill for the JDK in use; change `21` to your version): `jcmd` <https://docs.oracle.com/en/java/javase/21/docs/specs/man/jcmd.html>, JDK troubleshooting guide <https://docs.oracle.com/en/java/javase/21/troubleshoot/>.
