#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
SKILL_FILE="$SKILL_ROOT/SKILL.md"
IDE_PATHS="$SKILL_ROOT/references/ide-paths.json"
IDE_REFS="$SKILL_ROOT/references/ides"

fail() {
    echo "FAIL: $*" >&2
    exit 1
}

[[ -d "$IDE_REFS" ]] || fail "missing per-IDE reference directory"
[[ -f "$SKILL_ROOT/scripts/README.md" ]] || \
    fail "missing script guide that distinguishes agent entry points from regressions"

python3 - "$IDE_PATHS" "$IDE_REFS" <<'PY'
import json
from pathlib import Path
import sys

paths = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
references = Path(sys.argv[2])
missing = sorted(name for name in paths if not (references / f"{name}.md").is_file())
if missing:
    raise SystemExit("missing IDE references: " + ", ".join(missing))
PY

grep -F 'references/ides/<source>.md' "$SKILL_FILE" >/dev/null || \
    fail "SKILL.md does not route source IDE reads to a single reference"
grep -F 'references/ides/<target>.md' "$SKILL_FILE" >/dev/null || \
    fail "SKILL.md does not route target IDE reads to a single reference"
echo "Per-IDE reference layout test passed"
