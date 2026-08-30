#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SKILL_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
TMP_ROOT="$(mktemp -d)"
trap 'rm -rf "$TMP_ROOT"' EXIT

python3 "$SCRIPT_DIR/check-doc-freshness.py" \
    --registry "$SKILL_DIR/references/registry-v2.json" \
    --checks "$SKILL_DIR/references/doc-freshness-checks.json" \
    --today 2026-08-17 \
    --report "$TMP_ROOT/report.json" > "$TMP_ROOT/stdout.json"

python3 - "$TMP_ROOT/report.json" <<'PY'
import json
import sys
from pathlib import Path

report = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
assert report["ok"] is True
assert report["online"] is False
assert report["results"] == []
PY

python3 - \
    "$SKILL_DIR/references/doc-freshness-checks.json" \
    "$TMP_ROOT/bad-checks.json" <<'PY'
import json
import sys
from pathlib import Path

document = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
document["checks"][0]["url"] = "http://insecure.example.test"
Path(sys.argv[2]).write_text(json.dumps(document), encoding="utf-8")
PY

if python3 "$SCRIPT_DIR/check-doc-freshness.py" \
    --registry "$SKILL_DIR/references/registry-v2.json" \
    --checks "$TMP_ROOT/bad-checks.json" \
    --today 2026-08-13 > "$TMP_ROOT/bad.log"; then
    echo "FAIL: insecure freshness URL passed" >&2
    exit 1
fi
grep -Fq 'URL must use HTTPS' "$TMP_ROOT/bad.log"

echo "Documentation freshness tests passed"
