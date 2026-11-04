# Quarkus native images

Quarkus is handled by the `quarkus-native-and-container` skill, which is the source of truth for native builds, container-image builds and Kubernetes manifests. Hand off to it after framework detection.

- Native support is built into Quarkus; do not add the Native Build Tools plugin.
- Container builds (`-Dquarkus.native.container-build=true`) need no local GraalVM or Mandrel, only Docker or Podman.
- If the `quarkus-native-and-container` skill is not installed, see https://quarkus.io/guides/building-native-image.
