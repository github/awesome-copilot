# vcpkg: CI/CD & DevOps

Reference for the `vcpkg` skill. Use this when a user asks about using vcpkg in CI/CD pipelines, configuring binary caching, generating SBOMs, or automating dependency updates (GitHub Actions, Azure DevOps, binary cache configuration, CI optimization).

## Binary Caching

Configure binary caching to avoid rebuilding packages:

**Azure Blob Storage:**
```powershell
$env:VCPKG_BINARY_SOURCES = "clear;x-azblob,https://myaccount.blob.core.windows.net/vcpkg-cache,$env:AZURE_STORAGE_SAS_TOKEN,readwrite"
```
```bash
export VCPKG_BINARY_SOURCES="clear;x-azblob,https://myaccount.blob.core.windows.net/vcpkg-cache,$AZURE_STORAGE_SAS_TOKEN,readwrite"
```

**GitHub Packages (NuGet):**
```powershell
$env:VCPKG_BINARY_SOURCES = "clear;nuget,https://nuget.pkg.github.com/your-org/index.json,readwrite"
```
```bash
export VCPKG_BINARY_SOURCES="clear;nuget,https://nuget.pkg.github.com/your-org/index.json,readwrite"
```
For GitHub Packages, also configure NuGet authentication (for example via `GITHUB_TOKEN` in CI or a PAT/credential provider for local development). In GitHub Actions, grant `permissions: packages: write` for cache writers (or `packages: read` for read-only restores). Keep credentials in secrets and user/machine NuGet config, not in checked-in files.

**CI-friendly (cross-platform) GitHub Actions pattern:**
```yaml
permissions:
  contents: read
  packages: write

env:
  VCPKG_BINARY_SOURCES: clear;nuget,https://nuget.pkg.github.com/your-org/index.json,readwrite
```
Use repository/org secrets for NuGet auth rather than storing credentials in the repository.

**Local filesystem:**
```powershell
$env:VCPKG_BINARY_SOURCES = "clear;files,C:\vcpkg-cache,readwrite"
```
```bash
export VCPKG_BINARY_SOURCES="clear;files,/var/tmp/vcpkg-cache,readwrite"
```

**Sharing between CI and local dev:** Use the same remote cache source in both environments and switch only the final mode token: CI uses `readwrite`, developers use `read`.

---

## Generating an SBOM (Software Bill of Materials)

vcpkg emits per-port SPDX SBOM files during normal source builds; no special SBOM flag is required.
```console
vcpkg install
```

Each installed port writes:
```text
<installed-root>/<triplet>/share/<port>/vcpkg.spdx.json
```

`<installed-root>` depends on integration mode:
- CLI manifest mode: `<manifest-root>/vcpkg_installed`
- CMake integration (default): `${CMAKE_BINARY_DIR}/vcpkg_installed` (or `VCPKG_INSTALLED_DIR` if overridden)
- MSBuild integration (default): `$(VcpkgManifestRoot)\vcpkg_installed` (or `$(VcpkgInstalledDir)` if overridden)

If you need a single consolidated SBOM, enumerate installed ports with `vcpkg list` and merge/transform their per-port SPDX files in your SBOM pipeline.

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

Test across multiple triplets with this job-definition fragment nested under `jobs.<job-id>` in a GitHub Actions workflow:
```yaml
runs-on: ${{ matrix.os }}
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
  - name: Clone vcpkg
    run: git clone https://github.com/microsoft/vcpkg
  - name: Bootstrap vcpkg (Windows)
    if: runner.os == 'Windows'
    shell: pwsh
    run: .\vcpkg\bootstrap-vcpkg.bat
  - name: Bootstrap vcpkg (Linux/macOS)
    if: runner.os != 'Windows'
    run: ./vcpkg/bootstrap-vcpkg.sh
  - name: Install dependencies (Windows)
    if: runner.os == 'Windows'
    shell: pwsh
    run: .\vcpkg\vcpkg.exe install --triplet ${{ matrix.triplet }}
  - name: Install dependencies (Linux/macOS)
    if: runner.os != 'Windows'
    run: ./vcpkg/vcpkg install --triplet ${{ matrix.triplet }}
```
