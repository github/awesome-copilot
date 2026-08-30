#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

python3 - "$SKILL_DIR/references/registry-v2.json" <<'PY'
import json
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(sys.argv[1]).parent.parent / "scripts"))
from migration_core import Registry, build_plan, apply_plan

e2e_pairs = [
    ("cursor/ide", "claude/code-cli"),
    ("claude/code-cli", "copilot/vscode"),
    ("cline/ide", "cursor/ide"),
    ("gemini-cli/cli", "codex/cli"),
    ("kiro/ide", "continue/cli"),
    ("windsurf/ide", "opencode/cli"),
    ("qwen-code/cli", "factory-droid/cli"),
    ("copilot/vscode", "rovodev/cli"),
    ("openhands/cli", "sourcegraph-amp/cli"),
]

reg_path = Path(sys.argv[1])

for src, dst in e2e_pairs:
    with tempfile.TemporaryDirectory() as tmp:
        ws = Path(tmp) / "ws"
        home = Path(tmp) / "home"
        ws.mkdir()
        home.mkdir()

        reg = Registry(reg_path, ws, home)
        # Locate the fixture through the Registry's own platform-aware
        # resolution so the created tree matches what build_plan will
        # resolve (windows hosts map some surfaces to %APPDATA% etc.).
        # Glob compatibility paths (github.copilot-*) cannot host a
        # literal fixture directory on Windows; use a concrete surface.
        glob_chars = ("*", "?", "[")
        surface = next(
            s
            for s in reg.surfaces(src, "skills")
            if not any(c in str(s.resolved_path) for c in glob_chars)
        )
        skill_dir = Path(surface.resolved_path) / "demo-skill"
        skill_dir.mkdir(parents=True)
        (skill_dir / "SKILL.md").write_text(
            '---\nname: demo-skill\ndescription: Demo fixture.\nmetadata:\n  version: "1"\n---\n# Demo\n',
            encoding="utf-8",
        )

        plan, loss = build_plan(
            reg,
            src,
            dst,
            ["skills"],
            surface.scope,
        )
        assert len(plan) == 1
        assert plan[0].status == "ready", f"{src} -> {dst} plan item status was {plan[0].status}: {plan[0].reason}"
        manifest, _ = apply_plan(plan, ws)
        assert manifest["summary"]["applied"] == 1
        print(f"PASS: E2E {src} -> {dst}")

print("All 9 audit report E2E migration pairs verified.")
PY

echo "Audit E2E migration matrix tests passed"
