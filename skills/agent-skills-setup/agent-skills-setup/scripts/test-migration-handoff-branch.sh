#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REGISTRY_PATH="${SCRIPT_DIR}/../references/registry-v2.json"

WS="$(mktemp -d /tmp/handoff-branch-ws.XXXXXX)"
trap 'rm -rf "$WS"' EXIT

# Establish a git workspace on a real, named branch (not detached HEAD).
git -C "$WS" init -q
git -C "$WS" config user.email "test@example.com"
git -C "$WS" config user.name "ACB Test"
git -C "$WS" checkout -q -b "release/0.8.21"
printf 'seed\n' > "$WS/seed.txt"
git -C "$WS" add -A
git -C "$WS" commit -qm "seed"

# Handoff source contains a private field that must be stripped on export.
mkdir -p "$WS/.agent"
printf '{"summary": "Reviewed handoff snapshot", "raw": "machine-specific-path-should-be-stripped"}\n' \
    > "$WS/.agent/handoff.json"

cd "$SCRIPT_DIR"

python3 - "$REGISTRY_PATH" "$WS" <<'PYEOF'
import json
import re
import sys
from pathlib import Path

registry_path = Path(sys.argv[1])
workspace = Path(sys.argv[2])
sys.path.insert(0, str(registry_path.parent.parent / "scripts"))

from migration_core import (  # noqa: E402
    ItemStatus,
    PlanItem,
    SurfacePath,
    apply_plan,
)


def make_surface(resolved: Path, boundary: Path) -> SurfacePath:
    return SurfacePath(
        product="cline",
        profile="ide",
        object_type="handoff",
        scope="user",
        storage="home",
        path=".agent/handoff.json",
        resolved_path=resolved,
        boundary=boundary,
        source_format="json",
        policy="manual-rebuild",
        location_role="source",
        canonical_path=".agent/handoff.json",
        precedence=0,
    )


source = make_surface(workspace / ".agent" / "handoff.json", workspace)
dest = workspace / ".cursor" / "handoff" / "session.json"
item = PlanItem(
    object_type="handoff",
    status=ItemStatus.READY.value,
    reason="handoff branch whitelist fixture",
    source=source,
    target=make_surface(dest, workspace),
)

# Audit SDI-2: session transfer is opt-in; the default apply must refuse.
try:
    apply_plan([item], workspace, workspace / "manifest-refused.json")
except ValueError as exc:
    assert "--include-session" in str(exc), exc
    print(f"OK default apply refuses handoff without opt-in: {exc}")
else:
    raise AssertionError("apply_plan accepted a handoff item without opt-in")
assert not dest.exists()

manifest, _ = apply_plan(
    [item],
    workspace,
    workspace / "manifest.json",
    allow_session_handoff=True,
)

assert manifest["summary"].get("applied", 0) >= 1, manifest["summary"]
assert dest.is_file(), f"handoff not written to {dest}"

rendered = json.loads(dest.read_text(encoding="utf-8"))
print("rendered handoff:", json.dumps(rendered))

# Audit #8: git_branch must be the human-readable branch name, never a SHA.
git_branch = rendered.get("git_branch")
assert git_branch is not None, "git_branch missing from portable handoff"
sha_pattern = re.compile(r"^[0-9a-f]{40}$")
assert not sha_pattern.fullmatch(git_branch), (
    f"git_branch leaked a commit SHA instead of a branch name: {git_branch!r}"
)
assert git_branch == "release/0.8.21", (
    f"git_branch should be the checked-out branch: {git_branch!r}"
)

# Privacy: raw machine-specific content must not travel in the bundle.
assert "raw" not in rendered, "raw field leaked into portable handoff"

print(f"OK handoff git_branch whitelists branch name: {git_branch}")
PYEOF

echo "Handoff branch whitelist test passed"
