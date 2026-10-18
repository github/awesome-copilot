---
name: quarkus-native-and-container
description: 'Build Quarkus native executables (Mandrel/GraalVM), fix native failures with reflection registration, test the native binary, and produce container images and Kubernetes/OpenShift manifests. Use for native, Docker, Jib or Kubernetes work in a Quarkus project.'
---

# Quarkus Native and Container

Check the project's Quarkus version first. For generic (non-Quarkus) GraalVM work, use the optional `java-add-graalvm-native-image-support` skill if installed (otherwise see the GraalVM docs, <https://www.graalvm.org/latest/reference-manual/native-image/>).

## Native build

```bash
# container build: no local GraalVM needed (Docker/Podman required)
./mvnw package -Dnative -Dquarkus.native.container-build=true
# local Mandrel/GraalVM (JAVA_HOME / GRAALVM_HOME must point to it)
./mvnw package -Dnative
# Gradle, Quarkus 3.10+ (add -Dquarkus.native.container-build=true without a local Mandrel)
./gradlew build -Dquarkus.native.enabled=true -Dquarkus.package.jar.enabled=false
# Gradle, older Quarkus
./gradlew build -Dquarkus.package.type=native
```

`quarkus.package.type` was deprecated in 3.10 (the 3.10 migration guide replaces it with `quarkus.native.enabled` and `quarkus.package.jar.*`); it is still accepted in 3.40 with a warning. Version gate verified with Gradle: on 3.9.5 `-Dquarkus.native.enabled=true -Dquarkus.package.jar.enabled=false` is ignored ("Unrecognized configuration key" warnings) and only a JVM `quarkus-app` is built, while `-Dquarkus.package.type=native` produces the native runner; on 3.10.0, 3.27.6 and 3.40.1 the new keys produce the native runner (3.10.0 also accepts the old key with the deprecation warning). The Maven `native` profile in the generated `pom.xml` already sets `quarkus.native.enabled=true`, `quarkus.package.jar.enabled=false` and `skipITs=false` when `-Dnative` is passed.

Local build verified on macOS arm64 with the Mandrel tarball for your Quarkus line from <https://github.com/graalvm/mandrel/releases> (`mandrel-java25-macos-aarch64-25.0.4.1-Final.tar.gz` for 3.40.1, extracted anywhere, `JAVA_HOME` pointing at its `Contents/Home`; Xcode command line tools are enough): 3.40.1 Maven `package -Dnative` took about 70 s and Gradle `build` with the two flags about 2.5 min; the runner is a Mach-O executable that starts in about 0.04 s, and `./mvnw verify -Dnative` ran the `*IT` against it successfully. Quarkus checks the Mandrel/GraalVM version: 3.40 refuses 23.1 ("Out of date version of GraalVM or Mandrel detected ... Quarkus currently supports 25.0.0"), so use Mandrel 25 with 3.40 and `mandrel-java21-macos-aarch64-23.1.12.1-Final` with 3.27.6 (Maven `verify -Dnative` and Gradle both verified there).

Binary: `target/*-runner` (Maven) or `build/*-runner` (Gradle). A container build on macOS or Windows produces a Linux ELF that cannot run on the host: run it in a Linux container (for example `docker run -v "$PWD/target:/w:ro" registry.access.redhat.com/ubi9/ubi-minimal /w/<name>-runner` with the datasource passed through `QUARKUS_DATASOURCE_*` env vars), and note that `./mvnw verify -Dnative` then fails in the `*IT` with `Exit code is: '126'`. Mandrel is Red Hat's GraalVM distribution for Quarkus; the container build pulls a Mandrel builder image matching the project (3.40.1 used `quay.io/quarkus/ubi9-quarkus-mandrel-builder-image:jdk-25`, Mandrel 25.0.4.1, about 2.5 minutes including the image pull); override it with `quarkus.native.builder-image` if needed. Native builds are slow and memory-hungry (several GB); do them in CI or on demand, not on every test run.

## Common native failures

| Symptom | Fix |
|---|---|
| `ClassNotFoundException` / `NoSuchMethodException` at runtime (reflection, JSON serialization of DTOs) | annotate with `@RegisterForReflection` (or `@RegisterForReflection(targets = ...)` on a holder class for third-party types), or put a `reflection-config.json` in `src/main/resources` and set `quarkus.native.additional-build-args=-H:ReflectionConfigurationFiles=reflection-config.json` |
| Missing resource files | `quarkus.native.resources.includes=templates/**` |
| Library not supporting native | look for a Quarkus extension, or choose another library |
| Class initialized at build time breaks | `--initialize-at-run-time=...` through `quarkus.native.additional-build-args` |
| `OutOfMemoryError` during build | raise container memory or `quarkus.native.native-image-xmx` |
| Dynamic proxies / serialization | register via annotations or extension |

```java
@RegisterForReflection(targets = ExternalDto.class)
public record ProductDto(String name) {}
```

Prefer Quarkus extensions (they register reflection automatically) over raw libraries. Verified: a Panache + Quarkus REST app built natively and served JSON with a record DTO; Quarkus REST registers returned types itself, so `@RegisterForReflection` is mainly needed for types reached only reflectively (custom serialization, third-party types). Both rows were reproduced on 3.40.1 (local Mandrel 25): a resource calling `Class.forName("org.acme.Hidden").getDeclaredConstructor().newInstance()` returned HTTP 500 `ClassNotFoundException: org.acme.Hidden` in the native binary, and worked after adding `src/main/resources/reflection-config.json` (`[{ "name": "org.acme.Hidden", "allDeclaredConstructors": true }]`) with the documented `-H:ReflectionConfigurationFiles=reflection-config.json` (the relative file name resolves from `src/main/resources`). For the run-time initialization row, a `static final java.util.Random` in a class forced to build-time init (`--initialize-at-build-time=org.acme.Holder`) failed the build with "Detected an instance of Random/SplittableRandom class in the image heap ... mark it explicitly for run time initialization with '--initialize-at-run-time=<culprit>'"; switching to `--initialize-at-run-time=org.acme.Holder` fixed it, also combined with the reflection flag in one comma-separated `quarkus.native.additional-build-args`. Quarkus's generated native-image feature calls `RuntimeClassInitialization.initializeAtBuildTime("")` and then applies explicit run-time overrides, so classes default to build-time initialization. Your own static initializers (random seeds, clocks, env reads, threads) can therefore cause this failure too, not only libraries.

## Test the native binary

```java
@QuarkusIntegrationTest
class GreetingResourceIT extends GreetingResourceTest {}
```

```bash
./mvnw verify -Dnative
```

`@QuarkusIntegrationTest` black-box tests run in the `verify` phase (Failsafe) against the native binary; no CDI injection.

## Container images

```bash
quarkus extension add container-image-jib      # or container-image-docker
./mvnw package -Dquarkus.container-image.build=true
./mvnw package -Dnative -Dquarkus.native.container-build=true -Dquarkus.container-image.build=true
```

`container-image-jib` needs no Docker daemon to push: with `DOCKER_HOST` pointing at a non-existent socket, `./mvnw package -Dquarkus.container-image.build=true -Dquarkus.container-image.push=true -Dquarkus.container-image.registry=localhost:5055 -Dquarkus.container-image.insecure=true -Dquarkus.container-image.group=acme` pushed `acme/q340m:1.0.0-SNAPSHOT` to a local `registry:2` (3.40.1, JVM image). Without `push=true` Jib loads the image into a local Docker/Podman and fails with `Cannot get an executable name when no container runtime is available` when none is reachable. A tar-only output was not found or tested; the pushed image was not run.

Dockerfiles for manual builds live in `src/main/docker` (`Dockerfile.jvm`, `Dockerfile.native`, `Dockerfile.native-micro`). Set `quarkus.container-image.registry/group/name/tag`, and `-Dquarkus.container-image.push=true` to push. Use pinned base-image tags and run as non-root.

## Kubernetes / OpenShift

```bash
quarkus extension add kubernetes     # or: quarkus extension add openshift
./mvnw package
```

Manifests are generated in `target/kubernetes/kubernetes.yml` (and `.json`) for the `kubernetes` extension, and in `target/kubernetes/openshift.yml` for `openshift`. Customize via properties; the prefix follows the target (`quarkus.kubernetes.*` for Kubernetes, `quarkus.openshift.*` for OpenShift):

```properties
quarkus.kubernetes.replicas=2
quarkus.kubernetes.ingress.expose=true
quarkus.kubernetes.env.secrets=app-secrets
quarkus.kubernetes.resources.requests.memory=128Mi
```

The generated Deployment has no probes by default; with `quarkus-smallrye-health` installed it includes liveness, readiness and startup probes (`/q/health/live`, `/q/health/ready`, `/q/health/started`), and it sets `envFrom.secretRef` for `env.secrets` (verified on 3.40.1). Deploy with `quarkus.kubernetes.deploy=true` or `kubectl apply -f target/kubernetes/kubernetes.yml`. On OpenShift use the same properties under `quarkus.openshift.*`, expose the service with a Route via `quarkus.openshift.route.expose=true` (Kubernetes uses `quarkus.kubernetes.ingress.expose=true` instead), and apply with `oc apply -f target/kubernetes/openshift.yml` (or `quarkus.openshift.deploy=true`). Review generated YAML before applying; keep secrets out of it.

See also: native executables <https://quarkus.io/guides/building-native-image>; upgrades via `quarkus update` (<https://quarkus.io/guides/update-quarkus>); GraalVM release notes <https://www.graalvm.org/release-notes/>.
