# SCA and Supply Chain Rules

This reference document provides dependency auditing rules and software supply chain checks for supported ecosystems.

## Supported Ecosystems and Manifest Files

| Ecosystem                          | Manifest Files                                  | Lock Files                                         |
| :--------------------------------- | :---------------------------------------------- | :------------------------------------------------- |
| **Node.js (npm / yarn)**           | `package.json`                                  | `package-lock.json`, `yarn.lock`, `pnpm-lock.yaml` |
| **Python (PyPI)**                  | `requirements.txt`, `pyproject.toml`, `Pipfile` | `Pipfile.lock`, `poetry.lock`                      |
| **.NET (NuGet)**                   | `*.csproj`, `Directory.Build.props`             | `packages.lock.json`                               |
| **Java / Kotlin (Maven / Gradle)** | `pom.xml`, `build.gradle`, `build.gradle.kts`   | `gradle.lockfile`                                  |
| **Go**                             | `go.mod`                                        | `go.sum`                                           |
| **Ruby (RubyGems)**                | `Gemfile`                                       | `Gemfile.lock`                                     |
| **Rust (Cargo)**                   | `Cargo.toml`                                    | `Cargo.lock`                                       |

## Vulnerability and Severity Standards

1. **Package Identifiers**: Identify all components using Package URLs (PURL, ECMA-427 standard).
2. **Vulnerability Catalogs**: Verify CVE records using the National Vulnerability Database (NVD) and GitHub Advisory Database.
3. **Severity Scoring**: Apply FIRST CVSS v4.0 or CVSS v3.1 base metrics:
   - **Critical**: 9.0–10.0
   - **High**: 7.0–8.9
   - **Medium**: 4.0–6.9
   - **Low**: 0.1–3.9
4. **Exploit Intelligence**: Cross-reference vulnerabilities with EPSS exploit probability scores and CISA Known Exploited Vulnerabilities (KEV) catalogs.
5. **Dependency Depth**: Record whether the flaw exists in a direct dependency or a transitive dependency.

## Supply Chain Security Checks

Audit all manifests and continuous integration workflows for these risks:

1. **Dependency Confusion and Typosquatting**:

   - Flag packages with names that match popular open-source packages closely.
   - Verify internal private package names against public package registries.

2. **Lock File Integrity**:

   - Verify that lock files exist and developers committed them to version control.
   - Flag repositories with missing lock files because missing lock files allow version-float attacks.

3. **GitHub Actions Pinning**:

   - Scan `.github/workflows/*.yml` for third-party actions that do not use full commit SHAs.
   - Flag mutable branch or tag references (for example: `uses: actions/checkout@v4`). Require full 40-character commit hashes.

4. **Software Bill of Materials (SBOM)**:

   - Verify that build pipelines generate machine-readable SBOM files using CycloneDX (ECMA-424) or SPDX (ISO/IEC 5962:2021).
   - Flag pipelines lacking automated SBOM generation.

5. **Vulnerability Exploitability eXchange (VEX)**:

   - Check for OpenVEX or CSAF 2.0 documents to confirm if transitive vulnerabilities are exploitable in the application context.

6. **Open Source License Risk**:

   - Identify copyleft licenses (such as GPL v3, AGPL, or SSPL) in commercial software distributions.
   - Flag packages with unknown, missing, or non-standard licenses.

7. **Abandoned and Unmaintained Packages**:

   - Flag dependencies that have no code commits for more than two years.
   - Flag packages whose upstream source repositories are archived or deleted.

8. **Package Checksum Enforcement**:
   - Verify `integrity` hash attributes in lock files.
   - Flag Python installations that run without the `--require-hashes` flag.
