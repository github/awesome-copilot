# CodeQL Build Modes for Compiled Languages

Detailed reference for how CodeQL handles compiled language analysis, including build modes, autobuild behavior, runner requirements, and hardware specifications.

## Build Modes Overview

CodeQL offers three build modes for compiled languages:

| Mode | Description | When to Use |
|---|---|---|
| `none` | Analyze source without building. Dependencies inferred heuristically. | Default setup; quick scans; interpreted-like analysis |
| `autobuild` | Automatically detect and run the build system. | When `none` produces inaccurate results; when Kotlin code is present |
| `manual` | User provides explicit build commands. | Complex build systems; autobuild failures; custom build requirements |

## C/C++

### Supported Build Modes
`none`, `autobuild`, `manual`

**Default setup mode:** `none`

### No Build (`none`)
- Infers compilation units through source file extensions
- Compilation flags and include paths inferred by inspecting the codebase
- No working build command needed

**Accuracy considerations:**
- May be less accurate if code depends heavily on custom macros/defines not in existing headers
- May miss accuracy when codebase has many external dependencies

**Improving accuracy:**
- Place custom macros/defines in header files included by source files
- Ensure external dependencies (headers) are available in system include directories or workspace
- Run extraction on the target platform (e.g., Windows runner for Windows projects)

### Autobuild

**Windows autodetection:**
1. Invoke `MSBuild.exe` on `.sln` or `.vcxproj` closest to root
2. If multiple files at same depth, attempts to build all
3. Falls back to build scripts: `build.bat`, `build.cmd`, `build.exe`

**Linux/macOS autodetection:**
1. Look for build system in root directory
2. If not found, search subdirectories for unique build system
3. Run appropriate configure/build command

**Supported build systems:** MSBuild, Autoconf, Make, CMake, qmake, Meson, Waf, SCons, Linux Kbuild, build scripts

### Runner Requirements (C/C++)
- **Ubuntu:** `gcc` compiler; may need `clang` or `msvc`. Build tools: `msbuild`, `make`, `cmake`, `bazel`. Utilities: `python`, `perl`, `lex`, `yacc`.
- **Auto-install dependencies:** Set `CODEQL_EXTRACTOR_CPP_AUTOINSTALL_DEPENDENCIES=true` (enabled by default on GitHub-hosted; disabled on self-hosted). Requires Ubuntu with passwordless `sudo apt-get`.
- **Windows:** `powershell.exe` in PATH

## C\#

### Supported Build Modes
`none`, `autobuild`, `manual`

**Default setup mode:** `none`

### No Build (`none`)
- Restores dependencies using heuristics from: `*.csproj`, `*.sln`, `nuget.config`, `packages.config`, `global.json`, `project.assets.json`
- Uses private NuGet feeds if configured for the organization
- Generates additional source files for accuracy:
  - Global `using` directives (implicit `using` feature)
  - ASP.NET Core `.cshtml` → `.cs` conversion

**Accuracy considerations:**
- Requires internet access or private NuGet feed
- Multiple versions of same NuGet dependency may cause issues (CodeQL picks newer version)
- Multiple .NET framework versions may affect accuracy
- Colliding class names cause missing method call targets

### Autobuild

**Windows autodetection:**
1. `dotnet build` on `.sln` or `.csproj` closest to root
2. `MSBuild.exe` on solution/project files
3. Build scripts: `build.bat`, `build.cmd`, `build.exe`

**Linux/macOS autodetection:**
1. `dotnet build` on `.sln` or `.csproj` closest to root
2. `MSbuild` on solution/project files
3. Build scripts: `build`, `build.sh`

### Injected Compiler Flags (Manual Builds)

The CodeQL tracer injects these flags into C# compiler invocations:

| Flag | Purpose |
|---|---|
| `/p:MvcBuildViews=true` | Precompile ASP.NET MVC views for security analysis |
| `/p:UseSharedCompilation=false` | Disable shared compilation server (required for tracer inspection) |
| `/p:EmitCompilerGeneratedFiles=true` | Write generated source files to disk for extraction |

> `/p:EmitCompilerGeneratedFiles=true` may cause issues with legacy projects or `.sqlproj` files.

### Runner Requirements (C#)
- **.NET Core:** .NET SDK (for `dotnet`)
- **.NET Framework (Windows):** Microsoft Build Tools + NuGet CLI
- **.NET Framework (Linux/macOS):** Mono Runtime (`mono`, `msbuild`, `nuget`)
- **`build-mode: none`:** Requires internet access or private NuGet feed

## Go

### Supported Build Modes
`autobuild`, `manual` (no `none` mode)

**Default setup mode:** `autobuild`

### Autobuild

Autodetection sequence:
1. Invoke `make`, `ninja`, `./build`, or `./build.sh` until one succeeds and `go list ./...` works
2. If none succeed, look for `go.mod` (`go get`), `Gopkg.toml` (`dep ensure -v`), or `glide.yaml` (`glide install`)
3. If no dependency managers found, rearrange directory for `GOPATH` and use `go get`
4. Extract all Go code (similar to `go build ./...`)

**Default setup** automatically detects `go.mod` and installs compatible Go version.

### Extractor Options

| Environment Variable | Default | Description |
|---|---|---|
| `CODEQL_EXTRACTOR_GO_OPTION_EXTRACT_TESTS` | `false` | Include `_test.go` files in analysis |
| `CODEQL_EXTRACTOR_GO_OPTION_EXTRACT_VENDOR_DIRS` | `false` | Include `vendor/` directories |

## Java/Kotlin

### Supported Build Modes
- **Java:** `none`, `autobuild`, `manual`
- **Kotlin:** `autobuild`, `manual` (no `none` mode)

**Default setup mode:**
- Java only: `none`
- Kotlin or Java+Kotlin: `autobuild`

> If Kotlin code is added to a repo using `none` mode, disable and re-enable default setup to switch to `autobuild`.

### No Build (`none`) — Java Only
- Runs Gradle or Maven for dependency information (not actual build)
- Queries each root build file; prefers newer dependency versions on clash
- Uses private Maven registries if configured

**Accuracy considerations:**
- Build scripts that can't be queried for dependencies may cause inaccurate guesses
- Code generated during normal build process will be missed
- Multiple versions of same dependency (CodeQL picks newer)
- Multiple JDK versions — CodeQL uses highest found; lower-version files may be partially analyzed
- Colliding class names cause missing method call targets

### Autobuild

**Autodetection sequence:**
1. Search root directory for Gradle, Maven, Ant build files
2. Run first found (Gradle preferred over Maven)
3. Otherwise, search for build scripts

**Build systems:** Gradle, Maven, Ant

### Runner Requirements (Java)
- JDK (appropriate version for the project)
- Gradle and/or Maven
- Internet access or private artifact repository (for `none` mode)

## Rust

### Supported Build Modes
`none`, `autobuild`, `manual`

**Default setup mode:** `none`

## Swift

### Supported Build Modes
`autobuild`, `manual` (no `none` mode)

**Default setup mode:** `autobuild`

**Runner requirement:** macOS runners only. Not supported on Actions Runner Controller (ARC) — Linux only.

> macOS runners are more expensive; consider scanning only the build step to optimize cost.

## Multi-Language Matrix Examples

### Mixed Build Modes

```yaml
strategy:
  fail-fast: false
  matrix:
    include:
      - language: c-cpp
        build-mode: manual
      - language: csharp
        build-mode: autobuild
      - language: java-kotlin
        build-mode: none
```

### Conditional Manual Build Steps

```yaml
steps:
  - name: Checkout
    uses: actions/checkout@v4

  - name: Initialize CodeQL
    uses: github/codeql-action/init@v4
    with:
      languages: ${{ matrix.language }}
      build-mode: ${{ matrix.build-mode }}

  - if: matrix.build-mode == 'manual'
    name: Build C/C++ code
    run: |
      make bootstrap
      make release

  - name: Perform CodeQL Analysis
    uses: github/codeql-action/analyze@v4
    with:
      category: "/language:${{ matrix.language }}"
```

### OS-Specific Runners

```yaml
strategy:
  fail-fast: false
  matrix:
    include:
      - language: javascript-typescript
        build-mode: none
        runner: ubuntu-latest
      - language: swift
        build-mode: autobuild
        runner: macos-latest
      - language: csharp
        build-mode: autobuild
        runner: windows-latest

jobs:
  analyze:
    runs-on: ${{ matrix.runner }}
```

## Hardware Requirements

### Recommended Specifications (Self-Hosted Runners)

| Codebase Size | Lines of Code | RAM | CPU Cores | Disk |
|---|---|---|---|---|
| Small | < 100K | 8 GB+ | 2 | SSD, ≥14 GB |
| Medium | 100K – 1M | 16 GB+ | 4–8 | SSD, ≥14 GB |
| Large | > 1M | 64 GB+ | 8 | SSD, ≥14 GB |

### Performance Tips
- Use SSD storage for all codebase sizes
- Ensure enough disk space for checkout + build + CodeQL data
- Use `--threads=0` to use all available CPU cores
- Enable dependency caching to reduce analysis time
- Consider `none` build mode where accuracy is acceptable — significantly faster than `autobuild`

## Dependency Caching

### Advanced Setup Workflows

```yaml
- uses: github/codeql-action/init@v4
  with:
    languages: java-kotlin
    dependency-caching: true
```

| Value | Behavior |
|---|---|
| `false` / `none` / `off` | Disabled (default for advanced setup) |
| `restore` | Restore existing caches only |
| `store` | Store new caches only |
| `true` / `full` / `on` | Restore and store caches |

Default setup on GitHub-hosted runners has caching enabled automatically.
