#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

python3 - "$SKILL_ROOT/evals/evals.json" "$SKILL_ROOT/evals/trigger-evals.json" <<'PYEOF'
import json
import sys
from pathlib import Path

evals_path = Path(sys.argv[1])
trigger_evals_path = Path(sys.argv[2])

eval_data = json.loads(evals_path.read_text(encoding="utf-8"))
evals = eval_data.get("evals")
assert isinstance(evals, list), "evals.json must contain an evals array"

eval_ids = [item.get("id") for item in evals]
assert eval_ids == list(range(1, 9)), (
    "evals.json must cover stable IDs 1-8 for core, execution, trigger, "
    "conflict, VS Code profile, and OpenCode V2 cases"
)
for item in evals:
    assert isinstance(item.get("prompt"), str) and item["prompt"].strip(), (
        f"eval {item.get('id')} is missing a prompt"
    )
    assertions = item.get("assertions")
    assert isinstance(assertions, list) and assertions, (
        f"eval {item.get('id')} must have non-empty assertions"
    )
    assert "expectations" not in item, (
        f"eval {item.get('id')} uses legacy expectations instead of assertions"
    )

assert trigger_evals_path.is_file(), "missing evals/trigger-evals.json"
trigger_evals = json.loads(trigger_evals_path.read_text(encoding="utf-8"))
assert isinstance(trigger_evals, list), "trigger-evals.json must be a JSON array"
assert len(trigger_evals) == 20, "trigger-evals.json must contain exactly 20 cases"

queries = [item.get("query") for item in trigger_evals]
assert all(isinstance(query, str) and query.strip() for query in queries), (
    "every trigger eval needs a non-empty query"
)
assert len(set(queries)) == len(queries), "trigger eval queries must be unique"

labels = [item.get("should_trigger") for item in trigger_evals]
assert all(isinstance(label, bool) for label in labels), (
    "every trigger eval needs a boolean should_trigger label"
)
assert labels.count(True) == 10 and labels.count(False) == 10, (
    "trigger evals must contain ten positive and ten negative cases"
)

print("Evaluation coverage test passed (8 behavior evals, 20 trigger evals)")
PYEOF
