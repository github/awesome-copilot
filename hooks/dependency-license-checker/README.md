---
name: 'Dependency License Checker'
description: 'Scans newly added dependencies for license compliance (GPL, AGPL, etc.) at session end'
tags: ['compliance', 'license', 'dependencies', 'session-end']
---

# Dependency License Checker Hook

Scans newly added dependencies for license compliance at the end of a GitHub Copilot coding agent session, flagging copyleft and restrictive licenses (GPL, AGPL, SSPL, etc.) before they get committed.

## Overview

AI coding agents may add new dependencies during a session without considering license implications. This hook acts as a compliance safety net by detecting new dependencies across multiple ecosystems, looking up their licenses, and checking them against a configurable blocked list of copyleft and restrictive licenses.

## Features

- **Multi-ecosystem support**: npm, pip, Go, Ruby, and Rust dependency detection
- **Two modes**: `warn` (log only) or `block` (exit non-zero to prevent commit)
- **Configurable blocked list**: Default copyleft set with full SPDX variant coverage
- **Allowlist support**: Skip known-acceptable packages via `LICENSE_ALLOWLIST`
- **Smart detection**: Uses `git diff` to detect only newly added dependencies
- **Multiple lookup strategies**: Local cache, package manager CLI, with fallback to UNKNOWN
- **Structured logging**: JSON Lines output for integration with monitoring tools
- **Timeout protection**: Each license lookup wrapped with 5-second timeout
- **Zero mandatory dependencies**: Uses standard Unix tools; optional `jq` for better JSON parsing

## Installation

1. Copy the hook folder to your repository:

   ```bash
   cp -r hooks/dependency-license-checker .github/hooks/
   ```

2. Ensure the script is executable:

   ```bash
   chmod +x .github/hooks/dependency-license-checker/check-licenses.sh
   ```

3. Create the logs directory and add it to `.gitignore`:

   ```bash
   mkdir -p logs/copilot/license-checker
   echo "logs/" >> .gitignore
   ```

4. Commit the hook configuration to your repository's default branch.

## Configuration

The hook is configured in `hooks.json` to run on the `sessionEnd` event:

```json
{
  "version": 1,
  "hooks": {
    "sessionEnd": [
      {
        "type": "command",
        "bash": ".github/hooks/dependency-license-checker/check-licenses.sh",
        "cwd": ".",
        "env": {
          "LICENSE_MODE": "warn"
        },
        "timeoutSec": 60
      }
    ]
  }
}
```

### Environment Variables

| Variable | Values | Default | Description |
|----------|--------|---------|-------------|
| `LICENSE_MODE` | `warn`, `block` | `warn` | `warn` logs violations only; `block` exits non-zero to prevent auto-commit |
| `SKIP_LICENSE_CHECK` | `true` | unset | Disable the checker entirely |
| `LICENSE_LOG_DIR` | path | `logs/copilot/license-checker` | Directory where check logs are written |
| `BLOCKED_LICENSES` | comma-separated SPDX IDs | copyleft set | Licenses to flag as violations |
| `LICENSE_ALLOWLIST` | comma-separated | unset | Package names to skip (e.g., `linux-headers,glibc`) |

## How It Works

1. When a Copilot coding agent session ends, the hook executes
2. Runs `git diff HEAD` against manifest files (package.json, requirements.txt, go.mod, etc.)
3. Extracts newly added package names from the diff output
4. Looks up each package's license using local caches and package manager CLIs
5. Checks each license against the blocked list using case-insensitive substring matching
6. Skips packages in the allowlist before flagging
7. Reports findings in a formatted table with package, ecosystem, license, and status
8. Writes a structured JSON log entry for audit purposes
9. In `block` mode, exits non-zero to signal the agent to stop before committing

## Supported Ecosystems

| Ecosystem | Manifest File | Primary Lookup | Fallback |
|-----------|--------------|----------------|----------|
| npm/yarn/pnpm | `package.json` | `node_modules/<pkg>/package.json` license field | `npm view <pkg> license` |
| pip | `requirements.txt`, `pyproject.toml` | `pip show <pkg>` License field | UNKNOWN |
| Go | `go.mod` | LICENSE file in module cache (keyword match) | UNKNOWN |
| Ruby | `Gemfile` | `gem spec <pkg> license` | UNKNOWN |
| Rust | `Cargo.toml` | `cargo metadata` license field | UNKNOWN |

## Default Blocked Licenses

The following licenses are blocked by default (copyleft and restrictive):

- **GPL**: GPL-2.0, GPL-2.0-only, GPL-2.0-or-later, GPL-3.0, GPL-3.0-only, GPL-3.0-or-later
- **AGPL**: AGPL-1.0, AGPL-3.0, AGPL-3.0-only, AGPL-3.0-or-later
- **LGPL**: LGPL-2.0, LGPL-2.1, LGPL-2.1-only, LGPL-2.1-or-later, LGPL-3.0, LGPL-3.0-only, LGPL-3.0-or-later
- **Other**: SSPL-1.0, EUPL-1.1, EUPL-1.2, OSL-3.0, CPAL-1.0, CPL-1.0
- **Creative Commons (restrictive)**: CC-BY-SA-4.0, CC-BY-NC-4.0, CC-BY-NC-SA-4.0

Override with `BLOCKED_LICENSES` to customize.

## Example Output

### Clean scan (no new dependencies)

```
✅ No new dependencies detected
```

### Clean scan (all compliant)

```
🔍 Checking licenses for 3 new dependency(ies)...

  PACKAGE                        ECOSYSTEM    LICENSE                        STATUS
  -------                        ---------    -------                        ------
  express                        npm          MIT                            OK
  lodash                         npm          MIT                            OK
  axios                          npm          MIT                            OK

✅ All 3 dependencies have compliant licenses
```

### Violations detected (warn mode)

```
🔍 Checking licenses for 2 new dependency(ies)...

  PACKAGE                        ECOSYSTEM    LICENSE                        STATUS
  -------                        ---------    -------                        ------
  react                          npm          MIT                            OK
  readline-sync                  npm          GPL-3.0                        BLOCKED

⚠️  Found 1 license violation(s):

  - readline-sync (npm): GPL-3.0

💡 Review the violations above. Set LICENSE_MODE=block to prevent commits with license issues.
```

### Violations detected (block mode)

```
🔍 Checking licenses for 2 new dependency(ies)...

  PACKAGE                        ECOSYSTEM    LICENSE                        STATUS
  -------                        ---------    -------                        ------
  flask                          pip          BSD-3-Clause                   OK
  copyleft-lib                   pip          AGPL-3.0                       BLOCKED

⚠️  Found 1 license violation(s):

  - copyleft-lib (pip): AGPL-3.0

🚫 Session blocked: resolve license violations above before committing.
   Set LICENSE_MODE=warn to log without blocking, or add packages to LICENSE_ALLOWLIST.
```

## Log Format

Check events are written to `logs/copilot/license-checker/check.log` in JSON Lines format:

```json
{"timestamp":"2026-03-17T10:30:00Z","event":"license_check_complete","mode":"warn","dependencies_checked":3,"violation_count":1,"violations":[{"package":"readline-sync","ecosystem":"npm","license":"GPL-3.0","status":"BLOCKED"}]}
```

```json
{"timestamp":"2026-03-17T10:30:00Z","event":"license_check_complete","mode":"warn","status":"clean","dependencies_checked":0}
```

## Pairing with Other Hooks

This hook pairs well with:

- **Secrets Scanner**: Run secrets scanning first, then license checking, before auto-commit
- **Session Auto-Commit**: When both are installed, order them so that `dependency-license-checker` runs first. Set `LICENSE_MODE=block` to prevent auto-commit when violations are detected.

## Customization

- **Modify blocked licenses**: Set `BLOCKED_LICENSES` to a custom comma-separated list of SPDX IDs
- **Allowlist packages**: Use `LICENSE_ALLOWLIST` for known-acceptable packages with copyleft licenses
- **Change log location**: Set `LICENSE_LOG_DIR` to route logs to your preferred directory
- **Add ecosystems**: Extend the detection and lookup sections in `check-licenses.sh`

## Disabling

To temporarily disable the checker:

- Set `SKIP_LICENSE_CHECK=true` in the hook environment
- Or remove the `sessionEnd` entry from `hooks.json`

## Limitations

- License detection relies on manifest file diffs; dependencies added outside standard manifest files are not detected
- License lookup requires the package manager CLI or local cache to be available
- Compound SPDX expressions (e.g., `MIT OR GPL-3.0`) are flagged if any component matches the blocked list
- Does not perform deep transitive dependency license analysis
- Network lookups (npm view, etc.) may fail in offline or restricted environments
- Requires `git` to be available in the execution environment
