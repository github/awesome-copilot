# vcpkg: CI/CD & DevOps

Reference for the `vcpkg` skill. Use this when a user asks about using vcpkg in CI/CD pipelines, configuring binary caching, setting up devcontainers, generating SBOMs, or automating dependency updates (GitHub Actions, Azure DevOps, binary cache configuration, CI optimization).

## Binary Caching

Configure binary caching to avoid rebuilding packages:

**Azure Blob Storage:**
```
set VCPKG_BINARY_SOURCES=clear;x-azblob,https://myaccount.blob.core.windows.net/vcpkg-cache,<sas-token>,readwrite
```

**GitHub Packages (NuGet):**
```
set VCPKG_BINARY_SOURCES=clear;nuget,https://nuget.pkg.github.com/your-org/index.json,readwrite
```

**Local filesystem:**
```
set VCPKG_BINARY_SOURCES=clear;files,C:/vcpkg-cache,readwrite
```

**Sharing between CI and local dev:** Use the same remote cache (Azure Blob or NuGet feed) in both environments. CI writes (`readwrite`), developers read (`read`):
```
# CI (writes cache)
set VCPKG_BINARY_SOURCES=clear;x-azblob,https://myaccount.blob.core.windows.net/cache,<sas>,readwrite

# Developer (reads cache)
set VCPKG_BINARY_SOURCES=clear;x-azblob,https://myaccount.blob.core.windows.net/cache,<sas>,read
```

---

## Generating an SBOM (Software Bill of Materials)

vcpkg can generate an SBOM in SPDX format:
```
vcpkg install --x-write-nuget-packages-config=packages.config
```

For manifest mode, after install check `vcpkg_installed/<triplet>/share/` for SPDX files. Each installed port generates an SPDX JSON document at:
```
vcpkg_installed/<triplet>/share/<port>/sbom.spdx.json
```

To aggregate: use `vcpkg x-package-info --x-installed` to list all packages and versions, then feed into your SBOM toolchain (e.g., Microsoft SBOM Tool, CycloneDX).

---

## Automating Dependency Updates

Option 1: **Dependabot** (GitHub) — configure `.github/dependabot.yml`:
```yaml
version: 2
updates:
  - package-ecosystem: "vcpkg"
    directory: "/"
    schedule:
      interval: "weekly"
```

Option 2: **Script-based** — create a scheduled CI job that:
1. Updates the vcpkg clone (`git pull`)
2. Gets the new baseline (`git rev-parse HEAD`)
3. Updates `builtin-baseline` in `vcpkg.json`
4. Runs `vcpkg install` to verify
5. Opens a PR with the changes

---

## Multi-Triplet CI Testing

Test across multiple triplets in a CI matrix:
```yaml
# GitHub Actions example
strategy:
  matrix:
    triplet: [x64-windows, x64-linux, x64-osx]
    include:
      - triplet: x64-windows
        os: windows-latest
      - triplet: x64-linux
        os: ubuntu-latest
      - triplet: x64-osx
        os: macos-latest

steps:
  - uses: actions/checkout@v4
  - name: Install vcpkg
    run: |
      git clone https://github.com/microsoft/vcpkg
      ./vcpkg/bootstrap-vcpkg.sh
  - name: Install dependencies
    run: vcpkg install --triplet ${{ matrix.triplet }}
```
