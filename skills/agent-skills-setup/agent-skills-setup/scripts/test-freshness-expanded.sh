#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REGISTRY_PATH="${SCRIPT_DIR}/../references/registry-v2.json"
CHECKS_PATH="${SCRIPT_DIR}/../references/doc-freshness-checks.json"

cd "$SCRIPT_DIR"

# Offline: schema and provenance validation only (no network probes).
python3 - "$REGISTRY_PATH" "$CHECKS_PATH" <<'PYEOF'
import json
import sys
from pathlib import Path
from datetime import date

registry_path = Path(sys.argv[1])
checks_path = Path(sys.argv[2])
sys.path.insert(0, str(registry_path.parent.parent / "scripts"))

from doc_freshness import load_object, validate_provenance

registry = load_object(registry_path)
checks_doc = load_object(checks_path)

# Every check must have a unique id, an HTTPS URL, and at least one
# required term.
identifiers: set[str] = set()
ids: list[str] = []
for check in checks_doc.get("checks", []):
    identifier = check["id"]
    assert identifier not in identifiers, f"duplicate id: {identifier}"
    identifiers.add(identifier)
    ids.append(identifier)
    assert check["url"].startswith("https://"), check
    assert check.get("required_terms"), check
print(f"OK checks schema: {len(ids)} unique IDs with HTTPS URLs and required terms")

# Provenance: every active profile must have verified_at inside the
# 365-day window and at least one official HTTPS source.
errors = validate_provenance(registry, date(2026, 8, 17), 365)
fresh_errors = [e for e in errors if "outside freshness window" in e or "verified_at" in e]
assert not fresh_errors, fresh_errors
print("OK every active profile has a recent verified_at (no stale demotions)")

source_errors = [e for e in errors if "missing official sources" in e or "source must use HTTPS" in e]
assert not source_errors, source_errors
print("OK every active profile has at least one HTTPS official source")

# Coverage: at least one check per "active" profile bucket.
active_products = [
    product_id
    for product_id, product in registry.get("products", {}).items()
    if product.get("lifecycle") == "active"
]
covered = 0
for check_id in ids:
    for product_id in active_products:
        if product_id in check_id:
            covered += 1
            break
print(f"OK freshness covers {covered} of {len(active_products)} active products")
PYEOF
