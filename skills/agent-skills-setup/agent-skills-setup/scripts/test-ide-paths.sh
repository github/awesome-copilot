#!/usr/bin/env bash

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
JSON_FILE="${SCRIPT_DIR}/../references/ide-paths.json"
MIGRATION_SCRIPT="${SCRIPT_DIR}/smart-ide-migration.sh"
IDE_REFERENCE_DIR="${SCRIPT_DIR}/../references/ides"

if [[ ! -f "$JSON_FILE" ]]; then
    echo "ERROR: cannot find ide-paths.json at $JSON_FILE" >&2
    exit 1
fi
if [[ ! -f "$MIGRATION_SCRIPT" ]]; then
    echo "ERROR: cannot find smart-ide-migration.sh at $MIGRATION_SCRIPT" >&2
    exit 1
fi

failures=0
checks=0

dump_rows() {
    python3 - "$JSON_FILE" "$@" <<'PYEOF'
import json, sys, platform
data = json.load(open(sys.argv[1]))
keymap = {"global_skills":"global","project_skills":"project-skills","rules":"rules","mcp":"mcp","project_mcp":"project-mcp","project_config":"project-config","config":"config"}
key_filter = set(sys.argv[2:]) if len(sys.argv) > 2 else None
os_key = {"Darwin": "darwin", "Linux": "linux"}.get(platform.system(), "windows")
for ide in sorted(data.keys()):
    if key_filter is not None and ide not in key_filter:
        continue
    for jk in keymap:
        val = data[ide].get(jk, "")
        if isinstance(val, dict):
            val = val.get(os_key, "")
        print(f"{ide}\t{jk}\t{keymap[jk]}\t{val}")
PYEOF
}

dump_registry_rows() {
    python3 - "$JSON_FILE" "$@" <<'PYEOF'
import json
import sys

# Native Windows Python translates \n to \r\n on a text-mode stdout,
# leaving a stray \r on the last TSV field consumed by `read`.
sys.stdout.reconfigure(newline="")
data = json.load(open(sys.argv[1]))
for ide in sys.argv[2:]:
    for key, value in data[ide].items():
        if isinstance(value, dict):
            for platform_name, platform_value in sorted(value.items()):
                if platform_value:
                    print(f"{ide}\t{key}:{platform_name}\t{platform_value}")
        elif value:
            print(f"{ide}\t{key}\t{value}")
PYEOF
}

echo "========================================"
echo "Drift test: ide-paths.json vs script"
echo "========================================"
echo ""

ALL_ROWS="$(dump_rows)"
while IFS=$'\t' read -r ide jsonkey scriptobj expected; do
    [[ -z "$ide" ]] && continue
    checks=$((checks + 1))

    actual="$(bash "$MIGRATION_SCRIPT" legacy --print-path "$ide" "$scriptobj" 2>/dev/null)"
    rc=$?

    if [[ -z "$expected" ]]; then
        if [[ -n "$actual" ]]; then
            echo "FAIL: ${ide}/${jsonkey} - expected empty, got: ${actual}"
            failures=$((failures + 1))
        else
            echo "PASS: ${ide}/${jsonkey} -> (unsupported/empty)"
        fi
    else
        if [[ $rc -ne 0 ]]; then
            echo "FAIL: ${ide}/${jsonkey} - script exited non-zero resolving object '${scriptobj}'"
            failures=$((failures + 1))
        elif [[ "$actual" != "$expected" ]]; then
            echo "FAIL: ${ide}/${jsonkey}"
            echo "  expected: ${expected}"
            echo "  actual:   ${actual}"
            failures=$((failures + 1))
        else
            echo "PASS: ${ide}/${jsonkey} -> ${actual}"
        fi
    fi
done <<< "$ALL_ROWS"

PIECES_CANONICAL_RC=0
python3 - "$JSON_FILE" <<'PYEOF' || PIECES_CANONICAL_RC=$?
import json, sys
data = json.load(open(sys.argv[1]))
required = {"global_skills", "project_skills", "rules", "mcp", "project_mcp", "project_config", "config"}
entry = data.get("pieces", {})
if set(entry) != required or any(entry.values()):
    raise SystemExit(1)
PYEOF
checks=$((checks + 1))
if [[ "$PIECES_CANONICAL_RC" -eq 0 ]]; then
    echo "PASS: pieces canonical entry has all objects explicitly unsupported"
else
    echo "FAIL: pieces canonical entry must have exactly the empty object map"
    failures=$((failures + 1))
fi

COPILOT_PROJECT_SKILLS="$(bash "$MIGRATION_SCRIPT" legacy --print-path copilot project-skills 2>/dev/null)"
checks=$((checks + 1))
if [[ "$COPILOT_PROJECT_SKILLS" == ".github/skills" ]]; then
    echo "PASS: copilot/project_skills -> ${COPILOT_PROJECT_SKILLS}"
else
    echo "FAIL: copilot/project_skills"
    echo "  expected: .github/skills"
    echo "  actual:   ${COPILOT_PROJECT_SKILLS}"
    failures=$((failures + 1))
fi

WINDSURF_GLOBAL_SKILLS="$(bash "$MIGRATION_SCRIPT" legacy --print-path windsurf global 2>/dev/null)"
checks=$((checks + 1))
if [[ "$WINDSURF_GLOBAL_SKILLS" == "~/.codeium/windsurf/skills" ]]; then
    echo "PASS: windsurf/global -> ${WINDSURF_GLOBAL_SKILLS}"
else
    echo "FAIL: windsurf/global expected ~/.codeium/windsurf/skills, got '${WINDSURF_GLOBAL_SKILLS}'"
    failures=$((failures + 1))
fi

WINDSURF_PROJECT_SKILLS="$(bash "$MIGRATION_SCRIPT" legacy --print-path windsurf project-skills 2>/dev/null)"
checks=$((checks + 1))
if [[ "$WINDSURF_PROJECT_SKILLS" == ".windsurf/skills" ]]; then
    echo "PASS: windsurf/project-skills -> ${WINDSURF_PROJECT_SKILLS}"
else
    echo "FAIL: windsurf/project-skills expected .windsurf/skills, got '${WINDSURF_PROJECT_SKILLS}'"
    failures=$((failures + 1))
fi

COPILOT_HELP="$(bash "$MIGRATION_SCRIPT" legacy --help 2>/dev/null)"
checks=$((checks + 1))
if grep -Fq "copilot is GitHub Copilot CLI" <<< "$COPILOT_HELP" && ! grep -Fq "copilot is VS Code Copilot" <<< "$COPILOT_HELP"; then
    echo "PASS: copilot help identifies the CLI target"
else
    echo "FAIL: copilot help must identify GitHub Copilot CLI, not VS Code Copilot"
    failures=$((failures + 1))
fi

COPILOT_PROMPT_WORKSPACE="$(mktemp -d /tmp/copilot-prompt-scope.XXXXXX)"
trap 'rm -rf "$COPILOT_PROMPT_WORKSPACE"' EXIT
mkdir -p "$COPILOT_PROMPT_WORKSPACE/.github/prompts"
printf '%s\n' '---' 'description: test prompt' '---' > "$COPILOT_PROMPT_WORKSPACE/.github/prompts/test.prompt.md"
COPILOT_PROMPT_OUTPUT="$(bash "$MIGRATION_SCRIPT" legacy --source copilot --target cursor --workspace "$COPILOT_PROMPT_WORKSPACE" --objects prompts --dry-run 2>&1)"
checks=$((checks + 1))
if grep -Fq "source IDE does not support prompt templates" <<< "$COPILOT_PROMPT_OUTPUT"; then
    echo "PASS: copilot CLI prompt migration is unsupported"
else
    echo "FAIL: copilot CLI must not migrate IDE-only prompt files"
    failures=$((failures + 1))
fi

for cody_object in global project project-skills rules mcp project-mcp project-config config; do
    checks=$((checks + 1))
    if bash "$MIGRATION_SCRIPT" legacy --print-path cody "$cody_object" >/dev/null 2>&1; then
        echo "FAIL: cody/${cody_object} must remain unsupported/empty"
        failures=$((failures + 1))
    else
        echo "PASS: cody/${cody_object} -> (unsupported/empty)"
    fi
done

for supermaven_object in global project project-skills rules mcp project-mcp project-config config; do
    checks=$((checks + 1))
    if bash "$MIGRATION_SCRIPT" legacy --print-path supermaven "$supermaven_object" >/dev/null 2>&1; then
        echo "FAIL: supermaven/${supermaven_object} must remain unsupported/empty"
        failures=$((failures + 1))
    else
        echo "PASS: supermaven/${supermaven_object} -> (unsupported/empty)"
    fi
done

GEMINI_GLOBAL_SKILLS="$(bash "$MIGRATION_SCRIPT" legacy --print-path gemini-cli global 2>/dev/null)"
checks=$((checks + 1))
if [[ "$GEMINI_GLOBAL_SKILLS" == "~/.gemini/skills" ]]; then
    echo "PASS: gemini-cli/global -> ${GEMINI_GLOBAL_SKILLS}"
else
    echo "FAIL: gemini-cli/global expected ~/.gemini/skills, got '${GEMINI_GLOBAL_SKILLS}'"
    failures=$((failures + 1))
fi

GEMINI_PROJECT_SKILLS="$(bash "$MIGRATION_SCRIPT" legacy --print-path gemini-cli project-skills 2>/dev/null)"
checks=$((checks + 1))
if [[ "$GEMINI_PROJECT_SKILLS" == ".gemini/skills" ]]; then
    echo "PASS: gemini-cli/project-skills -> ${GEMINI_PROJECT_SKILLS}"
else
    echo "FAIL: gemini-cli/project-skills expected .gemini/skills, got '${GEMINI_PROJECT_SKILLS}'"
    failures=$((failures + 1))
fi

for gemini_object in mcp project-mcp project-config config; do
    checks=$((checks + 1))
    actual="$(bash "$MIGRATION_SCRIPT" legacy --print-path gemini-cli "$gemini_object" 2>/dev/null || true)"
    case "$gemini_object" in
        mcp|config) expected="~/.gemini/settings.json" ;;
        project-mcp|project-config) expected=".gemini/settings.json" ;;
    esac
    if [[ "$actual" == "$expected" ]]; then
        echo "PASS: gemini-cli/${gemini_object} -> ${actual}"
    else
        echo "FAIL: gemini-cli/${gemini_object} expected ${expected}, got '${actual}'"
        failures=$((failures + 1))
    fi
done

if [[ -d "$IDE_REFERENCE_DIR" ]]; then
    echo ""
    echo "========================================"
    echo "Cross-check: key IDEs vs per-IDE references"
    echo "========================================"
    echo ""

    KEY_ROWS="$(dump_registry_rows antigravity kimiai copilot codex workbuddy claude claude-desktop openclaw neovim continue aider roo-code cline amazon-q goose-cli pearai pieces blackbox gemini-cli opencode kilocode kiro augment-code void-editor baidu-comate tencent-codebuddy zcode cody codeium tabnine replit supermaven vscode windsurf jetbrains trae trae-cn)"
    while IFS=$'\t' read -r ide jsonkey expected; do
        [[ -z "$expected" ]] && continue
        checks=$((checks + 1))
        if grep -Fq "$expected" "$IDE_REFERENCE_DIR/${ide}.md"; then
            echo "PASS (reference): ${ide}/${jsonkey} present in ${ide}.md"
        else
            echo "FAIL (reference): ${ide}/${jsonkey} value '${expected}' NOT found in ${ide}.md"
            failures=$((failures + 1))
        fi
    done <<< "$KEY_ROWS"
else
    echo "WARN: per-IDE reference directory not found at $IDE_REFERENCE_DIR; skipping reference cross-check" >&2
fi

echo ""
echo "========================================"
if [[ $failures -eq 0 ]]; then
    echo "ALL PASS: ${checks} checks matched ide-paths.json / per-IDE references"
    echo "========================================"
    exit 0
else
    echo "DRIFT DETECTED: ${failures}/${checks} checks FAILED"
    echo "========================================"
    exit 1
fi
