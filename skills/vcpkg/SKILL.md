---
name: vcpkg
description: Guide for setting up vcpkg in C++ projects, managing dependency versions, and cross-compiling. Covers manifest initialization, CMake and Visual Studio integration, classic-to-manifest migration, version pinning, baselines, overrides, triplets, and cross-compilation. Use when a user is working with vcpkg project setup, installation, version management, or cross-platform builds. For specialized tasks, additional references cover custom registries and overlay ports (references/registries.md), CI/CD and binary caching (references/ci.md), and troubleshooting and dependency lifecycle (references/troubleshooting.md).
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

If the user is working inside **Visual Studio** (not VS Code), prefer using the **in-box copy of vcpkg that ships with Visual Studio** rather than a standalone vcpkg clone, unless the user indicates they want to use a different installation. The VS-bundled vcpkg:
- Is located under the Visual Studio installation directory (e.g., `C:\Program Files\Microsoft Visual Studio\<version>\<edition>\VC\vcpkg\`)
- Is automatically integrated with MSBuild — no need to run `vcpkg integrate install`
- Stays up-to-date with Visual Studio updates
- Works out of the box with CMake projects opened via "Open Folder" or CMake presets

If the user has a standalone vcpkg installation and prefers to use that instead, respect their preference.

---

## Project Setup

### Initializing vcpkg in a New Project (Manifest Mode)

1. Create `vcpkg.json` in your project root:
```json
{
  "name": "my-project",
  "version": "1.0.0",
  "dependencies": []
}
```

2. Wire into CMakeLists.txt:
```cmake
cmake_minimum_required(VERSION 3.21)
project(my-project)

find_package(fmt CONFIG REQUIRED)
target_link_libraries(my-app PRIVATE fmt::fmt)
```

3. Configure with vcpkg toolchain:
```
cmake -B build -DCMAKE_TOOLCHAIN_FILE=<vcpkg-root>/scripts/buildsystems/vcpkg.cmake
```

### Adding vcpkg to an Existing Visual Studio Solution

1. Run `vcpkg integrate install` (one-time, system-wide)
2. Create `vcpkg.json` in the solution directory
3. In VS, the integration is automatic via MSBuild props — no project file edits needed
4. Or per-project: add to `.vcxproj`:
```xml
<Import Project="<vcpkg-root>\scripts\buildsystems\msbuild\vcpkg.props" />
<Import Project="<vcpkg-root>\scripts\buildsystems\msbuild\vcpkg.targets" />
```

### Classic-to-Manifest Migration

1. List what's currently installed: `vcpkg list`
2. Create `vcpkg.json` with those dependencies
3. Delete global installs: `vcpkg remove --outdated --recurse`
4. Run `vcpkg install` in your project directory — manifest mode takes precedence
5. Update your build system to use `CMAKE_TOOLCHAIN_FILE` if not already

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
```
vcpkg install curl[ssl,http2]
```

To discover available features for any port:
```
vcpkg search curl
```
Or check the port's `vcpkg.json` in the registry: `ports/curl/vcpkg.json` → look at the `"features"` object.

### Installing for a Specific Triplet

```
vcpkg install zlib:x64-linux
vcpkg install zlib:x64-windows
vcpkg install zlib:arm64-windows
```

In manifest mode, set the triplet via CMake:
```
cmake -B build -DVCPKG_TARGET_TRIPLET=x64-linux -DCMAKE_TOOLCHAIN_FILE=[vcpkg root]/scripts/buildsystems/vcpkg.cmake
```

Or set the environment variable:
```
set VCPKG_DEFAULT_TRIPLET=x64-linux
```

### Bulk-Adding Multiple Dependencies

In `vcpkg.json`, list them in the dependencies array:
```json
{
  "dependencies": ["catch2", "cxxopts", "toml11"]
}
```

In classic mode:
```
vcpkg install catch2 cxxopts toml11
```

Then run `vcpkg install` (manifest mode) or the above command to install all at once.

### Dev-Only Dependencies

Use the `"host"` field or place test dependencies under a feature:
```json
{
  "dependencies": [
    "fmt",
    "spdlog"
  ],
  "features": {
    "tests": {
      "description": "Build tests",
      "dependencies": ["gtest"]
    }
  }
}
```

Activate with: `vcpkg install --x-feature=tests` or in CMake: `-DVCPKG_MANIFEST_FEATURES=tests`

---

## Version Management

### Pinning a Specific Version

In `vcpkg.json`, use `"version>="` with overrides:
```json
{
  "dependencies": ["fmt"],
  "overrides": [
    {
      "name": "fmt",
      "version": "10.2.0"
    }
  ],
  "builtin-baseline": "<commit-sha>"
}
```

The `builtin-baseline` is **required** when using versioning. Get the latest baseline:
```
git -C <vcpkg-root> rev-parse HEAD
```

### Version Overrides

To force a specific version of a transitive dependency across your entire project, use `"overrides"` in `vcpkg.json`:
```json
{
  "dependencies": ["protobuf", "grpc"],
  "overrides": [
    {
      "name": "zlib",
      "version": "1.3.1"
    }
  ],
  "builtin-baseline": "<commit-sha>"
}
```

**Key points:**
- `overrides` takes precedence over all version constraints, including transitive ones
- You **must** have a `builtin-baseline` set for overrides to work
- The version must exist in the vcpkg registry at or after the baseline commit
- Use `vcpkg x-history zlib` to see available versions

### Updating the Baseline

The baseline is a Git commit SHA in the vcpkg repository that pins all port versions:
```json
{
  "builtin-baseline": "a1b2c3d4e5f6..."
}
```

To update to the latest:
```bash
cd <vcpkg-root>
git pull
git rev-parse HEAD
```
Then paste the new SHA into `builtin-baseline`.

**Important:** Updating the baseline may change versions of *all* dependencies. Use `overrides` to pin specific packages if needed.

---

## Cross-Platform

### Cross-Compiling for arm64

```
vcpkg install <packages>:arm64-linux
```

Or set the triplet in CMake:
```
cmake -B build -DVCPKG_TARGET_TRIPLET=arm64-linux -DCMAKE_TOOLCHAIN_FILE=$VCPKG_ROOT/scripts/buildsystems/vcpkg.cmake
```

You may need a cross-compilation toolchain installed (e.g., `aarch64-linux-gnu-gcc`).

For **arm64-windows**, just use the triplet directly — no cross-compiler needed on ARM64 Windows or with MSVC:
```
vcpkg install <packages>:arm64-windows
```

### Building for Android (NDK)

1. Set environment variables:
```bash
export ANDROID_NDK_HOME=/path/to/ndk
export VCPKG_DEFAULT_TRIPLET=arm64-android
```

2. Install packages:
```
vcpkg install <packages>:arm64-android
```

Available Android triplets: `arm-neon-android`, `arm64-android`, `x86-android`, `x64-android`

3. In CMake:
```
cmake -B build \
  -DCMAKE_TOOLCHAIN_FILE=$VCPKG_ROOT/scripts/buildsystems/vcpkg.cmake \
  -DVCPKG_TARGET_TRIPLET=arm64-android \
  -DVCPKG_CHAINLOAD_TOOLCHAIN_FILE=$ANDROID_NDK_HOME/build/cmake/android.toolchain.cmake \
  -DANDROID_ABI=arm64-v8a \
  -DANDROID_PLATFORM=android-24
```
