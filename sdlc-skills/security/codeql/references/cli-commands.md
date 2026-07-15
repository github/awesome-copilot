# CodeQL CLI Command Reference

Detailed reference for the CodeQL CLI — installation, database creation, analysis, SARIF upload, and CI integration.

## Installation

### Download the CodeQL Bundle

Always download the CodeQL bundle (CLI + precompiled queries) from:
**https://github.com/github/codeql-action/releases**

The bundle includes:
- CodeQL CLI product
- Compatible queries and libraries from `github/codeql`
- Precompiled query plans for faster analysis

### Platform-Specific Bundles

| Platform | File |
|---|---|
| All platforms | `codeql-bundle.tar.zst` |
| Linux | `codeql-bundle-linux64.tar.zst` |
| macOS | `codeql-bundle-osx64.tar.zst` |
| Windows | `codeql-bundle-win64.tar.zst` |

> `.tar.gz` variants are also available for systems without Zstandard support.

### Setup

```bash
# Extract the bundle
tar xf codeql-bundle-linux64.tar.zst

# Add to PATH
export PATH="$HOME/codeql:$PATH"

# Verify installation
codeql resolve packs
codeql resolve languages
```

`codeql resolve packs` should list available query packs for all supported languages. If packs are missing, verify you downloaded the bundle (not standalone CLI).

### CI System Setup

Ensure the full CodeQL bundle contents are available on every CI server:
- Copy from a central location and extract on each server, or
- Use the GitHub REST API to download the bundle dynamically per run

## Core Commands

### `codeql database create`

Create a CodeQL database from source code.

```bash
# Basic usage (interpreted language)
codeql database create <output-dir> \
  --language=<language> \
  --source-root=<source-dir>

# Compiled language with build command
codeql database create <output-dir> \
  --language=java-kotlin \
  --command='./gradlew build' \
  --source-root=.

# Multiple languages (cluster mode)
codeql database create <output-dir> \
  --db-cluster \
  --language=java,python,javascript-typescript \
  --command='./build.sh' \
  --source-root=.
```

**Key flags:**

| Flag | Description |
|---|---|
| `--language=<lang>` | Language to extract (required). Use CodeQL language identifiers. |
| `--source-root=<dir>` | Root directory of source code (default: current directory) |
| `--command=<cmd>` | Build command for compiled languages |
| `--db-cluster` | Create databases for multiple languages in one pass |
| `--overwrite` | Overwrite existing database directory |
| `--threads=<n>` | Number of threads for extraction (default: 1; use 0 for all available cores) |
| `--ram=<mb>` | RAM limit in MB for extraction |

### `codeql database analyze`

Run queries against a CodeQL database and produce SARIF output.

```bash
codeql database analyze <database-dir> \
  <query-suite-or-pack> \
  --format=sarif-latest \
  --sarif-category=<category> \
  --output=<output-file>
```

**Key flags:**

| Flag | Description |
|---|---|
| `--format=sarif-latest` | Output format (use `sarif-latest` for current SARIF v2.1.0) |
| `--sarif-category=<cat>` | Category tag for the SARIF results (important for multi-language repos) |
| `--output=<file>` | Output file path for SARIF results |
| `--threads=<n>` | Number of threads for analysis |
| `--ram=<mb>` | RAM limit in MB |
| `--sarif-add-file-contents` | Include source file contents in SARIF output |
| `--ungroup-results` | Disable result grouping (each occurrence reported separately) |
| `--no-download` | Skip downloading query packs (use only locally available packs) |

**Common query suites:**

| Suite | Description |
|---|---|
| `<lang>-code-scanning.qls` | Standard code scanning queries |
| `<lang>-security-extended.qls` | Extended security queries |
| `<lang>-security-and-quality.qls` | Security + code quality queries |

**Examples:**

```bash
# JavaScript analysis with extended security
codeql database analyze codeql-db/javascript-typescript \
  javascript-typescript-security-extended.qls \
  --format=sarif-latest \
  --sarif-category=javascript \
  --output=js-results.sarif

# Java analysis with all available threads
codeql database analyze codeql-db/java-kotlin \
  java-kotlin-code-scanning.qls \
  --format=sarif-latest \
  --sarif-category=java \
  --output=java-results.sarif \
  --threads=0

# Include file contents in SARIF
codeql database analyze codeql-db \
  javascript-typescript-code-scanning.qls \
  --format=sarif-latest \
  --output=results.sarif \
  --sarif-add-file-contents
```

### `codeql github upload-results`

Upload SARIF results to GitHub code scanning.

```bash
codeql github upload-results \
  --repository=<owner/repo> \
  --ref=<git-ref> \
  --commit=<commit-sha> \
  --sarif=<sarif-file>
```

**Key flags:**

| Flag | Description |
|---|---|
| `--repository=<owner/repo>` | Target GitHub repository |
| `--ref=<ref>` | Git ref (e.g., `refs/heads/main`, `refs/pull/42/head`) |
| `--commit=<sha>` | Full commit SHA |
| `--sarif=<file>` | Path to SARIF file |
| `--github-url=<url>` | GitHub instance URL (for GHES; defaults to github.com) |
| `--github-auth-stdin` | Read auth token from stdin instead of `GITHUB_TOKEN` env var |

**Authentication:** Set `GITHUB_TOKEN` environment variable with a token that has `security-events: write` scope, or use `--github-auth-stdin`.

### `codeql resolve packs`

List available query packs:

```bash
codeql resolve packs
```

Use to verify installation and diagnose missing packs. Available since CLI v2.19.0 (earlier versions: use `codeql resolve qlpacks`).

### `codeql resolve languages`

List supported languages:

```bash
codeql resolve languages
```

Shows which language extractors are available in the current installation.

### `codeql database bundle`

Create a relocatable archive of a CodeQL database for sharing or troubleshooting:

```bash
codeql database bundle <database-dir> \
  --output=<archive-file>
```

Useful for sharing databases with team members or GitHub Support.

## CLI Server Mode

### `codeql execute cli-server`

Run a persistent server to avoid repeated JVM initialization when executing multiple commands:

```bash
codeql execute cli-server [options]
```

**Key flags:**

| Flag | Description |
|---|---|
| `-v, --verbose` | Increase progress messages |
| `-q, --quiet` | Decrease progress messages |
| `--verbosity=<level>` | Set verbosity: `errors`, `warnings`, `progress`, `progress+`, `progress++`, `progress+++` |
| `--logdir=<dir>` | Write detailed logs to directory |
| `--common-caches=<dir>` | Location for persistent cached data (default: `~/.codeql`) |
| `-J=<opt>` | Pass option to the JVM |

The server accepts commands via stdin and returns results, keeping the JVM warm between commands. Primarily useful in CI environments running multiple sequential CodeQL commands.

## CI Integration Pattern

### Complete CI Script Example

```bash
#!/bin/bash
set -euo pipefail

REPO="my-org/my-repo"
REF="refs/heads/main"
COMMIT=$(git rev-parse HEAD)
LANGUAGES=("javascript-typescript" "python")

# Create databases for all languages
codeql database create codeql-dbs \
  --db-cluster \
  --source-root=. \
  --language=$(IFS=,; echo "${LANGUAGES[*]}")

# Analyze each language and upload results
for lang in "${LANGUAGES[@]}"; do
  echo "Analyzing $lang..."

  codeql database analyze "codeql-dbs/$lang" \
    "${lang}-security-extended.qls" \
    --format=sarif-latest \
    --sarif-category="$lang" \
    --output="${lang}-results.sarif" \
    --threads=0

  codeql github upload-results \
    --repository="$REPO" \
    --ref="$REF" \
    --commit="$COMMIT" \
    --sarif="${lang}-results.sarif"

  echo "$lang analysis uploaded."
done
```

### External CI Systems

For CI systems other than GitHub Actions:
1. Install the CodeQL bundle on CI runners
2. Run `codeql database create` with appropriate build commands
3. Run `codeql database analyze` to generate SARIF
4. Run `codeql github upload-results` to push results to GitHub
5. Set `GITHUB_TOKEN` with `security-events: write` permission

## Environment Variables

| Variable | Purpose |
|---|---|
| `GITHUB_TOKEN` | Authentication for `github upload-results` |
| `CODEQL_EXTRACTOR_<LANG>_OPTION_<KEY>` | Extractor configuration (e.g., `CODEQL_EXTRACTOR_GO_OPTION_EXTRACT_TESTS=true`) |
| `CODEQL_EXTRACTOR_CPP_AUTOINSTALL_DEPENDENCIES` | Auto-install C/C++ build dependencies on Ubuntu |
| `CODEQL_RAM` | Override default RAM allocation for analysis |
| `CODEQL_THREADS` | Override default thread count |
