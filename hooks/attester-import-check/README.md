---
name: 'Attester Import Check'
description: 'Verifies PyPI and npm package names against the attester.dev existence oracle before the Copilot coding agent writes them into code, blocking hallucinated dependencies'
tags: ['security', 'supply-chain', 'preToolUse', 'dependencies']
---

# Attester Import Check Hook

Verifies every third-party package name the Copilot coding agent is about to write into code, before the write lands. A USENIX Security 2025 study measured 5.2% to 21.7% of LLM-suggested package names as nonexistent; this hook catches those names at the door.

## Overview

On the `preToolUse` event the hook receives the tool invocation as JSON on stdin, extracts import statements from the code being introduced, and checks each package name against the attester.dev existence oracle. The oracle answers from real published artifacts (PyPI wheels, npm tarballs), so a "does not exist" answer is deterministic, not a model opinion.

## Behavior contract

- **Blocks (exit 1)** only on a confident negative from the oracle.
- **Fails open (exit 0)** when the free daily quota is spent, the API is unreachable, or the payload is unusable. It never blocks on these.
- Python: skips standard library modules and relative imports. JS/TS: skips relative paths, absolute paths, and node builtins; `@scope/name` handled.
- Answers are cached at `~/.cache/attester-import-check/cache.json` (exists 30 days, negatives 1 day) so repeated edits do not burn the free quota.
- Allowlist import names that differ from their registry package (`yaml`, `PIL`, `cv2`) via `.attester-allowlist` in the workspace root, one per line.

## Free quota and the paid path

The check uses the free keyless tier: 25 calls per day per client IP, no account or API key, reset 00:00 UTC. Over quota the hook prints "attester quota exhausted, unchecked" and allows the operation. High volume: $0.002 per package check on the paid route (x402 or prepaid credits), documented at https://attester.dev/llms.txt.

## Installation

1. Copy the hook folder to your repository:

   ```bash
   cp -r hooks/attester-import-check your-repo/hooks/
   ```

2. Ensure the script is executable:

   ```bash
   chmod +x hooks/attester-import-check/check-imports.py
   ```

3. Commit the hook configuration to your repository's default branch.

The script is Python 3.10+ standard library only. No pip install step.

## Configuration

The hook is configured in `hooks.json` to run on the `preToolUse` event:

```json
{
  "version": 1,
  "hooks": {
    "preToolUse": [
      {
        "type": "command",
        "bash": "hooks/attester-import-check/check-imports.py",
        "cwd": ".",
        "env": {
          "ATTESTER_MODE": "block"
        },
        "timeoutSec": 30
      }
    ]
  }
}
```

### Environment Variables

| Variable | Values | Default | Description |
|----------|--------|---------|-------------|
| `ATTESTER_MODE` | `block`, `warn` | `block` | `warn` prints findings but always allows the operation |
| `ATTESTER_BASE_URL` | URL | `https://attester.dev` | Oracle base URL |
| `ATTESTER_IMPORT_CHECK_NO_CACHE` | `1` | unset | Skip the on-disk answer cache |

## Examples

### Hallucinated package (exit 1, blocked)

```bash
echo '{"toolName":"write_file","toolInput":{"path":"main.py","content":"import requestsx_fantasy_helper"}}' | \
  python3 hooks/attester-import-check/check-imports.py
```

```
attester-import-check: 'requestsx_fantasy_helper' does not exist on PyPI (attester.dev oracle). Remove or fix the import, or add the name to .attester-allowlist if this is a false positive.
```

### Real package (exit 0)

```bash
echo '{"toolName":"write_file","toolInput":{"path":"main.py","content":"import requests"}}' | \
  python3 hooks/attester-import-check/check-imports.py
```

### Quota exhausted (exit 0, allowed with warning)

```
attester-import-check: attester quota exhausted, unchecked
```

## Limitations

- Import names that differ from distribution names (`yaml` for PyYAML, `PIL` for Pillow) can warn falsely; allowlist them.
- Python dynamic imports (`__import__`, `importlib.import_module`) and bundler path aliases are not resolved.
- The hook checks names against a public registry oracle; private packages are "not found" there by design.

## Source project

The standalone version of this guard (pre-commit hook, Claude Code hook, GitHub Action) lives at https://github.com/maminihds/attester-import-check. The oracle behind it is https://attester.dev.
