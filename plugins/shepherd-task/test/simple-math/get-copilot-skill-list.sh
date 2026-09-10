#!/usr/bin/env bash
# shepherd-task-version: 1.0.3

set -euo pipefail

copilot_cli="${1:-copilot}"
[[ $# -le 1 ]] || {
    echo "Usage: $0 [COPILOT_CLI]" >&2
    exit 1
}
[[ -x "$copilot_cli" || "$copilot_cli" != */* ]] || {
    echo "Copilot CLI is not executable: $copilot_cli" >&2
    exit 1
}

LC_ALL=C.UTF-8 "$copilot_cli" skill list 2>&1
