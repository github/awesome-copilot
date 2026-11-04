# Provenance

This skill and its references are adapted from **dr-jskill** by Julien Dubois (the contributor of this skill).

- Source: https://github.com/jdubois/dr-jskill
- Commit read: `29e71996048e4086bfa389268a3c6c2e49ea3f25`
- License of the source: Apache License 2.0 (https://www.apache.org/licenses/LICENSE-2.0)
- The adapted material is contributed to this repository by its original author (Julien Dubois, sole copyright holder of dr-jskill) under this repository's MIT license, and remains available upstream under Apache-2.0. Keep the attribution and this notice with any redistribution of the adapted files.

## Files adapted

| Source file in dr-jskill | Adapted into |
|--------------------------|--------------|
| `SKILL.md` | `SKILL.md` (rewritten, shortened, Maven and Gradle) |
| `versions.json`, `scripts/lib/versions.mjs` | `references/versions.md` (documented procedure and fallback values; script not copied) |
| `references/CONFIGURATION.md` | `references/configuration.md` (condensed) |
| `references/DATABASE.md` | `references/database.md` (condensed; Flyway/Liquibase noted as optional) |
| `references/LOGGING.md` | `references/logging.md` (condensed) |
| `references/SECURITY.md` | `references/security.md` (condensed to basics) |
| `references/DOCKER.md`, `assets/Dockerfile`, `assets/Dockerfile-native` | `references/docker.md`, `assets/Dockerfile`, `assets/Dockerfile-native` (front-end build steps removed) |
| `references/SPRING-BOOT-4.md` | `references/spring-boot-4.md` (condensed) |

## Changes

Changes were made: content was condensed, front-end, Azure, Git, CRaC and AOT material was removed (deferred), Gradle support was added, and scripts were replaced by documented `curl` procedures against start.spring.io.
