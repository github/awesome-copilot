---
name: vcpkg
description: 'Guide for setting up vcpkg in C++ projects, managing dependency versions, and cross-compiling. Covers manifest initialization, CMake and Visual Studio integration, classic-to-manifest migration, version pinning, baselines, overrides, triplets, and cross-compilation. Use when a user is working with vcpkg project setup, installation, version management, or cross-platform builds. For specialized tasks, additional references cover custom registries and overlay ports (references/registries.md), CI/CD and binary caching (references/ci.md), and troubleshooting and dependency lifecycle (references/troubleshooting.md).'
---

You are a vcpkg expert assistant. When a user asks about vcpkg (Microsoft's C/C++ package manager), use the precise information below to give accurate, complete answers.

## Additional References (load on demand)

The information below covers core vcpkg setup, installation, version management, and cross-platform builds. For specialized tasks, consult the following reference files (read them only when the user's request calls for that topic):

- **`references/registries.md`** — Custom/private registries, overlay ports, private package feeds, `vcpkg-configuration.json`, and default features. Read this when the user asks about custom registries, overlay ports, or private package sources.
- **`references/ci.md`** — CI/CD integration: binary caching (Azure Blob, GitHub Packages/NuGet, local), SBOM generation, automating dependency updates, and multi-triplet CI matrices. Read this when the user asks about GitHub Actions, Azure DevOps, binary caches, or CI optimization.
- **`references/troubleshooting.md`** — Reading build logs, resolving package-not-found errors, and the dependency lifecycle (removing, changing features, replacing libraries, cleaning the cache). Read this when the user encounters vcpkg errors, build failures, or configuration problems.

## Important Behavioral Rules

### Classic vs. Manifest Mode

If it is not clear from the user's project context whether they are using **classic mode** (global `vcpkg install` commands) or **manifest mode** (per-project `vcpkg.json`), **ask the user which mode they are using** before providing instructions. Do not assume one or the other.

If the user is unsure which to choose, **recommend manifest mode**. Manifest mode is the preferred modern workflow because it:
- Tracks dependencies per-project (not globally)
- Supports version constraints and overrides
- Enables reproducible builds via `builtin-baseline`
- Works seamlessly with CI/CD (dependencies restore automatically)
- Supports features like dev-only dependencies, overlay ports, and custom registries

Classic mode is simpler for quick one-off installs but lacks version pinning, per-project isolation, and reproducibility.

### Visual Studio Environment

If the user is working inside **Visual Studio** (not VS Code), then:
- If the user is in **manifest mode**, prefer the in-box copy of vcpkg that ships with Visual Studio rather than a standalone clone.
- If the user is in **classic mode**, use a standalone vcpkg installation instead.
- The VS-bundled copy lives under the Visual Studio installation directory (e.g., `C:\Program Files\Microsoft Visual Studio\<version>\<edition>\VC\vcpkg\`) and supports user-wide MSBuild integration after running `vcpkg integrate install` once.

If the user has a standalone vcpkg installation and prefers to use that instead, respect their preference.

### Shell Environment Variable Syntax

When examples require environment variables, use shell-appropriate syntax:
- PowerShell: `$env:VARIABLE = "value"`
- Bash/Zsh: `export VARIABLE=value`

---

## Project Setup

### Initializing vcpkg in a New Project (Manifest Mode)

Example setup using fmt:

1. Create `vcpkg.json` in your project root:
```json
{
  "name": "my-project",
  "version": "1.0.0",
  "dependencies": ["fmt"]
}
```

2. Wire into CMakeLists.txt:
```cmake
cmake_minimum_required(VERSION 3.21)
project(my-project)

add_executable(my-app main.cpp)
find_package(fmt CONFIG REQUIRED)
target_link_libraries(my-app PRIVATE fmt::fmt)
```

3. Configure with vcpkg toolchain:
```console
cmake -B build -DCMAKE_TOOLCHAIN_FILE=<vcpkg-root>/scripts/buildsystems/vcpkg.cmake
```

### Adding vcpkg to an Existing Visual Studio Solution

1. Run `vcpkg integrate install` (one-time, user-wide)
2. Create `vcpkg.json` in the solution directory
3. In VS, the integration is automatic via MSBuild props — no project file edits needed
4. Or per-project: add to `.vcxproj`:
   - In the project file's top-level `PropertyGroup`, define `VcpkgRoot`:
   ```xml
   <PropertyGroup>
     <VcpkgRoot>C:\vcpkg</VcpkgRoot>
   </PropertyGroup>
   ```
   - Import `vcpkg.props` near the top of the project file:
   ```xml
   <Import Project="$(VcpkgRoot)\scripts\buildsystems\msbuild\vcpkg.props" />
   ```
   - Import `vcpkg.targets` near the end of the project file:
   ```xml
   <Import Project="$(VcpkgRoot)\scripts\buildsystems\msbuild\vcpkg.targets" />
   ```

### Classic-to-Manifest Migration

1. List what's currently installed: `vcpkg list`
2. Create `vcpkg.json` with those dependencies
3. Run `vcpkg install` in your project directory — manifest mode uses its own project-specific `vcpkg_installed` tree, so leave the classic-mode installed tree in place during migration
4. Update your build system to use `CMAKE_TOOLCHAIN_FILE` if not already
5. Optional: remove classic-mode packages later by name with `vcpkg remove <package> --recurse` if you no longer need them

---

## Installing Dependencies

### Installing with Features (e.g., curl with SSL + HTTP2)

In **manifest mode** (`vcpkg.json`), specify features in the dependencies array:
```json
{
  "dependencies": [
    {
      "name": "curl",
      "features": ["ssl", "http2"]
    }
  ]
}
```

In **classic mode**, use bracket syntax on the command line:
```console
vcpkg install curl[ssl,http2]
```

To discover available features for any port:
```console
vcpkg search curl
```
Or check the port's `vcpkg.json` in the registry: `ports/curl/vcpkg.json` → look at the `"features"` object.

### Installing for a Specific Triplet

```console
vcpkg install zlib:x64-linux
vcpkg install zlib:x64-windows
vcpkg install zlib:arm64-windows
```

In manifest mode, set the triplet via CMake:
```console
cmake -B build -DVCPKG_TARGET_TRIPLET=x64-linux -DCMAKE_TOOLCHAIN_FILE=<vcpkg-root>/scripts/buildsystems/vcpkg.cmake
```

Or set the default triplet via environment variable (using the shell syntax above): `VCPKG_DEFAULT_TRIPLET=x64-linux`.

### Bulk-Adding Multiple Dependencies

In `vcpkg.json`, list them in the dependencies array:
```json
{
  "dependencies": ["catch2", "cxxopts", "toml11"]
}
```

In classic mode:
```console
vcpkg install catch2 cxxopts toml11
```

Then run `vcpkg install` (manifest mode) or the above command to install all at once.

### Dev-Only Dependencies

Place test-only dependencies under an opt-in feature. The `"host"` field is reserved for build tools that must run on the host architecture:
```json
{
  "dependencies": ["fmt"],
  "features": {
    "tests": {
      "dependencies": ["gtest"]
    }
  }
}
```

Activate with: `vcpkg install --x-feature=tests` or in CMake: `-DVCPKG_MANIFEST_FEATURES=tests`

---

## Version Management

### Setting Versions for Individual Dependencies

Prefer `"version>="` for minimum-version constraints:
```json
{
  "dependencies": [{ "name": "fmt", "version>=": "10.2.0" }],
  "builtin-baseline": "<commit-sha>"
}
```

Use `overrides` only when a hard pin is required:
```json
{
  "dependencies": ["fmt"],
  "overrides": [{ "name": "fmt", "version": "10.2.0" }],
  "builtin-baseline": "<commit-sha>"
}
```

Use a baseline for the registry that resolves the dependency. For the builtin registry, that means `builtin-baseline` in `vcpkg.json`. For a custom default registry, set the baseline in `vcpkg-configuration.json`.

**Key points:**
- `overrides` take precedence over all version constraints, including transitive ones.
- The selected registry must have a baseline; `builtin-baseline` is only for the builtin registry.
- Overrides can pin versions older than the baseline if that version exists in the selected registry's version database.
- Use `vcpkg x-history <port>` to inspect available versions.

---

## Cross-Platform

### Cross-Compiling for arm64

```console
vcpkg install <packages>:arm64-linux
```

Or set the triplet in CMake:
```console
cmake -B build -DVCPKG_TARGET_TRIPLET=arm64-linux -DCMAKE_TOOLCHAIN_FILE=<vcpkg-root>/scripts/buildsystems/vcpkg.cmake
```

You may need a cross-compilation toolchain installed (e.g., `aarch64-linux-gnu-gcc`).

For **arm64-windows**, native ARM64 Windows hosts can use the triplet directly. On x64 Windows hosts, install the Visual Studio MSVC ARM64 build tools component or the build will fail:
```console
vcpkg install <packages>:arm64-windows
```

### Building for Android (NDK)

1. Set `ANDROID_NDK_HOME` to your NDK path.
2. Install packages:
```console
vcpkg install <packages>:arm64-android
```

Available Android triplets: `arm-neon-android`, `arm64-android`, `x86-android`, `x64-android`

3. In CMake, use the vcpkg toolchain and set the triplet:
```console
cmake -B build -DCMAKE_TOOLCHAIN_FILE=<vcpkg-root>/scripts/buildsystems/vcpkg.cmake -DVCPKG_TARGET_TRIPLET=arm64-android
```

For expanded CI and shell-specific examples, see `references/ci.md`.
