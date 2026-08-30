#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if ! command -v python3 >/dev/null 2>&1; then
    if [[ "${1:-}" != "legacy" ]]; then
        echo "ERROR: Python 3 is required for profile-aware commands; use the explicit 'legacy' subcommand for lookup or zero-write dry-run compatibility." >&2
        exit 1
    fi
    shift
    for argument in "$@"; do
        if [[ "$argument" == "--yes" || "$argument" == "-y" ]]; then
            echo "ERROR: Python 3 and Registry v2 authorization are required for writes." >&2
            exit 1
        fi
    done
    export AGENT_SKILLS_SETUP_INTERNAL_LEGACY=1
    exec bash "$SCRIPT_DIR/legacy-smart-ide-migration.sh" "$@"
fi

exec python3 "$SCRIPT_DIR/context-migrator.py" "$@"
