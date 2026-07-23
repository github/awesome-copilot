#!/usr/bin/env bash

set -euo pipefail

# SOURCE OF TRUTH: skills/agent-skills-setup/references/ide-registry.md (and ide-paths.json).
# Keep these functions in sync with that file. Drift is caught by test-ide-paths.sh.
SOURCE_DIR="${AGENT_SKILLS_SOURCE_DIR:-${HOME}/.gemini/antigravity/skills}"
CLAUDE_DIR="${AGENT_SKILLS_CLAUDE_DIR:-${HOME}/.claude/skills}"
CODEX_DIR="${AGENT_SKILLS_CODEX_DIR:-${HOME}/.agents/skills}"
COPILOT_DIR="${AGENT_SKILLS_COPILOT_DIR:-${HOME}/.copilot/skills}"
OPENCLAW_DIR="${AGENT_SKILLS_OPENCLAW_DIR:-${HOME}/.openclaw/skills}"
TRAE_DIR="${AGENT_SKILLS_TRAE_DIR:-${HOME}/.trae/skills}"
TRAE_CN_DIR="${AGENT_SKILLS_TRAE_CN_DIR:-${HOME}/.trae-cn/skills}"
WORKBUDDY_DIR="${AGENT_SKILLS_WORKBUDDY_DIR:-${HOME}/.workbuddy/skills}"

DRY_RUN=0
TARGETS_RAW="claude,codex,copilot,openclaw,trae,trae-cn,workbuddy"

usage() {
    cat <<'EOF'
Usage: sync-global-skills.sh [--dry-run] [--targets claude,codex,copilot,openclaw,trae,trae-cn,workbuddy]

Mirrors Antigravity global capabilities (skills) into supported IDE global skill directories.
Antigravity is treated as the source of truth.

Options:
  --dry-run              Preview rsync operations without modifying files.
  --targets <list>       Comma-separated subset of targets to sync.
  -h, --help             Show this help text.
EOF
}

while [[ $# -gt 0 ]]; do
    case "$1" in
        --dry-run)
            DRY_RUN=1
            shift
            ;;
        --targets)
            [[ $# -ge 2 ]] || {
                echo "ERROR: --targets requires a value" >&2
                exit 1
            }
            TARGETS_RAW="$2"
            shift 2
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        *)
            echo "ERROR: Unknown argument: $1" >&2
            usage >&2
            exit 1
            ;;
    esac
done

if [[ ! -d "$SOURCE_DIR" ]]; then
    echo "ERROR: Antigravity skills source not found: $SOURCE_DIR" >&2
    exit 1
fi

contains_target() {
    local needle="$1"
    local item

    for item in "${TARGETS[@]}"; do
        [[ "$item" == "$needle" ]] && return 0
    done

    return 1
}

split_targets() {
    local raw="$1"
    local old_ifs="$IFS"

    IFS=',' read -r -a TARGETS <<< "$raw"
    IFS="$old_ifs"

    if [[ ${#TARGETS[@]} -eq 0 ]]; then
        echo "ERROR: No targets specified" >&2
        exit 1
    fi
}

ensure_targets_valid() {
    local item

    for item in "${TARGETS[@]}"; do
        case "$item" in
            claude|codex|copilot|openclaw|trae|trae-cn|workbuddy)
                ;;
            *)
                echo "ERROR: Unsupported target: $item" >&2
                exit 1
                ;;
        esac
    done
}

rsync_mirror() {
    local src="$1"
    local dest="$2"
    shift 2
    local cmd=(rsync -a --delete)

    if [[ $DRY_RUN -eq 1 ]]; then
        cmd+=(--dry-run --itemize-changes)
    fi

    if [[ $# -gt 0 ]]; then
        cmd+=("$@")
    fi

    cmd+=("$src/" "$dest/")
    "${cmd[@]}"
}

verify_directory_inventory() {
    local left="$1"
    local right="$2"
    local label="$3"
    local left_list
    local right_list

    left_list="$(mktemp /tmp/skill-sync-left.XXXXXX)"
    right_list="$(mktemp /tmp/skill-sync-right.XXXXXX)"

    find "$left" -mindepth 1 -maxdepth 1 -type d -exec basename {} \; | sort > "$left_list"
    find "$right" -mindepth 1 -maxdepth 1 -type d -exec basename {} \; | sort > "$right_list"

    if [[ "$label" == "Codex" ]]; then
        grep -v '^\.system$' "$right_list" > "$right_list.filtered"
        mv "$right_list.filtered" "$right_list"
    fi

    if ! diff -u "$left_list" "$right_list" >/dev/null; then
        echo "VERIFY FAIL: $label inventory differs from Antigravity" >&2
        return 1
    fi

    echo "VERIFY PASS: $label inventory matches Antigravity"
}

verify_shared_directories() {
    local target_root="$1"
    local label="$2"
    local skill

    while IFS= read -r skill; do
        diff -qr "$SOURCE_DIR/$skill" "$target_root/$skill" >/dev/null || {
            echo "VERIFY FAIL: $label content drift in $skill" >&2
            return 1
        }
    done < <(find "$SOURCE_DIR" -mindepth 1 -maxdepth 1 -type d -exec basename {} \; | sort)

    echo "VERIFY PASS: $label content matches Antigravity"
}

# Copilot is handled by the shared rsync_mirror path (full skill directories),
# consistent with smart-ide-migration.sh H4. No custom flattening to <name>.md.

split_targets "$TARGETS_RAW"
ensure_targets_valid

VERIFY_FAILED=0

echo "Source of truth: $SOURCE_DIR"
echo "Targets: ${TARGETS[*]}"
[[ $DRY_RUN -eq 1 ]] && echo "Mode: dry-run"

if contains_target claude; then
    mkdir -p "$CLAUDE_DIR"
    rsync_mirror "$SOURCE_DIR" "$CLAUDE_DIR"
fi

if contains_target codex; then
    mkdir -p "$CODEX_DIR"
    rsync_mirror "$SOURCE_DIR" "$CODEX_DIR" --filter='P .system/'
fi

if contains_target trae; then
    mkdir -p "$TRAE_DIR"
    rsync_mirror "$SOURCE_DIR" "$TRAE_DIR"
fi

if contains_target trae-cn; then
    mkdir -p "$TRAE_CN_DIR"
    rsync_mirror "$SOURCE_DIR" "$TRAE_CN_DIR"
fi

if contains_target openclaw; then
    mkdir -p "$OPENCLAW_DIR"
    rsync_mirror "$SOURCE_DIR" "$OPENCLAW_DIR"
fi

if contains_target workbuddy; then
    mkdir -p "$WORKBUDDY_DIR"
    rsync_mirror "$SOURCE_DIR" "$WORKBUDDY_DIR"
fi

if contains_target copilot; then
    mkdir -p "$COPILOT_DIR"
    rsync_mirror "$SOURCE_DIR" "$COPILOT_DIR"
fi

if [[ $DRY_RUN -eq 0 ]]; then
    if contains_target claude; then
        verify_directory_inventory "$SOURCE_DIR" "$CLAUDE_DIR" "Claude" && verify_shared_directories "$CLAUDE_DIR" "Claude" || VERIFY_FAILED=1
    fi

    if contains_target codex; then
        verify_directory_inventory "$SOURCE_DIR" "$CODEX_DIR" "Codex" && verify_shared_directories "$CODEX_DIR" "Codex" || VERIFY_FAILED=1
    fi

    if contains_target trae; then
        verify_directory_inventory "$SOURCE_DIR" "$TRAE_DIR" "Trae" && verify_shared_directories "$TRAE_DIR" "Trae" || VERIFY_FAILED=1
    fi

    if contains_target trae-cn; then
        verify_directory_inventory "$SOURCE_DIR" "$TRAE_CN_DIR" "Trae CN" && verify_shared_directories "$TRAE_CN_DIR" "Trae CN" || VERIFY_FAILED=1
    fi

    if contains_target openclaw; then
        verify_directory_inventory "$SOURCE_DIR" "$OPENCLAW_DIR" "OpenClaw" && verify_shared_directories "$OPENCLAW_DIR" "OpenClaw" || VERIFY_FAILED=1
    fi

    if contains_target workbuddy; then
        verify_directory_inventory "$SOURCE_DIR" "$WORKBUDDY_DIR" "WorkBuddy" && verify_shared_directories "$WORKBUDDY_DIR" "WorkBuddy" || VERIFY_FAILED=1
    fi

    if contains_target copilot; then
        verify_directory_inventory "$SOURCE_DIR" "$COPILOT_DIR" "Copilot" && verify_shared_directories "$COPILOT_DIR" "Copilot" || VERIFY_FAILED=1
    fi

    if [[ $VERIFY_FAILED -ne 0 ]]; then
        echo "Sync finished with verification failures" >&2
        exit 1
    fi
fi

echo "Sync complete"