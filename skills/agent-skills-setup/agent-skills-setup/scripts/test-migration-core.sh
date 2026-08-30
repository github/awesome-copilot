#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Native Windows Python ignores MSYS-style env values; convert HOME
# fixtures so Path.home()/os.environ["HOME"] resolution sees a real dir.

# Pin surface resolution to the POSIX layout the fixtures create;
# otherwise windows-latest would resolve $APPDATA-style overrides.
export AGENT_SKILLS_PLATFORM=linux

native_path() {
    if command -v cygpath >/dev/null 2>&1; then cygpath -w "$1"; else printf '%s' "$1"; fi
}
SKILL_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
CLI="$SCRIPT_DIR/smart-ide-migration.sh"
TMP_ROOT="$(mktemp -d)"
trap 'rm -rf "$TMP_ROOT"' EXIT

WORKSPACE="$TMP_ROOT/workspace"
TEST_HOME="$TMP_ROOT/home"
mkdir -p \
    "$WORKSPACE/.cline/skills/demo" \
    "$WORKSPACE/.cline/rules" \
    "$TEST_HOME"

bash "$CLI" > "$TMP_ROOT/help.txt"
grep -E '\{.*detect.*inventory.*plan.*apply.*verify.*rollback.*legacy.*\}' "$TMP_ROOT/help.txt" >/dev/null

cp "$SKILL_DIR/evals/files/instruction-cline-source.md" \
    "$WORKSPACE/.cline/rules/source.mdc"
printf '%s\n' '---' 'name: demo' 'description: Test fixture.' '---' '# Demo' \
    > "$WORKSPACE/.cline/skills/demo/SKILL.md"
printf '%s\n' 'NON_SECRET_FIXTURE=kept-out-of-target' \
    > "$WORKSPACE/.cline/skills/demo/.env.local"
printf '%s\n' \
    '{' \
    '  "mcpServers": {' \
    '    "example": {' \
    '      "command": "example-server",' \
    '      "args": ["--token", "literal-arg-secret"],' \
    '      "env": {"API_TOKEN": "literal-secret", "MY_VALUE": "sk-ant-abcdefghijklmnopqrstuvw", "REDIRECT_URL": "https://nested:password@example.test/callback", "MODE": "safe"}' \
    '    }' \
    '  }' \
    '}' > "$WORKSPACE/.cline/mcp.json"

cp "$WORKSPACE/.cline/mcp.json" "$TMP_ROOT/mcp-before-plan-overlap.json"
if HOME="$(native_path "$TEST_HOME")" bash "$CLI" plan \
    --workspace "$WORKSPACE" \
    --source cline/ide \
    --target forge/cli \
    --objects mcp \
    --scope project \
    --output "$WORKSPACE/.cline/mcp.json" \
    --json > "$TMP_ROOT/plan-overlap.log" 2>&1; then
    echo "FAIL: plan output overwrote a migration surface" >&2
    exit 1
fi
grep -Fq 'plan output overlaps' "$TMP_ROOT/plan-overlap.log"
cmp "$TMP_ROOT/mcp-before-plan-overlap.json" "$WORKSPACE/.cline/mcp.json"

HOME="$(native_path "$TEST_HOME")" bash "$CLI" inventory \
    --workspace "$WORKSPACE" --product cline --json > "$TMP_ROOT/inventory.json"
python3 - "$TMP_ROOT/inventory.json" <<'PY'
import json
import sys
from pathlib import Path

rows = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
def _hit(t):
    hits = [r.get("resolved_path") for r in rows if r.get("object_type") == t and r["exists"]]
    assert hits, f"no existing {t} rows: " + json.dumps(
        [(r.get("object_type"), r.get("scope"), r.get("resolved_path")) for r in rows][:12]
    )
_hit("mcp")
_hit("skills")
PY

HOME="$(native_path "$TEST_HOME")" bash "$CLI" detect \
    --workspace "$WORKSPACE" --product cline --json > "$TMP_ROOT/detect.json"
python3 - "$TMP_ROOT/detect.json" <<'PY'
import json
import sys
from pathlib import Path

data = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
rows = data.get("detections", data) if isinstance(data, dict) else data
assert any(r.get("product") == "cline" and r.get("state") == "installed" for r in rows)
PY

PLAN_FILE="$TMP_ROOT/plan.json"
HOME="$(native_path "$TEST_HOME")" bash "$CLI" plan \
    --workspace "$WORKSPACE" \
    --source cline/ide \
    --target forge/cli \
    --objects skills,instructions,mcp \
    --scope project \
    --output "$PLAN_FILE" \
    --json > "$TMP_ROOT/plan-output.json"
python3 - "$PLAN_FILE" <<'PY'
import json
import sys
from pathlib import Path

plan = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
assert plan["schema_version"] == 1
assert len(plan["plan_sha256"]) == 64
assert [item["status"] for item in plan["items"]] == ["ready", "ready", "ready"]
assert all(item["review_preview"] for item in plan["items"])
assert {item["field"] for item in plan["loss_report"]["items"]} >= {
    "example.env.API_TOKEN",
    "example.args[1]",
}
PY
if grep -E 'literal-(secret|arg-secret)|sk-ant-abcdefghijklmnopqrstuvw|nested:password@' "$PLAN_FILE" >/dev/null; then
    echo "FAIL: a literal MCP credential reached the saved plan" >&2
    exit 1
fi

if HOME="$(native_path "$TEST_HOME")" bash "$CLI" apply "$PLAN_FILE" \
    > "$TMP_ROOT/no-confirm.log" 2>&1; then
    echo "FAIL: apply succeeded without --yes" >&2
    exit 1
fi

if HOME="$(native_path "$TEST_HOME")" bash "$CLI" apply "$PLAN_FILE" \
    --manifest "$WORKSPACE/AGENTS.md" \
    --yes > "$TMP_ROOT/manifest-overlap.log" 2>&1; then
    echo "FAIL: manifest path overlapped a migration surface" >&2
    exit 1
fi
grep -Fq 'manifest path overlaps' "$TMP_ROOT/manifest-overlap.log"
[[ ! -e "$WORKSPACE/.forge/skills/demo" ]]
[[ ! -e "$WORKSPACE/AGENTS.md" ]]
[[ ! -e "$WORKSPACE/.mcp.json" ]]

MANIFEST="$TMP_ROOT/manifest.json"
HOME="$(native_path "$TEST_HOME")" bash "$CLI" apply \
    "$PLAN_FILE" \
    --manifest "$MANIFEST" \
    --yes \
    --json > "$TMP_ROOT/apply.json"

[[ -f "$WORKSPACE/.forge/skills/demo/SKILL.md" ]]
[[ ! -e "$WORKSPACE/.forge/skills/demo/.env.local" ]]
[[ -f "$WORKSPACE/AGENTS.md" ]]
[[ -f "$WORKSPACE/.mcp.json" ]]
grep -F '"API_TOKEN": "${API_TOKEN}"' "$WORKSPACE/.mcp.json" >/dev/null
grep -F '"--token",' "$WORKSPACE/.mcp.json" >/dev/null
grep -F '"${TOKEN}"' "$WORKSPACE/.mcp.json" >/dev/null
if grep -E 'literal-(secret|arg-secret|query-secret)|sk-ant-abcdefghijklmnopqrstuvw|user:pass@|nested:password@' "$WORKSPACE/.mcp.json" >/dev/null; then
    echo "FAIL: literal MCP secret reached the target" >&2
    exit 1
fi

bash "$CLI" verify --manifest "$MANIFEST" --json > "$TMP_ROOT/verify.json"
python3 - "$TMP_ROOT/verify.json" "$MANIFEST" <<'PY'
import json
import sys
from pathlib import Path

assert json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))["ok"] is True
manifest = json.loads(Path(sys.argv[2]).read_text(encoding="utf-8"))
assert manifest["schema_version"] == 2
assert len(manifest["manifest_sha256"]) == 64
assert len(manifest["provenance"]["plan_sha256"]) == 64
PY

cp "$WORKSPACE/AGENTS.md" "$TMP_ROOT/agents-before-tamper.md"
printf '%s\n' '# changed after apply' >> "$WORKSPACE/AGENTS.md"
if bash "$CLI" rollback --manifest "$MANIFEST" --yes \
    > "$TMP_ROOT/changed-rollback.log" 2>&1; then
    echo "FAIL: rollback overwrote a target changed after apply" >&2
    exit 1
fi
grep -Fq 'changed after apply' "$TMP_ROOT/changed-rollback.log"
cp "$TMP_ROOT/agents-before-tamper.md" "$WORKSPACE/AGENTS.md"

bash "$CLI" rollback --manifest "$MANIFEST" --yes --json > "$TMP_ROOT/rollback.json"
[[ ! -e "$WORKSPACE/.forge/skills/demo" ]]
[[ ! -e "$WORKSPACE/AGENTS.md" ]]
[[ ! -e "$WORKSPACE/.mcp.json" ]]

mkdir -p \
    "$WORKSPACE/.cline/skills/leaky" \
    "$WORKSPACE/.forge/skills/leaky"
cp "$SKILL_DIR/SKILL.md" "$WORKSPACE/.cline/skills/leaky/SKILL.md"
cp "$SCRIPT_DIR/test-migration-core.sh" \
    "$WORKSPACE/.cline/skills/leaky/payload.sh"
printf '%s\n' 'preserve-existing-target' \
    > "$WORKSPACE/.forge/skills/leaky/sentinel.txt"

HOME="$(native_path "$TEST_HOME")" bash "$CLI" plan \
    --workspace "$WORKSPACE" \
    --source cline/ide \
    --target forge/cli \
    --objects skills \
    --scope project \
    --json > "$TMP_ROOT/secret-preflight-plan.json"
python3 - "$TMP_ROOT/secret-preflight-plan.json" <<'PY'
import json
import sys
from pathlib import Path

plan = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
assert plan["items"][0]["status"] == "invalid"
assert "source credential preflight failed" in plan["items"][0]["reason"]
assert "payload.sh: provider credential pattern" in plan["items"][0]["reason"]
PY

mv "$WORKSPACE/.cline/skills/leaky/payload.sh" \
    "$TMP_ROOT/leaky-payload.sh"
python3 - \
    "$SCRIPT_DIR" \
    "$SKILL_DIR/references/registry-v2.json" \
    "$WORKSPACE" \
    "$TEST_HOME" \
    "$TMP_ROOT/leaky-payload.sh" <<'PY'
import shutil
import sys
from pathlib import Path

sys.path.insert(0, sys.argv[1])
from migration_core import Registry, apply_plan, build_plan

registry = Registry(Path(sys.argv[2]), Path(sys.argv[3]), Path(sys.argv[4]))
plan, _ = build_plan(
    registry,
    "cline/ide",
    "forge/cli",
    ["skills"],
    "project",
)
assert plan[0].status == "ready"
shutil.copy2(
    Path(sys.argv[5]),
    Path(sys.argv[3], ".cline/skills/leaky/payload.sh"),
)
try:
    apply_plan(plan, Path(sys.argv[3]))
except ValueError as error:
    assert "source credential preflight failed" in str(error)
else:
    raise AssertionError("apply did not rescan a changed Skill source")
PY

HOME="$(native_path "$TEST_HOME")" bash "$CLI" plan \
    --workspace "$WORKSPACE" \
    --source cline/ide \
    --target forge/cli \
    --objects skills \
    --scope project \
    --output "$TMP_ROOT/blocked-plan.json" \
    --json >/dev/null
if HOME="$(native_path "$TEST_HOME")" bash "$CLI" apply "$TMP_ROOT/blocked-plan.json" \
    --strict --yes > "$TMP_ROOT/secret-preflight-apply.log" 2>&1; then
    echo "FAIL: profile-aware apply copied a Skill with a literal credential" >&2
    exit 1
fi
grep -Fq 'preserve-existing-target' \
    "$WORKSPACE/.forge/skills/leaky/sentinel.txt"
[[ ! -e "$WORKSPACE/.forge/skills/leaky/payload.sh" ]]
mv "$WORKSPACE/.cline/skills/leaky" "$TMP_ROOT/leaky-source"
mv "$WORKSPACE/.forge/skills/leaky" "$TMP_ROOT/leaky-target"

mkdir -p "$WORKSPACE/.cline/skills/drift"
printf '%s\n' '---' 'name: drift' 'description: Drift fixture.' '---' '# Before' \
    > "$WORKSPACE/.cline/skills/drift/SKILL.md"
HOME="$(native_path "$TEST_HOME")" bash "$CLI" plan \
    --workspace "$WORKSPACE" \
    --source cline/ide \
    --target forge/cli \
    --objects skills \
    --scope project \
    --output "$TMP_ROOT/drift-plan.json" \
    --json >/dev/null
printf '%s\n' '# Changed after review' >> "$WORKSPACE/.cline/skills/drift/SKILL.md"
if HOME="$(native_path "$TEST_HOME")" bash "$CLI" apply "$TMP_ROOT/drift-plan.json" --yes \
    > "$TMP_ROOT/drift-apply.log" 2>&1; then
    echo "FAIL: apply accepted a source changed after plan review" >&2
    exit 1
fi
grep -Fq 'source changed after plan review' "$TMP_ROOT/drift-apply.log"
[[ ! -e "$WORKSPACE/.forge/skills/drift" ]]
mv "$WORKSPACE/.cline/skills/drift" "$TMP_ROOT/drift-source"

GIT_WORKSPACE="$TMP_ROOT/git-workspace"
mkdir -p "$GIT_WORKSPACE/.cline/skills/git-drift"
printf '%s\n' '---' 'name: git-drift' 'description: Git drift fixture.' '---' '# Before' \
    > "$GIT_WORKSPACE/.cline/skills/git-drift/SKILL.md"
git -C "$GIT_WORKSPACE" init -q
git -C "$GIT_WORKSPACE" config user.name 'Migration Test'
git -C "$GIT_WORKSPACE" config user.email 'migration-test@example.invalid'
git -C "$GIT_WORKSPACE" add .
git -C "$GIT_WORKSPACE" commit -qm 'fixture: initial state'
HOME="$(native_path "$TEST_HOME")" bash "$CLI" plan \
    --workspace "$GIT_WORKSPACE" \
    --source cline/ide \
    --target forge/cli \
    --objects skills \
    --scope project \
    --output "$TMP_ROOT/git-drift-plan.json" \
    --json >/dev/null
printf '%s\n' '# unrelated reviewed-context change' > "$GIT_WORKSPACE/README.md"
git -C "$GIT_WORKSPACE" add README.md
git -C "$GIT_WORKSPACE" commit -qm 'fixture: advance head'
if HOME="$(native_path "$TEST_HOME")" bash "$CLI" apply "$TMP_ROOT/git-drift-plan.json" --yes \
    > "$TMP_ROOT/git-drift-apply.log" 2>&1; then
    echo "FAIL: apply accepted a changed Git HEAD after plan review" >&2
    exit 1
fi
grep -Fq 'Git head changed after plan review' "$TMP_ROOT/git-drift-apply.log"
[[ ! -e "$GIT_WORKSPACE/.forge/skills/git-drift" ]]

mkdir -p \
    "$WORKSPACE/.cline/skills/symlink-race" \
    "$WORKSPACE/.forge/skills/symlink-race"
cp "$SKILL_DIR/SKILL.md" \
    "$WORKSPACE/.cline/skills/symlink-race/SKILL.md"
printf '%s\n' 'safe-before-copy' \
    > "$WORKSPACE/.cline/skills/symlink-race/payload.txt"
printf '%s\n' 'outside-source-boundary' \
    > "$TMP_ROOT/symlink-race-external.txt"
printf '%s\n' 'preserve-symlink-race-target' \
    > "$WORKSPACE/.forge/skills/symlink-race/sentinel.txt"
python3 - \
    "$SCRIPT_DIR" \
    "$SKILL_DIR/references/registry-v2.json" \
    "$WORKSPACE" \
    "$TEST_HOME" \
    "$TMP_ROOT/symlink-race-external.txt" <<'PY'
import shutil
import sys
from pathlib import Path

sys.path.insert(0, sys.argv[1])
from migration_core import Registry, apply_plan, build_plan

workspace = Path(sys.argv[3]).resolve()
source_skill = workspace / ".cline/skills/symlink-race"
payload = source_skill / "payload.txt"
external = Path(sys.argv[5])
registry = Registry(Path(sys.argv[2]), workspace, Path(sys.argv[4]))
plan, _ = build_plan(
    registry,
    "cline/ide",
    "forge/cli",
    ["skills"],
    "project",
)
assert plan[0].status == "ready"
# Arming the race requires real symlink privileges; unprivileged Windows
# hosts reject symlink_to() outright, so skip instead of erroring.
_probe = source_skill / ".symlink-probe"
try:
    _probe.symlink_to(external)
    _probe.unlink()
except OSError:
    print("SKIP: symlink race case (symlinks unavailable on this host)")
    raise SystemExit(0)
original_copytree = shutil.copytree


def injecting_copytree(src, dst, *args, **kwargs):
    if Path(src) == source_skill:
        payload.unlink()
        payload.symlink_to(external)
    return original_copytree(src, dst, *args, **kwargs)


shutil.copytree = injecting_copytree
try:
    apply_plan(plan, workspace)
except ValueError as error:
    assert "symbolic links are not allowed" in str(error)
else:
    raise AssertionError("apply followed a Skill symlink introduced during copy")
PY
grep -Fq 'preserve-symlink-race-target' \
    "$WORKSPACE/.forge/skills/symlink-race/sentinel.txt"
[[ ! -e "$WORKSPACE/.forge/skills/symlink-race/payload.txt" ]]
mv "$WORKSPACE/.cline/skills/symlink-race" \
    "$TMP_ROOT/symlink-race-source"
mv "$WORKSPACE/.forge/skills/symlink-race" \
    "$TMP_ROOT/symlink-race-target"

mkdir -p "$TMP_ROOT/external-qwen"
ln -s "$TMP_ROOT/external-qwen" "$WORKSPACE/.qwen"
if [[ ! -L "$WORKSPACE/.qwen" ]]; then
    echo "SKIP: qwen symlink-boundary case (symlinks unavailable on this host)"
    rm -rf "$WORKSPACE/.qwen"
else
    HOME="$(native_path "$TEST_HOME")" bash "$CLI" plan \
        --workspace "$WORKSPACE" \
        --source cline/ide \
        --target qwen-code/cli \
        --objects skills \
        --scope project \
        --json > "$TMP_ROOT/symlink-plan.json"
    python3 - "$TMP_ROOT/symlink-plan.json" <<'PY'
import json
import sys
from pathlib import Path

plan = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
assert plan["items"][0]["status"] == "invalid"
assert "symbolic links are not allowed" in plan["items"][0]["reason"]
PY
    rm -f "$WORKSPACE/.qwen"
fi

HOME="$(native_path "$TEST_HOME")" bash "$CLI" plan \
    --workspace "$WORKSPACE" \
    --source cline/ide \
    --target firebase-studio/legacy-workspace \
    --objects instructions \
    --scope project \
    --json > "$TMP_ROOT/source-only.json"
python3 - "$TMP_ROOT/source-only.json" <<'PY'
import json
import sys
from pathlib import Path

plan = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
assert plan["items"][0]["status"] == "invalid"
assert "source-only" in plan["items"][0]["reason"]
PY

HOME="$(native_path "$TEST_HOME")" bash "$CLI" legacy --print-path cline mcp \
    | grep -F '~/.cline/data/settings/cline_mcp_settings.json' >/dev/null

python3 - "$SCRIPT_DIR" "$SKILL_DIR/evals/files" <<'PY'
import sys
from pathlib import Path

sys.path.insert(0, sys.argv[1])
from migration_core import emit_instruction, parse_instruction

fixtures = Path(sys.argv[2])
source = (fixtures / "instruction-ir-source.mdc").read_text(encoding="utf-8")
golden = (fixtures / "instruction-ir-cursor.golden.mdc").read_text(encoding="utf-8")
instruction = parse_instruction(source, "cursor-mdc")
rendered, loss = emit_instruction(instruction, "cursor-mdc")
assert rendered == golden
assert loss.lossy is False
assert instruction.activation == "glob"
assert instruction.globs == ["src/**/*.ts", "tests/**/*.ts"]
try:
    emit_instruction(instruction, "agents-md")
except ValueError as error:
    assert "cannot safely represent glob activation" in str(error)
else:
    raise AssertionError("conditional Cursor rule was flattened into AGENTS.md")

plain = parse_instruction("# Always\n", "agents-md")
rendered, loss = emit_instruction(plain, "agents-md")
assert rendered == "# Always\n"
assert not rendered.startswith("---")
assert loss.lossy is False
PY

INSTRUCTION_SECRET_WORKSPACE="$TMP_ROOT/instruction-secret-workspace"
mkdir -p "$INSTRUCTION_SECRET_WORKSPACE/.cline/rules"
printf '%s%s\n' 'token=fixtureliteral' 'value12345' \
    > "$INSTRUCTION_SECRET_WORKSPACE/.cline/rules/leak.md"
HOME="$(native_path "$TEST_HOME")" bash "$CLI" plan \
    --workspace "$INSTRUCTION_SECRET_WORKSPACE" \
    --source cline/ide \
    --target forge/cli \
    --objects instructions \
    --scope project \
    --json > "$TMP_ROOT/instruction-secret-plan.json"
python3 - "$TMP_ROOT/instruction-secret-plan.json" <<'PY'
import json
import sys
from pathlib import Path

plan = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
assert plan["items"][0]["status"] == "invalid"
assert "instruction credential preflight failed" in plan["items"][0]["reason"]
assert "fixtureliteralvalue12345" not in json.dumps(plan)
PY

ALIAS_WORKSPACE="$TMP_ROOT/alias-workspace"
mkdir -p "$ALIAS_WORKSPACE/.cline/rules"
printf '%s\n' '# Canonical' > "$ALIAS_WORKSPACE/.cline/rules/rule.md"
printf '%s\n' '# Compatibility' > "$ALIAS_WORKSPACE/.clinerules"
HOME="$(native_path "$TEST_HOME")" bash "$CLI" inventory \
    --workspace "$ALIAS_WORKSPACE" \
    --product cline/ide \
    --json > "$TMP_ROOT/alias-inventory.json"
HOME="$(native_path "$TEST_HOME")" bash "$CLI" plan \
    --workspace "$ALIAS_WORKSPACE" \
    --source cline/ide \
    --target forge/cli \
    --objects instructions \
    --scope project \
    --json > "$TMP_ROOT/alias-plan.json"
python3 - "$TMP_ROOT/alias-inventory.json" "$TMP_ROOT/alias-plan.json" <<'PY'
import json
import sys
from pathlib import Path

inventory = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
instruction_rows = [
    row
    for row in inventory
    if row.get("object_type") == "instructions" and row.get("scope") == "project"
]
assert sum(bool(row["exists"]) for row in instruction_rows) == 2
assert all(row["alias_conflict"] for row in instruction_rows)
plan = json.loads(Path(sys.argv[2]).read_text(encoding="utf-8"))
assert plan["items"][0]["status"] == "manual-rebuild"
assert "alias conflict" in plan["items"][0]["reason"]
PY

TRANSACTION_WORKSPACE="$TMP_ROOT/transaction-workspace"
mkdir -p \
    "$TRANSACTION_WORKSPACE/.cline/skills/one" \
    "$TRANSACTION_WORKSPACE/.cline/skills/two" \
    "$TRANSACTION_WORKSPACE/.forge/skills/one" \
    "$TRANSACTION_WORKSPACE/.forge/skills/two"
for skill_name in one two; do
    printf '%s\n' '---' "name: $skill_name" 'description: Transaction fixture.' '---' \
        > "$TRANSACTION_WORKSPACE/.cline/skills/$skill_name/SKILL.md"
    printf '%s\n' "original-$skill_name" \
        > "$TRANSACTION_WORKSPACE/.forge/skills/$skill_name/sentinel.txt"
done
python3 - \
    "$SCRIPT_DIR" \
    "$SKILL_DIR/references/registry-v2.json" \
    "$TRANSACTION_WORKSPACE" \
    "$TEST_HOME" <<'PY'
import sys
from pathlib import Path

sys.path.insert(0, sys.argv[1])
import migration_core

workspace = Path(sys.argv[3]).resolve()
registry = migration_core.Registry(Path(sys.argv[2]), workspace, Path(sys.argv[4]))
plan, _ = migration_core.build_plan(
    registry,
    "cline/ide",
    "forge/cli",
    ["skills"],
    "project",
)
assert plan[0].status == "ready"
original_finish = migration_core.finish_change
calls = 0


def fail_after_second_write(change, target):
    global calls
    calls += 1
    original_finish(change, target)
    if calls == 2:
        raise RuntimeError("injected second-write failure")


migration_core.finish_change = fail_after_second_write
try:
    migration_core.apply_plan(plan, workspace)
except RuntimeError as error:
    assert "injected second-write failure" in str(error)
else:
    raise AssertionError("injected transaction failure was not raised")
for skill_name in ("one", "two"):
    target = workspace / ".forge/skills" / skill_name
    assert (target / "sentinel.txt").read_text(encoding="utf-8").strip() == (
        f"original-{skill_name}"
    )
    assert not (target / "SKILL.md").exists()
manifest_dir = workspace / ".agent-context-migration/manifests"
assert not manifest_dir.exists() or not list(manifest_dir.glob("*.json"))
PY

echo "Migration core test passed"
