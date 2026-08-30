#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REGISTRY_PATH="${SCRIPT_DIR}/../references/registry-v2.json"
WS="$(mktemp -d /tmp/alias-resolution-ws.XXXXXX)"
trap 'rm -rf "$WS"' EXIT

cd "$SCRIPT_DIR"

python3 - "$REGISTRY_PATH" "$WS" <<'PYEOF'
import contextlib
import io
import json
import sys
from pathlib import Path

registry_path = Path(sys.argv[1])
workspace = Path(sys.argv[2])
sys.path.insert(0, str(registry_path.parent.parent / "scripts"))

from migration_core import Registry  # noqa: E402
from registry.alias_resolver import resolve  # noqa: E402
from registry.exceptions import (  # noqa: E402
    AliasCycleError,
    AliasDepthExceededError,
    UnknownSelectorError,
)

data = json.loads(registry_path.read_text(encoding="utf-8"))

positive_cases = [
    ("vscode", "copilot", "vscode"),
    ("visual-studio", "copilot", "visual-studio"),
    ("claude-desktop", "claude", "desktop-chat"),
    ("trae-cn", "trae", "cn-ide"),
    ("jetbrains-ai", "jetbrains", "ai-assistant"),
    ("codeium", "windsurf", "ide"),
]

for requested, exp_product, exp_profile in positive_cases:
    res = resolve(requested, data)
    assert res.resolved_product == exp_product, (
        f"{requested}: expected {exp_product}, got {res.resolved_product}"
    )
    assert res.resolved_profile == exp_profile, (
        f"{requested}: expected {exp_profile}, got {res.resolved_profile}"
    )
    assert requested == res.requested
    assert len(res.chain) >= 1
    assert res.chain[0] == requested
    assert res.chain[-1] == f"{exp_product}/{exp_profile}"
    assert res.deprecated is False
    print(f"OK alias {requested} -> {res.resolved_product}/{res.resolved_profile}")

# Alias + user-specified profile: alias_of.profile wins.
res = resolve("vscode/cli", data)
assert res.resolved_product == "copilot"
assert res.resolved_profile == "vscode", (
    f"vscode/cli should defer to alias_of.profile, got {res.resolved_profile}"
)
print("OK alias vscode/cli -> copilot/vscode (alias wins over user profile)")

# Trae-work has template:cloud-ui plus alias_of:trae/ide.
res = resolve("trae-work", data)
assert res.resolved_product == "trae"
assert res.resolved_profile == "ide"
print("OK alias trae-work (cloud-ui + alias_of) -> trae/ide")

# Non-alias selectors resolve without any chain.
res = resolve("cline/ide", data)
assert res.resolved_product == "cline"
assert res.resolved_profile == "ide"
assert res.chain == ("cline", "cline/ide"), res.chain
assert res.deprecated is False
print("OK non-alias cline/ide (no chain)")

# Registry.profile() integration: returns the resolved tuple.
registry = Registry(registry_path, workspace)
p, pid, _ = registry.profile("vscode")
assert (p, pid) == ("copilot", "vscode"), f"got {(p, pid)}"
print("OK Registry.profile('vscode') -> copilot/vscode")

p, pid, _ = registry.profile("claude-desktop")
assert (p, pid) == ("claude", "desktop-chat"), f"got {(p, pid)}"
print("OK Registry.profile('claude-desktop') -> claude/desktop-chat")

# Registry.profile_raw() preserves legacy alias template output.
p, pid, _ = registry.profile_raw("vscode")
assert (p, pid) == ("vscode", "alias"), f"got {(p, pid)}"
print("OK Registry.profile_raw('vscode') -> vscode/alias (legacy preserved)")

# Stderr log fires only when an alias chain was followed.
buf = io.StringIO()
with contextlib.redirect_stderr(buf):
    registry.profile("cline/ide")
assert buf.getvalue() == "", f"unexpected stderr: {buf.getvalue()!r}"
print("OK no stderr log for non-alias selector")

buf = io.StringIO()
with contextlib.redirect_stderr(buf):
    registry.profile("vscode")
err = buf.getvalue()
assert "alias: vscode -> copilot/vscode" in err, f"got {err!r}"
print("OK stderr log for alias resolution")

# resolve_selector returns the full ResolvedSelector (no profile-data fetch).
resolved = registry.resolve_selector("vscode")
assert resolved.requested == "vscode"
assert resolved.resolved_product == "copilot"
assert resolved.resolved_profile == "vscode"
assert resolved.chain[0] == "vscode"
assert resolved.deprecated is False
print("OK Registry.resolve_selector('vscode') preserves chain")

# Failure modes.
try:
    resolve("nonexistent-product", data)
except UnknownSelectorError as exc:
    assert exc.product == "nonexistent-product"
    print(f"OK UnknownSelectorError raised: {exc}")
else:
    raise AssertionError("UnknownSelectorError not raised")

# Cycle: a -> b -> a
cycle_data = json.loads(json.dumps(data))
cycle_data["products"]["cycle-a"] = {
    "template": "legacy-alias",
    "alias_of": {"product": "cycle-b"},
}
cycle_data["products"]["cycle-b"] = {
    "template": "legacy-alias",
    "alias_of": {"product": "cycle-a"},
}
try:
    resolve("cycle-a", cycle_data)
except AliasCycleError as exc:
    assert exc.chain == ("cycle-a", "cycle-b"), exc.chain
    print(f"OK AliasCycleError raised with chain: {exc.chain}")
else:
    raise AssertionError("AliasCycleError not raised")

# Depth exceeded: 17-deep chain.
deep_data = json.loads(json.dumps(data))
deep_data["products"]["deep-0"] = {
    "template": "legacy-alias",
    "alias_of": {"product": "deep-1"},
}
for index in range(1, 18):
    target = f"deep-{index + 1}" if index < 17 else "cline"
    deep_data["products"][f"deep-{index}"] = {
        "template": "legacy-alias",
        "alias_of": {"product": target},
    }
try:
    resolve("deep-0", deep_data)
except AliasDepthExceededError as exc:
    assert exc.limit == 16
    assert len(exc.chain) == 17, len(exc.chain)
    print(f"OK AliasDepthExceededError raised (limit={exc.limit})")
else:
    raise AssertionError("AliasDepthExceededError not raised")

print()
print("Alias resolver tests passed")
PYEOF