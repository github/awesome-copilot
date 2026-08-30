#!/usr/bin/env bash

set -euo pipefail

if [[ "${BASH_SOURCE[0]}" == "$0" && \
      "${AGENT_SKILLS_SETUP_INTERNAL_LEGACY:-}" != "1" ]]; then
    echo "ERROR: legacy-smart-ide-migration.sh is internal; use smart-ide-migration.sh." >&2
    exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

source "${SCRIPT_DIR}/common.sh"

SOURCE_IDE=""
TARGET_IDE=""
WORKSPACE_ROOT="$(pwd)"
WORKSPACE_EXPLICIT=0
OBJECTS=""
SOURCE_MCP_FILE=""
SCOPE="global"
STRATEGY="backup"
DRY_RUN=0
ASSUME_YES=0
REPORT_FILE=""
PRINT_PATH_IDE=""
PRINT_PATH_OBJECT=""
OPENCODE_VERSION="v1"
OPENCODE_VERSION_EXPLICIT=0

PATH_RESOLVER="${SCRIPT_DIR}/ide-paths.tsv"
[[ -r "$PATH_RESOLVER" ]] || {
    log_error "generated path resolver is missing: $PATH_RESOLVER"
    exit 1
}
SUPPORTED_IDES="$(awk -F $'\t' '
    NR > 1 && !seen[$1]++ { printf "%s%s", separator, $1; separator=" " }
' "$PATH_RESOLVER")"

MIGRATION_TOTAL=0
MIGRATION_SUCCESS=0
MIGRATION_FAILED=0
MIGRATION_SKIPPED=0

MIGRATION_STATUS_FILE=""
MIGRATION_MESSAGES_FILE=""
MIGRATION_MANUAL_FILE=""
MIGRATION_EVIDENCE_FILE=""

registry_platform() {
    case "$(uname -s)" in
        Darwin) printf 'darwin' ;;
        Linux) printf 'linux' ;;
        *) printf 'windows' ;;
    esac
}

registry_path() {
    local ide="$1"
    local object="$2"
    local platform
    local path

    [[ -r "$PATH_RESOLVER" ]] || {
        log_error "generated path resolver is missing: $PATH_RESOLVER"
        return 1
    }
    platform="$(registry_platform)"
    path="$(awk -F $'\t' -v ide="$ide" -v object="$object" -v platform="$platform" '
        $1 == ide && $2 == object && ($3 == "*" || $3 == platform) { print $4; exit }
    ' "$PATH_RESOLVER")"
    case "$path" in
        \~/*) printf '%s/%s\n' "$HOME" "${path#\~/}" ;;
        %USERPROFILE%\\*)
            path="${path#%USERPROFILE%\\}"
            printf '%s/%s\n' "$HOME" "${path//\\//}"
            ;;
        *) printf '%s\n' "$path" ;;
    esac
}

get_ide_name() {
    local ide="$1"
    case "$ide" in
        android-studio) echo "Android Studio" ;;
        antigravity) echo "Antigravity (Google)" ;;
        claude)      echo "Claude Code" ;;
        codely)      echo "Tuanjie Codely" ;;
        codex)       echo "OpenAI Codex CLI" ;;
        copilot)     echo "GitHub Copilot CLI" ;;
        cursor)      echo "Cursor" ;;
        windsurf)    echo "Windsurf" ;;
        jetbrains)   echo "JetBrains Junie" ;;
        jetbrains-ai) echo "JetBrains AI Assistant" ;;
        openclaw)    echo "OpenClaw" ;;
        trae)        echo "Trae (International)" ;;
        trae-cn)     echo "Trae CN (China)" ;;
        vscode)      echo "VS Code" ;;
        visual-studio) echo "Visual Studio" ;;
        firebase-studio) echo "Firebase Studio" ;;
        zed)         echo "Zed Editor" ;;
        neovim)      echo "Neovim" ;;
        emacs)       echo "Emacs" ;;
        continue)    echo "Continue.dev" ;;
        aider)       echo "Aider" ;;
        roo-code)    echo "Roo Code" ;;
        cline)       echo "Cline" ;;
        amazon-q)    echo "Amazon Q Developer" ;;
        cody)        echo "Sourcegraph Cody" ;;
        codeium)     echo "Codeium" ;;
        tabnine)     echo "Tabnine" ;;
        replit)      echo "Replit AI" ;;
        pearai)      echo "PearAI" ;;
        supermaven)  echo "Supermaven" ;;
        pieces)      echo "Pieces" ;;
        blackbox)    echo "Blackbox AI" ;;
        gemini-cli)  echo "Gemini CLI" ;;
        goose-cli)   echo "Goose CLI" ;;
        opencode)    echo "OpenCode" ;;
        kilocode)    echo "Kilo Code" ;;
        kimiai)      echo "Kimi AI" ;;
        workbuddy)   echo "WorkBuddy" ;;
        claude-desktop)    echo "Claude Desktop" ;;
        kiro)              echo "Kiro" ;;
        augment-code)      echo "Augment Code" ;;
        void-editor)       echo "Void Editor" ;;
        baidu-comate)      echo "Baidu Comate (ERNIE Code)" ;;
        tencent-codebuddy) echo "Tencent CodeBuddy" ;;
        zcode)             echo "ZCode (Zhipu)" ;;
        *)           echo "$ide" ;;
    esac
}

get_global_path() {
    case "$1" in
        antigravity)
            if [[ -n "${ANTIGRAVITY_SKILLS_DIR:-}" ]]; then
                echo "${ANTIGRAVITY_SKILLS_DIR}"
            elif [[ -d "${HOME}/.gemini/antigravity/skills" && ! -d "${HOME}/.gemini/config/skills" ]]; then
                echo "${HOME}/.gemini/antigravity/skills"
            else
                echo "${HOME}/.gemini/config/skills"
            fi
            ;;
        *) registry_path "$1" global ;;
    esac
}

get_project_path() {
    local ide="$1"
    case "$ide" in
        android-studio) echo ".agents" ;;
        antigravity) echo ".agents" ;;
        claude)      echo ".claude" ;;
        codex)       echo ".agents" ;;
        copilot)     echo ".github" ;;
        cursor)      echo ".cursor" ;;
        windsurf)    echo "" ;;
        jetbrains)   echo ".junie" ;;
        jetbrains-ai) echo ".agents" ;;
        openclaw)    echo "" ;;
        trae)        echo ".trae" ;;
        trae-cn)     echo ".trae" ;;
        vscode)      echo ".vscode" ;;
        visual-studio) echo ".github" ;;
        firebase-studio) echo ".idx" ;;
        zed)         echo "" ;;
        neovim)      echo "" ;;
        emacs)       echo "" ;;
        continue)    echo ".continue" ;;
        aider)       echo ".aider.conf.yml" ;;
        roo-code)    echo ".roo" ;;
        cline)       echo "" ;;
        amazon-q)    echo ".amazonq" ;;
        cody)        echo "" ;;
        codeium)     echo "" ;;
        tabnine)     echo "" ;;
        replit)      echo ".replit" ;;
        pearai)      echo "" ;;
        supermaven)  echo "" ;;
        pieces)      echo "" ;;
        gemini-cli)  echo ".gemini" ;;
        blackbox)    echo ".blackbox" ;;
        goose-cli)   echo ".goose" ;;
        opencode)    echo ".opencode" ;;
        kilocode)    echo ".kilo" ;;
        kimiai)      echo ".kimi-code" ;;
        workbuddy)   echo ".workbuddy" ;;
        codely)      echo ".codely-cli" ;;
        claude-desktop)    echo "" ;;  # desktop app: no project-level config
        kiro)              echo ".kiro" ;;
        augment-code)      echo ".augment" ;;
        void-editor)       echo "" ;;
        baidu-comate)      echo ".comate" ;;
        tencent-codebuddy) echo ".codebuddy" ;;
        zcode)             echo ".zcode" ;;
        *)           echo "" ;;
    esac
}

get_project_skills_path() {
    registry_path "$1" project-skills
}

get_amazon_q_project_mcp_path() {
    local project_root="${WORKSPACE_ROOT:-$(pwd)}"
    local default_path="${project_root}/.amazonq/default.json"
    local legacy_path="${project_root}/.amazonq/mcp.json"

    if [[ -f "$default_path" ]]; then
        echo ".amazonq/default.json"
    elif [[ -f "$legacy_path" ]]; then
        echo ".amazonq/mcp.json"
    else
        echo ".amazonq/default.json"
    fi
}

get_project_mcp_path() {
    case "$1" in
        amazon-q) get_amazon_q_project_mcp_path ;;
        *) registry_path "$1" project-mcp ;;
    esac
}

get_project_config_file() {
    registry_path "$1" project-config
}

get_rules_file() {
    registry_path "$1" rules
}

get_prompts_path() {
    local ide="$1"
    case "$ide" in
        vscode|visual-studio) echo ".github/prompts" ;;
        cursor)      echo ".cursor/commands" ;;
        windsurf)    echo ".windsurf/workflows" ;;
        openclaw)    echo "" ;;
        continue)    echo ".continue/prompts" ;;
        cline)       echo "" ;;
        blackbox)    echo "" ;;
        claude)      echo ".claude/commands" ;;
        gemini-cli)  echo ".gemini/commands" ;;
        goose-cli)   echo "" ;;
        opencode)    echo ".opencode/commands" ;;
        roo-code)    echo ".roo/commands" ;;
        trae|trae-cn) echo ".trae/commands" ;;
        pieces)      echo "" ;;
        *)           echo "" ;;
    esac
}

get_mcp_path() {
    case "$1" in
        cline)
            if [[ -n "${CLINE_DATA_DIR:-}" ]]; then
                echo "${CLINE_DATA_DIR%/}/settings/cline_mcp_settings.json"
            elif [[ -n "${CLINE_MCP_PATH:-}" ]]; then
                echo "${CLINE_MCP_PATH}"
            else
                echo "${HOME}/.cline/data/settings/cline_mcp_settings.json"
            fi ;;
        amazon-q)
            local q_default="${HOME}/.aws/amazonq/default.json"
            local q_legacy="${HOME}/.aws/amazonq/mcp.json"
            if [[ -f "$q_default" ]]; then
                echo "$q_default"
            elif [[ -f "$q_legacy" ]]; then
                echo "$q_legacy"
            else
                echo "$q_default"
            fi
            ;;
        claude-desktop)
            case "$(uname -s)" in
                Darwin)
                    echo "${HOME}/Library/Application Support/Claude/claude_desktop_config.json"
                    ;;
                MINGW*|MSYS*|CYGWIN*)
                    echo "${APPDATA:-${HOME}/AppData/Roaming}/Claude/claude_desktop_config.json"
                    ;;
                *)
                    echo ""
                    ;;
            esac
            ;;
        *) registry_path "$1" mcp ;;
    esac
}

get_config_file() {
    registry_path "$1" config
}

get_mcp_root_key() {
    local ide="$1"
    local scope="${2:-global}"
    if [[ "$ide" == "void-editor" && "$scope" == "project" ]]; then
        echo "servers"
        return 0
    fi
    case "$ide" in
        claude|claude-desktop|cursor|windsurf|gemini-cli|trae|trae-cn|continue|cline|roo-code|antigravity|amazon-q|kimiai|codely|workbuddy|copilot|kiro|augment-code|void-editor|baidu-comate|tencent-codebuddy|cody|tabnine|jetbrains)
            echo "mcpServers" ;;
        codex)       echo "mcp_servers" ;;
        goose-cli)   echo "extensions" ;;
        zed)         echo "context_servers" ;;
        openclaw)    echo "mcp.servers" ;;
        opencode)
            if [[ "$OPENCODE_VERSION" == "v2" ]]; then
                echo "mcp.servers"
            else
                echo "mcp"
            fi
            ;;
        kilocode)    echo "mcp" ;;
        vscode|visual-studio) echo "servers" ;;
        zcode)       echo "mcp.servers" ;;
        aider)       echo "" ;;
        blackbox)    echo "" ;;
        pieces)      echo "" ;;
        supermaven)  echo "" ;;
        *)           echo "" ;;
    esac
}

usage() {
    cat <<'EOF'
Scoped IDE-context migration.

Usage: smart-ide-migration.sh legacy --source <ide> --target <ide> [options]

  --workspace <dir>       Workspace for project-backed objects
  --objects <csv>         skills,rules,prompts,mcp,project-mcp,config,project,
                          agents,hooks,memory (global default: skills)
  --scope global|project|both   Skills/MCP scope (default: global)
  --strategy skip|backup|overwrite   Existing-object handling (default: backup)
  --source-mcp-file <file>      Reviewed JSON/JSONC MCP input
  --opencode-version v1|v2      OpenCode target MCP schema
  --report <file>               Save report
  --json                        Emit JSON evidence
  --print-path <ide> <object>   Read-only path lookup
  --dry-run                     Parse and preview without writes
  --yes, -y                     Apply writes
  -h, --help                    Show help

Output: human-readable stdout by default; with --json, stdout is one JSON
        document and diagnostics stay on stderr.
Exit:   0 success/preview, 1 invalid input or failed migration,
        2 write refused because --yes was omitted.

EOF
    printf '\nIDs: %s\n' "$SUPPORTED_IDES"
    cat <<'EOF'
Note: copilot is GitHub Copilot CLI; vscode and visual-studio are IDE targets.

Examples:
  smart-ide-migration.sh legacy --source cursor --target claude --objects skills,rules --dry-run
  smart-ide-migration.sh plan --source cursor/ide --target claude/cli --objects skills,instructions --output plan.json --json
  smart-ide-migration.sh apply plan.json --manifest manifest.json --yes --json
EOF
}

print_header() {
    echo ""
    echo "========================================"
    echo "       IDE Migration Tool"
    echo "========================================"
    echo ""
}

print_progress() {
    local step="$1"
    local message="$2"
    echo "[${step}] ${message}"
}

remove_verified_tree() {
    local target="$1"

    if [[ -L "$target" ]]; then
        rm -f -- "$target"
    elif [[ -d "$target" ]]; then
        find "$target" -xdev -depth -delete
    elif [[ -e "$target" ]]; then
        rm -f -- "$target"
    else
        return 1
    fi
}

safe_remove_skill_dir() {
    local parent="$1"
    local name="$2"

    if [[ -z "$parent" || -z "$name" ]]; then
        echo "  [GUARD] refused to delete: target directory or skill name is empty (parent='$parent', name='$name')" >&2
        return 1
    fi
    case "$name" in
        */*|.|..|.*/*|-*)
            echo "  [GUARD] refused to delete: illegal skill name '$name' (path separators/traversal/leading dash forbidden)" >&2
            return 1
            ;;
    esac

    local target="$parent/$name"
    if [[ -L "$target" ]]; then
        remove_verified_tree "$target"
        return $?
    fi
    if [[ ! -d "$target" ]]; then
        echo "  [GUARD] skipped deletion: target is not a directory or does not exist '$target'" >&2
        return 1
    fi

    remove_verified_tree "$target"
}

safe_remove_path_within() {
    local allowed_root="$1"
    local target="$2"
    local allowed_real target_parent_real target_name

    if [[ -z "$allowed_root" || -z "$target" || ! -d "$allowed_root" ]]; then
        echo "  [GUARD] refused to delete: invalid containment root or target" >&2
        return 1
    fi

    allowed_real="$(cd "$allowed_root" 2>/dev/null && pwd -P)" || return 1
    target_parent_real="$(cd "$(dirname "$target")" 2>/dev/null && pwd -P)" || {
        echo "  [GUARD] refused to delete: target parent cannot be resolved '$target'" >&2
        return 1
    }
    target_name="$(basename "$target")"

    if [[ -z "$target_name" || "$target_name" == "." || "$target_name" == ".." ]]; then
        echo "  [GUARD] refused to delete: invalid target name '$target_name'" >&2
        return 1
    fi
    case "$target_parent_real" in
        "$allowed_real"|"$allowed_real"/*) ;;
        *)
            echo "  [GUARD] refused to delete path outside workspace: $target" >&2
            return 1
            ;;
    esac

    if [[ ! -L "$target" && ! -e "$target" ]]; then
        echo "  [GUARD] skipped deletion: target does not exist '$target'" >&2
        return 1
    fi
    remove_verified_tree "$target"
}

backup_existing_path() {
    local target="$1"
    local workspace_real target_parent_real target_name timestamp backup_path

    [[ -n "${WORKSPACE_ROOT:-}" && -d "$WORKSPACE_ROOT" ]] || {
        echo "  [GUARD] refused backup: workspace is unavailable" >&2
        return 1
    }
    [[ -e "$target" || -L "$target" ]] || return 0
    if [[ -L "$target" ]]; then
        echo "  [GUARD] refused backup through symbolic link: $target" >&2
        return 1
    fi

    workspace_real="$(cd "$WORKSPACE_ROOT" 2>/dev/null && pwd -P)" || return 1
    target_parent_real="$(cd "$(dirname "$target")" 2>/dev/null && pwd -P)" || {
        echo "  [GUARD] refused backup: target parent cannot be resolved '$target'" >&2
        return 1
    }
    case "$target_parent_real" in
        "$workspace_real"|"$workspace_real"/*) ;;
        *)
            echo "  [GUARD] refused backup outside workspace: $target" >&2
            return 1
            ;;
    esac

    target_name="$(basename "$target")"
    [[ -n "$target_name" && "$target_name" != "." && "$target_name" != ".." ]] || {
        echo "  [GUARD] refused backup: invalid target name '$target_name'" >&2
        return 1
    }

    timestamp="$(date +%Y%m%d%H%M%S).$$"
    backup_path="$target.bak.$timestamp"
    while [[ -e "$backup_path" || -L "$backup_path" ]]; do
        timestamp="${timestamp}.1"
        backup_path="$target.bak.$timestamp"
    done
    if ! mv "$target" "$backup_path"; then
        echo "  [FAIL] could not back up existing target: $target" >&2
        return 1
    fi
    printf '%s\n' "$backup_path"
}

validate_ide() {
    local ide="$1"
    local supported

    for supported in $SUPPORTED_IDES; do
        [[ "$ide" == "$supported" ]] && return 0
    done

    return 1
}

list_available_objects() {
    local source_ide="$1"
    local objects=""


    local global_path
    global_path=$(get_global_path "$source_ide")
    if [[ -d "$global_path" ]]; then
        objects+="skills,"
    fi

    local rules_file
    rules_file=$(get_rules_file "$source_ide")
    if [[ -n "$rules_file" ]] && [[ -e "$WORKSPACE_ROOT/$rules_file" ]]; then
        objects+="rules,"
    fi

    local prompts_path
    prompts_path=$(get_prompts_path "$source_ide")
    if [[ -n "$prompts_path" ]] && [[ -d "$WORKSPACE_ROOT/$prompts_path" ]]; then
        objects+="prompts,"
    fi

    local mcp_path
    mcp_path=$(get_mcp_path "$source_ide")
    if [[ -n "$mcp_path" && "$mcp_path" != /* && "$mcp_path" != [A-Za-z]:* && "$mcp_path" != "\\"* ]]; then
        mcp_path="$WORKSPACE_ROOT/$mcp_path"
    fi
    if [[ -n "$mcp_path" ]] && [[ -e "$mcp_path" ]]; then
        objects+="mcp,"
    fi

    local config_file
    config_file=$(get_config_file "$source_ide")
    if [[ -n "$config_file" ]] && [[ -f "$config_file" ]]; then
        objects+="config,"
    fi

    local project_path
    project_path=$(get_project_path "$source_ide")
    if [[ -n "$project_path" ]] && [[ -e "$WORKSPACE_ROOT/$project_path" ]]; then
        objects+="project,"
    fi

    objects="${objects%,}"
    echo "$objects"
}

init_migration_files() {
    MIGRATION_STATUS_FILE=$(mktemp)
    MIGRATION_MESSAGES_FILE=$(mktemp)
    MIGRATION_MANUAL_FILE=$(mktemp)
    MIGRATION_EVIDENCE_FILE=$(mktemp)
}

cleanup_migration_files() {
    [[ -f "$MIGRATION_STATUS_FILE" ]] && rm -f "$MIGRATION_STATUS_FILE"
    [[ -f "$MIGRATION_MESSAGES_FILE" ]] && rm -f "$MIGRATION_MESSAGES_FILE"
    [[ -f "$MIGRATION_MANUAL_FILE" ]] && rm -f "$MIGRATION_MANUAL_FILE"
    [[ -f "$MIGRATION_EVIDENCE_FILE" ]] && rm -f "$MIGRATION_EVIDENCE_FILE"
    [[ -n "${REDACTOR_PY:-}" && -f "${REDACTOR_PY:-}" ]] && rm -f "$REDACTOR_PY"
    return 0
}

set_status() {
    local obj="$1"
    local status="$2"
    echo "$obj:$status" >> "$MIGRATION_STATUS_FILE"
}

set_message() {
    local obj="$1"
    local message="$2"
    echo "$obj:$message" >> "$MIGRATION_MESSAGES_FILE"
}

set_manual_step() {
    local obj="$1"
    local step="$2"
    echo "$obj:$step" >> "$MIGRATION_MANUAL_FILE"
}

get_status() {
    local obj="$1"
    if [[ -f "$MIGRATION_STATUS_FILE" ]]; then
        awk -v o="$obj" -F: '$1 == o { sub(/^[^:]*:/, ""); print }' "$MIGRATION_STATUS_FILE" | tail -1
    fi
}

get_message() {
    local obj="$1"
    if [[ -f "$MIGRATION_MESSAGES_FILE" ]]; then
        awk -v o="$obj" -F: '$1 == o { sub(/^[^:]*:/, ""); print }' "$MIGRATION_MESSAGES_FILE" | tail -1
    fi
}

get_manual_steps() {
    local obj="$1"
    if [[ -f "$MIGRATION_MANUAL_FILE" ]]; then
        awk -v o="$obj" -F: '$1 == o { sub(/^[^:]*:/, ""); print }' "$MIGRATION_MANUAL_FILE"
    fi
}

sha256_file() {
    local file="$1"
    [[ -f "$file" ]] || return 1
    local digest=""
    if command -v shasum >/dev/null 2>&1; then
        digest="$(shasum -a 256 "$file" | awk '{print $1}')"
    elif command -v sha256sum >/dev/null 2>&1; then
        digest="$(sha256sum "$file" | awk '{print $1}')"
    elif command -v python3 >/dev/null 2>&1; then
        digest="$(python3 -c 'import hashlib,sys; print(hashlib.sha256(open(sys.argv[1], "rb").read()).hexdigest())' "$file")"
    else
        return 1
    fi
    # Some hosts prefix tool output (e.g. an MSYS marker before the hex
    # digest); keep only the 64-digit hash itself.
    printf '%s\n' "$(printf '%s' "$digest" | grep -Eo '[0-9a-fA-F]{64}' | head -n1)"
}

validate_evidence_target() {
    local file="$1"
    if [[ ! -f "$file" ]]; then
        echo "absent"
        return 0
    fi
    case "$file" in
        *.json|*.jsonc)
            if command -v python3 >/dev/null 2>&1 && \
               python3 -c 'import json,sys; json.load(open(sys.argv[1]))' "$file" >/dev/null 2>&1; then
                echo "valid-json"
            else
                echo "invalid-json"
            fi
            ;;
        *)
            echo "unverified-format"
            ;;
    esac
}

json_string_or_null() {
    local value="$1"
    if [[ -n "$value" ]]; then
        printf '"%s"' "$(json_escape "$value")"
    else
        printf 'null'
    fi
}

record_mcp_evidence() {
    local scope="$1"
    local source_path="$2"
    local target_path="$3"
    local source_sha256_before="$4"
    local backup_path="${5:-}"
    local source_sha256_after=""
    local target_sha256=""
    local source_unchanged="null"
    local target_exists="false"
    local target_validation
    local status

    source_sha256_after="$(sha256_file "$source_path" 2>/dev/null || true)"
    if [[ -n "$source_sha256_before" && -n "$source_sha256_after" ]]; then
        if [[ "$source_sha256_before" == "$source_sha256_after" ]]; then
            source_unchanged="true"
        else
            source_unchanged="false"
        fi
    fi
    if [[ -f "$target_path" ]]; then
        target_exists="true"
        target_sha256="$(sha256_file "$target_path" 2>/dev/null || true)"
    fi
    target_validation="$(validate_evidence_target "$target_path")"
    status="$(get_status mcp)"

    printf '{"scope":"%s","status":"%s","source_path":"%s","target_path":"%s","source_sha256_before":%s,"source_sha256_after":%s,"source_unchanged":%s,"target_exists":%s,"target_sha256":%s,"target_validation":"%s","backup_path":%s}\n' \
        "$(json_escape "$scope")" \
        "$(json_escape "$status")" \
        "$(json_escape "$source_path")" \
        "$(json_escape "$target_path")" \
        "$(json_string_or_null "$source_sha256_before")" \
        "$(json_string_or_null "$source_sha256_after")" \
        "$source_unchanged" \
        "$target_exists" \
        "$(json_string_or_null "$target_sha256")" \
        "$(json_escape "$target_validation")" \
        "$(json_string_or_null "$backup_path")" \
        >> "$MIGRATION_EVIDENCE_FILE"
}

apply_skill_strategy() {
    local target_global="$1"
    local skill_name="$2"
    [[ -d "$target_global/$skill_name" ]] || return 0
    case "$STRATEGY" in
        skip)
            echo "  [SKIP] skill already exists: $skill_name"
            return 1
            ;;
        backup)
            local timestamp
            timestamp="$(date +%Y%m%d%H%M%S).$$"
            mv "$target_global/$skill_name" "$target_global/$skill_name.bak.$timestamp"
            echo "  [BACKUP] backup already exists: $skill_name"
            ;;
        overwrite)
            if ! safe_remove_skill_dir "$target_global" "$skill_name"; then
                echo "  [FAIL] safe delete before overwrite failed, skipped: $skill_name"
                return 2
            fi
            ;;
    esac
    return 0
}

preflight_skill_source() {
    local skill_dir="$1"
    local findings rc=0
    local scanner="${SCRIPT_DIR}/scan-skill-secrets.py"

    if [[ ! -f "$scanner" ]] || ! command -v python3 >/dev/null 2>&1; then
        echo "  [FAIL] source credential preflight unavailable: $(basename "$skill_dir")" >&2
        return 1
    fi
    findings=$(python3 "$scanner" "$skill_dir" 2>&1) || rc=$?
    if [[ $rc -ne 0 ]]; then
        echo "  [FAIL] source credential preflight failed: $(basename "$skill_dir")" >&2
        [[ -n "$findings" ]] && printf '%s\n' "$findings" | sed 's/^/    /' >&2
        return 1
    fi
    return 0
}

migrate_global_skills() {
    local source_ide="$1"
    local target_ide="$2"
    local strategy_rc

    if [[ "$source_ide" == "pieces" || "$target_ide" == "pieces" ]]; then
        set_status "skills" "manual"
        set_message "skills" "Pieces uses PiecesOS/host integrations, not a file-backed Agent Skills directory"
        set_manual_step "skills" "Pieces: do not use ~/.pieces or .pieces as a Skills path; install/configure Pieces MCP in the consuming IDE through PiecesOS/Desktop MCP settings or pieces mcp setup"
        MIGRATION_SKIPPED=$((MIGRATION_SKIPPED + 1))
        return 0
    fi

    if [[ "$source_ide" == "blackbox" || "$target_ide" == "blackbox" ]]; then
        MIGRATION_TOTAL=$((MIGRATION_TOTAL + 1))
        set_status "skills" "manual"
        set_message "skills" "Blackbox only documents project .blackbox/skills; this migrator has no automatic project Skills migration"
        set_manual_step "skills" "Blackbox AI CLI: manually review and migrate project .blackbox/skills/<name>/SKILL.md; do not infer ~/.blackbox or treat .blackbox as a global skills directory"
        MIGRATION_SKIPPED=$((MIGRATION_SKIPPED + 1))
        return 0
    fi

    if [[ "$source_ide" == "replit" || "$target_ide" == "replit" ]]; then
        set_status "skills" "manual"
        set_message "skills" "Replit project Skills use .agents/skills; .local/secondary_skills is a separate compatibility directory and no user-global filesystem path is documented"
        set_manual_step "skills" "Replit: review .agents/skills/<name>/SKILL.md and .local/secondary_skills/ separately; validate name/description frontmatter and preserve scripts/references/assets; do not infer a global Skills path"
        MIGRATION_SKIPPED=$((MIGRATION_SKIPPED + 1))
        return 0
    fi

    if [[ "$source_ide" == "supermaven" || "$target_ide" == "supermaven" ]]; then
        set_status "skills" "manual"
        set_message "skills" "Supermaven has no documented portable Agent Skills directory; automatic migration is unsupported"
        set_manual_step "skills" "Supermaven: review the host editor extension or Neovim configuration manually; do not treat ~/.supermaven runtime storage or .supermaven as a Skills directory"
        MIGRATION_SKIPPED=$((MIGRATION_SKIPPED + 1))
        return 0
    fi

    if [[ "$source_ide" == "goose-cli" || "$target_ide" == "goose-cli" ]]; then
        set_manual_step "skills" "Goose: this global operation uses ~/.agents/skills; review project .agents/skills and legacy .goose/skills separately, and do not treat ~/.config/goose as a Skills directory"
    fi

    if [[ "$source_ide" == "opencode" || "$target_ide" == "opencode" ]]; then
        set_manual_step "skills" "OpenCode: this operation handles only global ~/.config/opencode/skills; review project .opencode/skills plus .claude/skills/.agents/skills compatibility roots manually"
    fi

    if [[ "$source_ide" == "workbuddy" || "$target_ide" == "workbuddy" ]]; then
        set_status "skills" "manual"
        set_message "skills" "WorkBuddy has an official local-package/UI import, but no stable installed Skills directory or complete package schema"
        set_manual_step "skills" "WorkBuddy: open the left 技能 panel → 添加技能 → 上传技能, then choose the local package and verify it in the Skills list. WorkBuddy also documents OpenClaw community-skill import through this Skills entry point. Its custom package examples use skill.yml + implementation files + README, but the package extension/root and full schema are not published; do not treat SKILL.md as a guaranteed WorkBuddy package and do not infer ~/.workbuddy/skills or .workbuddy/skills"
        MIGRATION_SKIPPED=$((MIGRATION_SKIPPED + 1))
        return 0
    fi

    if [[ "$source_ide" == "void-editor" || "$target_ide" == "void-editor" ]]; then
        set_status "skills" "manual"
        set_message "skills" "Void official source and docs have no Agent Skills directory"
        set_manual_step "skills" 'Void: `.voidrules` is a rules file, not Agent Skills; do not treat .void-editor or VS Code storage directory as a Skills directory'
        MIGRATION_SKIPPED=$((MIGRATION_SKIPPED + 1))
        return 0
    fi

    if [[ "$source_ide" == "cody" || "$target_ide" == "cody" ]]; then
        set_status "skills" "manual"
        set_message "skills" "Sourcegraph Cody has no documented Agent Skills directory; automatic migration is unsupported"
        set_manual_step "skills" "Cody: do not use .cody or another inferred skills path; review the current Enterprise extension surface manually and use Amp or another documented Agent Skills target"
        MIGRATION_SKIPPED=$((MIGRATION_SKIPPED + 1))
        return 0
    fi
    local source_global
    source_global=$(get_global_path "$source_ide")
    local target_global
    target_global=$(get_global_path "$target_ide")

    if [[ -z "$target_global" ]]; then
        set_status "skills" "skipped"
        set_message "skills" "target IDE has no global skills directory, skip"
        MIGRATION_SKIPPED=$((MIGRATION_SKIPPED + 1))
        return 0
    fi

    MIGRATION_TOTAL=$((MIGRATION_TOTAL + 1))

    if [[ ! -d "$source_global" ]]; then
        set_status "skills" "skipped"
        set_message "skills" "source directory does not exist: $source_global"
        MIGRATION_SKIPPED=$((MIGRATION_SKIPPED + 1))
        return 0
    fi

    print_progress "MIGRATE" "Migrating skills (Skills)..."

    local migrated_count=0
    local failed_count=0

    if [[ "$target_ide" == "copilot" ]]; then
        if [[ $DRY_RUN -eq 0 ]]; then
            mkdir -p "$target_global"
        fi

        local skill_dir skill_name
        for skill_dir in "$source_global"/*/; do
            [[ -d "$skill_dir" ]] || continue
            [[ -f "$skill_dir/SKILL.md" ]] || continue
            skill_name=$(basename "$skill_dir")

            if ! preflight_skill_source "$skill_dir"; then
                failed_count=$((failed_count + 1))
                continue
            fi

            if [[ -f "$skill_dir/SKILL.md" ]]; then
                if [[ $DRY_RUN -eq 1 ]]; then
                    echo "  DRY-RUN: cp -r $skill_dir $target_global/$skill_name"
                    ((migrated_count++)) || true
                else
                    strategy_rc=0
                    apply_skill_strategy "$target_global" "$skill_name" || strategy_rc=$?
                    if [[ $strategy_rc -eq 1 ]]; then
                        continue
                    elif [[ $strategy_rc -eq 2 ]]; then
                        failed_count=$((failed_count + 1))
                        continue
                    fi

                    if cp -r "$skill_dir" "$target_global/$skill_name"; then
                        if redact_skill_copy "$target_global/$skill_name" >/dev/null; then
                            echo "  [OK] migrated skill: $skill_name"
                            ((migrated_count++)) || true
                        else
                            safe_remove_skill_dir "$target_global" "$skill_name" || true
                            echo "  [FAIL] skill copy redaction failed, deleted copy to prevent key leak: $skill_name"
                            ((failed_count++)) || true
                        fi
                    else
                        echo "  [FAIL] migration failed: $skill_name"
                        ((failed_count++)) || true
                    fi
                fi
            fi
        done

        set_manual_step "skills" "GitHub Copilot CLI: this operation only migrates global ~/.copilot/skills; for project skills, review .github/skills, .claude/skills or .agents/skills separately"

    else
        if [[ $DRY_RUN -eq 0 ]]; then
            mkdir -p "$target_global"
        fi

        local skill_dir skill_name
        for skill_dir in "$source_global"/*/; do
            [[ -d "$skill_dir" ]] || continue
            [[ -f "$skill_dir/SKILL.md" ]] || continue
            skill_name=$(basename "$skill_dir")

            if ! preflight_skill_source "$skill_dir"; then
                failed_count=$((failed_count + 1))
                continue
            fi

            if [[ $DRY_RUN -eq 1 ]]; then
                echo "  DRY-RUN: cp -r $skill_dir $target_global/$skill_name"
                ((migrated_count++)) || true
            else
                strategy_rc=0
                apply_skill_strategy "$target_global" "$skill_name" || strategy_rc=$?
                if [[ $strategy_rc -eq 1 ]]; then
                    continue
                elif [[ $strategy_rc -eq 2 ]]; then
                    failed_count=$((failed_count + 1))
                    continue
                fi

                if cp -r "$skill_dir" "$target_global/$skill_name"; then
                    if redact_skill_copy "$target_global/$skill_name" >/dev/null; then
                        echo "  [OK] migrated skill: $skill_name"
                        ((migrated_count++)) || true
                    else
                        safe_remove_skill_dir "$target_global" "$skill_name" || true
                        echo "  [FAIL] skill copy redaction failed, deleted copy to prevent key leak: $skill_name"
                        ((failed_count++)) || true
                    fi
                else
                    echo "  [FAIL] migration failed: $skill_name"
                    ((failed_count++)) || true
                fi
            fi
        done
    fi

    if [[ "$source_ide" == "vscode" || "$target_ide" == "vscode" || "$source_ide" == "visual-studio" || "$target_ide" == "visual-studio" ]]; then
        set_manual_step "skills" "GitHub Copilot IDEs: the mapper uses ~/.copilot/skills and .github/skills; review compatible .claude/skills and .agents/skills locations manually"
    fi

    if [[ "$source_ide" == "windsurf" || "$target_ide" == "windsurf" ]]; then
        set_manual_step "skills" "Windsurf: this operation handles only global ~/.codeium/windsurf/skills; review project .windsurf/skills, ~/.agents/skills, .agents/skills, and optional .claude/skills compatibility locations manually"
    fi

    if [[ $failed_count -gt 0 ]]; then
        set_status "skills" "partial"
        set_message "skills" "succeeded $migrated_count, failed $failed_count"
        MIGRATION_FAILED=$((MIGRATION_FAILED + 1))
    else
        set_status "skills" "success"
        set_message "skills" "successfully migrated $migrated_count skills"
        MIGRATION_SUCCESS=$((MIGRATION_SUCCESS + 1))
    fi
}

project_skills_manual_only() {
    local ide="$1"
    case "$ide" in
        amazon-q|blackbox|claude-desktop|codeium|cody|continue|emacs|firebase-studio|neovim|pearai|pieces|replit|supermaven|tabnine|void-editor|workbuddy|zcode)
            return 0
            ;;
        *)
            return 1
            ;;
    esac
}

migrate_project_skills() {
    local source_ide="$1"
    local target_ide="$2"
    local source_skills target_skills source_path target_path

    MIGRATION_TOTAL=$((MIGRATION_TOTAL + 1))

    if project_skills_manual_only "$source_ide" || project_skills_manual_only "$target_ide"; then
        set_status "skills" "manual"
        set_message "skills" "project Skills compatibility directory/priority or official path still needs manual review"
        set_manual_step "skills" "project Skills: only review native project path; do not blindly merge between compatibility directories, unclear-version or UI-only IDEs; preserve SKILL.md, scripts, references, assets and symlink boundaries"
        MIGRATION_SKIPPED=$((MIGRATION_SKIPPED + 1))
        return 0
    fi

    if [[ "$source_ide" == "zcode" || "$target_ide" == "zcode" ]]; then
        set_status "skills" "manual"
        set_message "skills" "ZCode project Skills use an official UI import target without a published stable project directory"
        set_manual_step "skills" "ZCode: open Settings → Skills → Import, select the external skill, choose Copy or Symlink, then choose Project for the current workspace (or Global for all workspaces). Do not infer .zcode/skills as a project path; the documented filesystem path is user-level ~/.zcode/skills"
        MIGRATION_SKIPPED=$((MIGRATION_SKIPPED + 1))
        return 0
    fi

    if [[ "$source_ide" == "workbuddy" || "$target_ide" == "workbuddy" ]]; then
        set_status "skills" "manual"
        set_message "skills" "WorkBuddy project Skills are imported through the Skills UI; no stable project directory or complete package schema is published"
        set_manual_step "skills" "WorkBuddy: left 技能 → 添加技能 → 上传技能, select the reviewed local package, then verify/enable it in the Skills list; OpenClaw community skills use the same import surface. Do not infer a project Skills directory"
        MIGRATION_SKIPPED=$((MIGRATION_SKIPPED + 1))
        return 0
    fi

    source_skills=$(get_project_skills_path "$source_ide")
    target_skills=$(get_project_skills_path "$target_ide")
    if [[ -z "$source_skills" || -z "$target_skills" ]]; then
        set_status "skills" "manual"
        set_message "skills" "source/target IDE has no confirmable project Skills directory"
        set_manual_step "skills" "project Skills: source='$source_skills' target='$target_skills'; please select native directory manually according to IDE Registry, do not infer paths"
        MIGRATION_SKIPPED=$((MIGRATION_SKIPPED + 1))
        return 0
    fi

    source_path="$WORKSPACE_ROOT/$source_skills"
    target_path="$WORKSPACE_ROOT/$target_skills"
    if [[ ! -d "$source_path" ]]; then
        set_status "skills" "skipped"
        set_message "skills" "project Skills source directory does not exist: $source_skills"
        MIGRATION_SKIPPED=$((MIGRATION_SKIPPED + 1))
        return 0
    fi

    if [[ "$(cd "$source_path" 2>/dev/null && pwd -P)" == "$(cd "$target_path" 2>/dev/null && pwd -P)" ]]; then
        set_status "skills" "manual"
        set_message "skills" "project Skills source and target resolve to the same path; refusing to self-overwrite"
        set_manual_step "skills" "project Skills: source and target IDEs share '$source_skills' on this workspace; pick a different target or relocate the source manually before retrying"
        MIGRATION_SKIPPED=$((MIGRATION_SKIPPED + 1))
        return 0
    fi

    print_progress "MIGRATE" "Migrating project Skills..."
    local migrated_count=0 failed_count=0 skill_dir skill_name timestamp
    if [[ $DRY_RUN -eq 0 ]]; then
        mkdir -p "$target_path"
    fi

    for skill_dir in "$source_path"/*/; do
        [[ -d "$skill_dir" ]] || continue
        [[ -f "$skill_dir/SKILL.md" ]] || continue
        skill_name=$(basename "$skill_dir")

        if ! preflight_skill_source "$skill_dir"; then
            failed_count=$((failed_count + 1))
            continue
        fi

        if [[ $DRY_RUN -eq 1 ]]; then
            echo "  DRY-RUN: cp -r $skill_dir $target_path/$skill_name"
            migrated_count=$((migrated_count + 1))
            continue
        fi

        if [[ -d "$target_path/$skill_name" ]]; then
            case "$STRATEGY" in
                skip)
                    echo "  [SKIP] project skill already exists: $skill_name"
                    continue
                    ;;
                backup)
                    timestamp=$(date +%Y%m%d%H%M%S).$$
                    mv "$target_path/$skill_name" "$target_path/$skill_name.bak.$timestamp"
                    echo "  [BACKUP] backed up existing project skill: $skill_name"
                    ;;
                overwrite)
                    if ! safe_remove_skill_dir "$target_path" "$skill_name"; then
                        echo "  [FAIL] safe delete of project skill before overwrite failed: $skill_name"
                        failed_count=$((failed_count + 1))
                        continue
                    fi
                    ;;
            esac
        fi

        if cp -R "$skill_dir" "$target_path/$skill_name" 2>/dev/null; then
            if redact_skill_copy "$target_path/$skill_name" >/dev/null; then
                echo "  [OK] migrated project skill: $skill_name"
                migrated_count=$((migrated_count + 1))
            else
                safe_remove_skill_dir "$target_path" "$skill_name" || true
                echo "  [FAIL] project skill redaction failed, deleted copy to prevent key leak: $skill_name"
                failed_count=$((failed_count + 1))
            fi
        else
            echo "  [FAIL] project skill migration failed: $skill_name"
            failed_count=$((failed_count + 1))
        fi
    done

        set_manual_step "skills" "project Skills: this run only writes target native directory $target_skills; compatibility directories, same-name priority, trust settings and external symlinks still need manual review"
    if [[ $failed_count -gt 0 ]]; then
        set_status "skills" "partial"
        set_message "skills" "project Skills succeeded $migrated_count, failed $failed_count"
        MIGRATION_FAILED=$((MIGRATION_FAILED + 1))
    else
        set_status "skills" "success"
        set_message "skills" "project Skills successfully migrated $migrated_count"
        MIGRATION_SUCCESS=$((MIGRATION_SUCCESS + 1))
    fi
}

migrate_skills() {
    local source_ide="$1"
    local target_ide="$2"
    local scope="${3:-global}"

    case "$scope" in
        global)
            migrate_global_skills "$source_ide" "$target_ide"
            ;;
        project)
            migrate_project_skills "$source_ide" "$target_ide"
            ;;
        both)
            migrate_global_skills "$source_ide" "$target_ide"
            migrate_project_skills "$source_ide" "$target_ide"
            ;;
        *)
            set_status "skills" "failed"
        set_message "skills" "unsupported Skills scope: $scope"
            MIGRATION_FAILED=$((MIGRATION_FAILED + 1))
            ;;
    esac
}

migrate_rules() {
    local source_ide="$1"
    local target_ide="$2"

    MIGRATION_TOTAL=$((MIGRATION_TOTAL + 1))

    if [[ "$source_ide" == "pieces" || "$target_ide" == "pieces" ]]; then
        set_status "rules" "manual"
        set_message "rules" "Pieces has no documented portable rules file; context is managed by PiecesOS and the host integration"
        set_manual_step "rules" "Pieces: do not copy .pieces or infer a rules file; configure host-IDE instructions separately and use PiecesOS MCP for workflow memory"
        MIGRATION_SKIPPED=$((MIGRATION_SKIPPED + 1))
        return 0
    fi

    if [[ "$source_ide" == "blackbox" || "$target_ide" == "blackbox" ]]; then
        set_status "rules" "manual"
        set_message "rules" "Blackbox official docs do not define portable rules file or directory; auto migration unsupported"
        set_manual_step "rules" "Blackbox: do not infer .blackbox/rules, .blackbox/instructions or root rules file; only review .blackbox/skills/ per official project Skills docs"
        MIGRATION_SKIPPED=$((MIGRATION_SKIPPED + 1))
        return 0
    fi

    if [[ "$source_ide" == "supermaven" || "$target_ide" == "supermaven" ]]; then
        set_status "rules" "manual"
        set_message "rules" "Supermaven has no documented portable instruction/rules file; .supermavenignore only excludes indexed files"
        set_manual_step "rules" "Supermaven: review host-editor/Neovim settings manually; preserve .supermavenignore only as an indexing exclusion file, never as instruction rules"
        MIGRATION_SKIPPED=$((MIGRATION_SKIPPED + 1))
        return 0
    fi

    if [[ "$source_ide" == "goose-cli" || "$target_ide" == "goose-cli" ]]; then
        set_manual_step "rules" "Goose: local .goosehints is copied as a project hint only; review global ~/.config/goose/.goosehints, AGENTS.md, nested hints, and CONTEXT_FILE_NAMES manually"
    fi

    if [[ "$source_ide" == "opencode" || "$target_ide" == "opencode" ]]; then
        set_manual_step "rules" "OpenCode: this operation handles project AGENTS.md; review global ~/.config/opencode/AGENTS.md, Claude-compatible CLAUDE.md fallbacks, and opencode.json instructions globs manually"
    fi

    if [[ "$source_ide" == "cody" || "$target_ide" == "cody" ]]; then
        set_status "rules" "manual"
        set_message "rules" "Sourcegraph Cody has no documented .codyrules or portable project-instructions file"
        set_manual_step "rules" "Cody: do not copy .codyrules; review project instructions manually in the target IDE's documented instruction surface"
        MIGRATION_SKIPPED=$((MIGRATION_SKIPPED + 1))
        return 0
    fi

    if [[ "$source_ide" == "windsurf" || "$target_ide" == "windsurf" ]]; then
        set_status "rules" "manual"
        set_message "rules" "Windsurf rules use scoped files; automatic migration is unsupported"
        set_manual_step "rules" "Review current .windsurf/rules/*.md or legacy .windsurfrules manually; preserve each file's trigger and scope. Devin is a separate product surface."
        MIGRATION_SKIPPED=$((MIGRATION_SKIPPED + 1))
        return 0
    fi

    if [[ "$source_ide" == "continue" || "$target_ide" == "continue" ]]; then
        set_status "rules" "manual"
        set_message "rules" "Continue rules use .continue/rules/* blocks; automatic migration is unsupported"
        set_manual_step "rules" "Review .continue/rules/*.md manually; preserve YAML frontmatter fields name, globs, regex, alwaysApply, and description"
        MIGRATION_SKIPPED=$((MIGRATION_SKIPPED + 1))
        return 0
    fi

    if [[ "$source_ide" == "tabnine" || "$target_ide" == "tabnine" ]]; then
        set_status "rules" "manual"
        set_message "rules" "Tabnine guidelines use scoped .tabnine/guidelines/*.md files; automatic migration is unsupported"
        set_manual_step "rules" "Review ~/.tabnine/guidelines/*.md or project .tabnine/guidelines/*.md manually; preserve each guideline file and scope"
        MIGRATION_SKIPPED=$((MIGRATION_SKIPPED + 1))
        return 0
    fi

    if [[ "$source_ide" == "antigravity" || "$target_ide" == "antigravity" ]]; then
        set_status "rules" "manual"
        set_message "rules" "Antigravity IDE rules use a directory; manual migration required"
        set_manual_step "rules" "Review and merge .agents/rules/ manually; do not convert it to .agents/AGENTS.md"
        MIGRATION_SKIPPED=$((MIGRATION_SKIPPED + 1))
        return 0
    fi

    if [[ "$source_ide" == "amazon-q" || "$target_ide" == "amazon-q" ]]; then
        set_status "rules" "manual"
        set_message "rules" "Amazon Q rules use .amazonq/rules/*.md; manual migration required"
        set_manual_step "rules" "Review .amazonq/rules/*.md manually; preserve the project scope and Markdown format"
        MIGRATION_SKIPPED=$((MIGRATION_SKIPPED + 1))
        return 0
    fi

    if [[ "$source_ide" == "kiro" || "$target_ide" == "kiro" ]]; then
        set_status "rules" "manual"
        set_message "rules" "Kiro steering is a directory with inclusion/frontmatter semantics; auto single-file migration unsupported"
        set_manual_step "rules" "Kiro: review ~/.kiro/steering/*.md and .kiro/steering/*.md; preserve inclusion (always/fileMatch/auto/manual) and file scope"
        MIGRATION_SKIPPED=$((MIGRATION_SKIPPED + 1))
        return 0
    fi

    if [[ "$source_ide" == "augment-code" || "$target_ide" == "augment-code" ]]; then
        set_status "rules" "manual"
        set_message "rules" "Augment rules use a directory and frontmatter; auto single-file migration unsupported"
        set_manual_step "rules" "Augment: review ~/.augment/rules/ and .augment/rules/*.md plus .augment-guidelines; preserve always_apply/agent_requested/manual semantics"
        MIGRATION_SKIPPED=$((MIGRATION_SKIPPED + 1))
        return 0
    fi

    if [[ "$source_ide" == "baidu-comate" || "$target_ide" == "baidu-comate" ]]; then
        set_status "rules" "manual"
        set_message "rules" "Comate rules use .mdr directory and activation mode; auto single-file migration unsupported"
        set_manual_step "rules" "Comate: review .comate/rules/*.mdr manually; preserve its Cursor-compatible frontmatter and activation mode"
        MIGRATION_SKIPPED=$((MIGRATION_SKIPPED + 1))
        return 0
    fi

    if [[ "$source_ide" == "trae-cn" || "$target_ide" == "trae-cn" ]]; then
        set_status "rules" "manual"
        set_message "rules" "Trae CN rules use .trae/rules directory; auto single-file migration unsupported"
        set_manual_step "rules" "Trae CN: review .trae/rules/ manually; preserve frontmatter alwaysApply, globs, description, and scene"
        MIGRATION_SKIPPED=$((MIGRATION_SKIPPED + 1))
        return 0
    fi

    if [[ "$source_ide" == "trae" || "$target_ide" == "trae" ]]; then
        set_status "rules" "manual"
        set_message "rules" "TRAE rules use the project .trae/rules directory; automatic directory migration is unsupported"
        set_manual_step "rules" "TRAE: review .trae/rules/ manually; preserve alwaysApply, globs, description, optional scene, and nested directory scope"
        MIGRATION_SKIPPED=$((MIGRATION_SKIPPED + 1))
        return 0
    fi

    if [[ "$source_ide" == "replit" || "$target_ide" == "replit" ]]; then
        set_status "rules" "manual"
        set_message "rules" "Replit replit.md is a project-root living document maintained by Agent; automatic overwrite is disabled"
        set_manual_step "rules" "Replit: manually merge source instructions into replit.md and preserve existing Agent-maintained context; review custom_instruction/instructions.md separately as static template instructions"
        MIGRATION_SKIPPED=$((MIGRATION_SKIPPED + 1))
        return 0
    fi

    local source_rules
    source_rules=$(get_rules_file "$source_ide")
    local target_rules
    target_rules=$(get_rules_file "$target_ide")

    if [[ "$source_ide" == "jetbrains" && ! -f "$WORKSPACE_ROOT/$source_rules" ]]; then
        if [[ -f "$WORKSPACE_ROOT/AGENTS.md" ]]; then
            source_rules="AGENTS.md"
        elif [[ -f "$WORKSPACE_ROOT/.junie/guidelines.md" ]]; then
            source_rules=".junie/guidelines.md"
        fi
    fi

    if [[ -z "$source_rules" ]]; then
        set_status "rules" "skipped"
        set_message "rules" "source IDE does not support rules files"
        MIGRATION_SKIPPED=$((MIGRATION_SKIPPED + 1))
        return 0
    fi

    if [[ -z "$target_rules" ]]; then
        set_status "rules" "skipped"
        set_message "rules" "target IDE does not support rules files"
        MIGRATION_SKIPPED=$((MIGRATION_SKIPPED + 1))
        return 0
    fi

    if [[ "$source_ide" == "vscode" || "$target_ide" == "vscode" || "$source_ide" == "visual-studio" || "$target_ide" == "visual-studio" ]]; then
        set_manual_step "rules" "GitHub Copilot IDEs: the single-file mapper handles .github/copilot-instructions.md only; review AGENTS.md, CLAUDE.md, and .github/instructions/**/*.instructions.md with their scope metadata manually"
    fi

    if [[ "$source_ide" == "cline" || "$target_ide" == "cline" ]]; then
        set_status "rules" "manual"
        set_message "rules" "Cline rules use directory-scoped files; manual migration required"
        set_manual_step "rules" "Review and merge current .cline/rules/*.md|*.txt; preserve conditional frontmatter and do not flatten scopes"
        MIGRATION_SKIPPED=$((MIGRATION_SKIPPED + 1))
        return 0
    fi

    if [[ "$source_ide" == "kiro" || "$target_ide" == "kiro" ]]; then
        set_status "rules" "manual"
        set_message "rules" "Kiro steering is a directory of scoped files; manual migration required"
        set_manual_step "rules" "Review .kiro/steering/*.md and ~/.kiro/steering/*.md manually; preserve inclusion frontmatter and do not flatten scopes into one rules file"
        MIGRATION_SKIPPED=$((MIGRATION_SKIPPED + 1))
        return 0
    fi

    if [[ "$target_ide" == "aider" ]]; then
        echo "  MANUAL: add read: CONVENTIONS.md to the target .aider.conf.yml (YAML); no config rewrite is performed"
        set_manual_step "rules" "Aider: review CONVENTIONS.md and add read: CONVENTIONS.md to the appropriate .aider.conf.yml manually; do not treat Aider config as a skills or MCP file"
    fi

    if [[ "$source_ide" == "cursor" || "$target_ide" == "cursor" ]]; then
        set_status "rules" "manual"
        set_message "rules" "Cursor rules use .cursor/rules/*.mdc; manual migration required"
        set_manual_step "rules" "Review .cursor/rules/*.mdc manually; do not flatten into .cursorrules or guess frontmatter conversion"
        MIGRATION_SKIPPED=$((MIGRATION_SKIPPED + 1))
        return 0
    fi

    if [[ "$source_ide" == "void-editor" || "$target_ide" == "void-editor" ]]; then
        set_manual_step "rules" "Void: .voidrules is a workspace-root plaintext instruction file; automatic copy is limited to the selected project root, while global AI Instructions and multi-root ordering require manual review"
    fi

    print_progress "MIGRATE" "Migrating rules files..."

    local source_path="$WORKSPACE_ROOT/$source_rules"
    local target_path="$WORKSPACE_ROOT/$target_rules"

    if [[ ! -f "$source_path" ]]; then
        set_status "rules" "skipped"
        set_message "rules" "source rules file does not exist: $source_rules"
        MIGRATION_SKIPPED=$((MIGRATION_SKIPPED + 1))
        return 0
    fi

    if [[ -L "$target_path" ]]; then
        set_status "rules" "failed"
        set_message "rules" "target rules file is a symbolic link; refusing indirect overwrite"
        MIGRATION_FAILED=$((MIGRATION_FAILED + 1))
        return 0
    fi
    if [[ -e "$target_path" && ! -f "$target_path" ]]; then
        set_status "rules" "failed"
        set_message "rules" "target rules path is not a regular file"
        MIGRATION_FAILED=$((MIGRATION_FAILED + 1))
        return 0
    fi

    if [[ $DRY_RUN -eq 1 ]]; then
        if [[ -e "$target_path" ]]; then
            case "$STRATEGY" in
                skip)
                    echo "  DRY-RUN: skip existing rules file $target_path"
                    set_status "rules" "skipped"
                    set_message "rules" "existing rules file would be preserved"
                    MIGRATION_SKIPPED=$((MIGRATION_SKIPPED + 1))
                    return 0
                    ;;
                backup)
                    echo "  DRY-RUN: backup $target_path before copying"
                    ;;
            esac
        fi
        echo "  DRY-RUN: cp $source_path $target_path"
        set_status "rules" "success"
        set_message "rules" "rules file ready to migrate"
    else
        local rules_backup=""
        if [[ -e "$target_path" ]]; then
            case "$STRATEGY" in
                skip)
                    echo "  [SKIP] existing rules file: $target_path"
                    set_status "rules" "skipped"
                    set_message "rules" "existing rules file preserved"
                    MIGRATION_SKIPPED=$((MIGRATION_SKIPPED + 1))
                    return 0
                    ;;
                backup)
                    rules_backup="$(backup_existing_path "$target_path")" || {
                        set_status "rules" "failed"
                        set_message "rules" "could not back up existing rules file"
                        MIGRATION_FAILED=$((MIGRATION_FAILED + 1))
                        return 0
                    }
                    echo "  [BACKUP] $target_path -> $rules_backup"
                    ;;
            esac
        fi
        mkdir -p "$(dirname "$target_path")"
        if cp "$source_path" "$target_path"; then
            echo "  [OK] migrated rule: $source_rules -> $target_rules"
            set_status "rules" "success"
            set_message "rules" "rules file migration succeeded"
            MIGRATION_SUCCESS=$((MIGRATION_SUCCESS + 1))
        else
            set_status "rules" "failed"
            set_message "rules" "rules file migration failed"
            MIGRATION_FAILED=$((MIGRATION_FAILED + 1))
        fi
    fi
}

migrate_prompts() {
    local source_ide="$1"
    local target_ide="$2"

    MIGRATION_TOTAL=$((MIGRATION_TOTAL + 1))

    if [[ "$source_ide" == "amazon-q" || "$target_ide" == "amazon-q" ]]; then
        set_status "prompts" "manual"
        set_message "prompts" "Amazon Q saved prompts have an official global library path but no cross-IDE prompt converter"
        set_manual_step "prompts" "Amazon Q: global prompts are ~/.aws/amazonq/prompts/*.md and are created from the IDE with @ → Prompts → Create a new prompt; project prompt scope is not documented as a portable path. Recreate or review prompt frontmatter/aliases manually"
        MIGRATION_SKIPPED=$((MIGRATION_SKIPPED + 1))
        return 0
    fi

    if [[ "$source_ide" == "pieces" || "$target_ide" == "pieces" ]]; then
        set_status "prompts" "manual"
        set_message "prompts" "Pieces has no documented portable prompt-template directory"
        set_manual_step "prompts" "Pieces: review prompt and memory workflows in PiecesOS/Desktop or the consuming host; do not copy .pieces as prompt files"
        MIGRATION_SKIPPED=$((MIGRATION_SKIPPED + 1))
        return 0
    fi

    if [[ "$source_ide" == "blackbox" || "$target_ide" == "blackbox" ]]; then
        set_status "prompts" "manual"
        set_message "prompts" "Blackbox official docs do not define portable prompt template directory; auto migration unsupported"
        set_manual_step "prompts" "Blackbox: /skill is a CLI session command, not a prompt file directory; do not infer .blackbox/prompts or commands path"
        MIGRATION_SKIPPED=$((MIGRATION_SKIPPED + 1))
        return 0
    fi

    if [[ "$source_ide" == "gemini-cli" || "$target_ide" == "gemini-cli" ]]; then
        set_status "prompts" "manual"
        set_message "prompts" "Gemini CLI commands use TOML; automatic prompt migration is unsupported"
        set_manual_step "prompts" "Gemini CLI: review .gemini/commands/*.toml or ~/.gemini/commands/*.toml manually; preserve required prompt/optional description fields, {{args}}, and !{...} shell blocks instead of copying Markdown files"
        MIGRATION_SKIPPED=$((MIGRATION_SKIPPED + 1))
        return 0
    fi

    if [[ "$source_ide" == "supermaven" || "$target_ide" == "supermaven" ]]; then
        set_status "prompts" "manual"
        set_message "prompts" "Supermaven has no documented portable prompt-template directory; automatic migration is unsupported"
        set_manual_step "prompts" "Supermaven: review prompts/chat settings in the host editor or Neovim configuration manually"
        MIGRATION_SKIPPED=$((MIGRATION_SKIPPED + 1))
        return 0
    fi

    if [[ "$source_ide" == "cody" || "$target_ide" == "cody" ]]; then
        set_status "prompts" "manual"
        set_message "prompts" "Cody prompts are managed in the Enterprise Prompt Library; portable file migration is unsupported"
        set_manual_step "prompts" "Cody: use the Enterprise Prompt Library and its documented custom-command migration; do not copy legacy cody.json or infer a workspace command directory"
        MIGRATION_SKIPPED=$((MIGRATION_SKIPPED + 1))
        return 0
    fi

    if [[ "$source_ide" == "goose-cli" || "$target_ide" == "goose-cli" ]]; then
        set_status "prompts" "manual"
        set_message "prompts" "Goose prompt templates are global files and slash commands are config.yaml entries; automatic migration is unsupported"
        set_manual_step "prompts" "Goose: review ~/.config/goose/prompts/ and slash_commands in ~/.config/goose/config.yaml manually; local .goose/recipes/*.yaml are recipes, not prompt templates"
        MIGRATION_SKIPPED=$((MIGRATION_SKIPPED + 1))
        return 0
    fi

    if [[ "$source_ide" == "trae" || "$target_ide" == "trae" ||
          "$source_ide" == "trae-cn" || "$target_ide" == "trae-cn" ]]; then
        set_status "prompts" "manual"
        set_message "prompts" "TRAE commands use .trae/commands/*.md; automatic prompt conversion is unsupported"
        set_manual_step "prompts" "TRAE: review project .trae/commands/ manually; preserve filename, description, nesting, and Markdown instruction body"
        MIGRATION_SKIPPED=$((MIGRATION_SKIPPED + 1))
        return 0
    fi

    if [[ "$source_ide" == "windsurf" || "$target_ide" == "windsurf" ]]; then
        set_status "prompts" "manual"
        set_message "prompts" "Windsurf workflows use a product-specific directory and invocation model"
        set_manual_step "prompts" "Windsurf: review .windsurf/workflows/*.md and ~/.codeium/windsurf/global_workflows/*.md manually; preserve frontmatter, slash names, nesting, and documented length limits"
        MIGRATION_SKIPPED=$((MIGRATION_SKIPPED + 1))
        return 0
    fi

    if [[ "$source_ide" == "opencode" || "$target_ide" == "opencode" ]]; then
        set_manual_step "prompts" 'OpenCode: project .opencode/commands/*.md is copied as Markdown only; review global ~/.config/opencode/commands/, command entries in opencode.json, frontmatter, and $ARGUMENTS/!`cmd`/@file templates manually'
    fi

    if [[ "$source_ide" == "roo-code" || "$target_ide" == "roo-code" ]]; then
        set_manual_step "prompts" "Roo Code: project slash commands are .roo/commands/*.md; review command names, mode permissions, and invocation semantics manually after copying. Do not treat .roomodes or global custom_modes.yaml/json as prompt files"
    fi

    local source_prompts
    source_prompts=$(get_prompts_path "$source_ide")
    local target_prompts
    target_prompts=$(get_prompts_path "$target_ide")

    if [[ -z "$source_prompts" ]]; then
        set_status "prompts" "skipped"
        set_message "prompts" "source IDE does not support prompt templates"
        MIGRATION_SKIPPED=$((MIGRATION_SKIPPED + 1))
        return 0
    fi

    if [[ -z "$target_prompts" ]]; then
        set_status "prompts" "skipped"
        set_message "prompts" "target IDE does not support prompt templates"
        MIGRATION_SKIPPED=$((MIGRATION_SKIPPED + 1))
        return 0
    fi

    if [[ "$source_ide" == "vscode" || "$target_ide" == "vscode" || "$source_ide" == "visual-studio" || "$target_ide" == "visual-studio" ]]; then
        set_manual_step "prompts" "GitHub Copilot IDEs: workspace .github/prompts/*.prompt.md is migrated; user prompts and IDE-managed locations require manual review"
    fi

    local prompt_pattern="*.md"
    if [[ "$source_ide" == "vscode" || "$target_ide" == "vscode" || "$source_ide" == "visual-studio" || "$target_ide" == "visual-studio" ]]; then
        prompt_pattern="*.prompt.md"
    fi

    print_progress "MIGRATE" "Migrating prompt templates..."

    local source_path="$WORKSPACE_ROOT/$source_prompts"
    local target_path="$WORKSPACE_ROOT/$target_prompts"

    if [[ ! -d "$source_path" ]]; then
        set_status "prompts" "skipped"
        set_message "prompts" "source prompt directory does not exist: $source_prompts"
        MIGRATION_SKIPPED=$((MIGRATION_SKIPPED + 1))
        return 0
    fi

    local prompt_count
    prompt_count=$(find "$source_path" -name "$prompt_pattern" -type f 2>/dev/null | wc -l | tr -d ' ')

    if [[ "$prompt_count" -eq 0 ]]; then
        set_status "prompts" "skipped"
        set_message "prompts" "source prompt directory is empty"
        MIGRATION_SKIPPED=$((MIGRATION_SKIPPED + 1))
        return 0
    fi

    if [[ -L "$target_path" ]]; then
        set_status "prompts" "failed"
        set_message "prompts" "target prompt directory is a symbolic link; refusing indirect overwrite"
        MIGRATION_FAILED=$((MIGRATION_FAILED + 1))
        return 0
    fi
    if [[ -e "$target_path" && ! -d "$target_path" ]]; then
        set_status "prompts" "failed"
        set_message "prompts" "target prompt path is not a directory"
        MIGRATION_FAILED=$((MIGRATION_FAILED + 1))
        return 0
    fi

    if [[ $DRY_RUN -eq 1 ]]; then
        if [[ -e "$target_path" ]]; then
            case "$STRATEGY" in
                skip)
                    echo "  DRY-RUN: skip existing prompt directory $target_path"
                    set_status "prompts" "skipped"
                    set_message "prompts" "existing prompt directory would be preserved"
                    MIGRATION_SKIPPED=$((MIGRATION_SKIPPED + 1))
                    return 0
                    ;;
                backup)
                    echo "  DRY-RUN: backup $target_path before copying"
                    ;;
            esac
        fi
        echo "  DRY-RUN: copy $prompt_pattern files from $source_path to $target_path/"
        set_status "prompts" "success"
        set_message "prompts" "$prompt_count prompt templates ready to migrate"
    else
        local prompts_backup=""
        if [[ -e "$target_path" ]]; then
            case "$STRATEGY" in
                skip)
                    echo "  [SKIP] existing prompt directory: $target_path"
                    set_status "prompts" "skipped"
                    set_message "prompts" "existing prompt directory preserved"
                    MIGRATION_SKIPPED=$((MIGRATION_SKIPPED + 1))
                    return 0
                    ;;
                backup)
                    prompts_backup="$(backup_existing_path "$target_path")" || {
                        set_status "prompts" "failed"
                        set_message "prompts" "could not back up existing prompt directory"
                        MIGRATION_FAILED=$((MIGRATION_FAILED + 1))
                        return 0
                    }
                    echo "  [BACKUP] $target_path -> $prompts_backup"
                    ;;
            esac
        fi
        mkdir -p "$target_path"
        local prompt_file relative_prompt target_prompt
        local prompt_copy_failed=0
        while IFS= read -r -d '' prompt_file; do
            relative_prompt="${prompt_file#"$source_path"/}"
            target_prompt="$target_path/$relative_prompt"
            mkdir -p "$(dirname "$target_prompt")"
            if ! cp "$prompt_file" "$target_prompt"; then
                prompt_copy_failed=1
                break
            fi
        done < <(find "$source_path" -name "$prompt_pattern" -type f -print0 2>/dev/null)
        if [[ "$prompt_copy_failed" -eq 0 ]]; then
            echo "  [OK] migrated prompts: $prompt_count files"
            set_status "prompts" "success"
            set_message "prompts" "successfully migrated $prompt_count prompt templates"
            MIGRATION_SUCCESS=$((MIGRATION_SUCCESS + 1))
        else
            set_status "prompts" "failed"
            set_message "prompts" "prompt template migration failed"
            MIGRATION_FAILED=$((MIGRATION_FAILED + 1))
        fi
    fi
}

convert_mcp_file() {
    local src="$1" src_key="$2" dst="$3" dst_key="$4" target_ide="$5" strategy="$6" target_version="$7"
    CONV_RESULT=""
    CONV_DETAIL=""
    MCP_REDACTED_COUNT=0

    if [[ ! -r "$src" ]]; then
        CONV_RESULT="failed"
        CONV_DETAIL="source MCP config unreadable: $src"
        return
    fi

    local src_ext dst_ext
    src_ext="${src##*.}"
    dst_ext="${dst##*.}"

    if [[ "$src_ext" =~ ^jsonc?$ && "$dst_ext" =~ ^jsonc?$ ]] && command -v python3 >/dev/null 2>&1; then
        local json_conversion_rc=0
        python3 - "$src" "$src_key" "$dst" "$dst_key" "$target_ide" "$strategy" "$target_version" >/dev/null 2>&1 <<'PYEOF' || json_conversion_rc=$?
import json, os, re, sys
from urllib.parse import parse_qsl, urlsplit
src, src_key, dst, dst_key, target_ide, strategy, target_version = sys.argv[1], (sys.argv[2] or ""), sys.argv[3], (sys.argv[4] or ""), sys.argv[5], sys.argv[6], sys.argv[7]
SECRET_KEY_RE = re.compile(r"(?i)(api[_-]?key|token|secret|password|passwd|authorization|auth|bearer|private[_-]?key|access[_-]?key|client[_-]?secret|session|cookie)", re.IGNORECASE)
URL_CRED_RE = re.compile(r"^(?:https?|postgres|postgresql|mysql|mongodb|mongodb\+srv|redis|ftp|amqp|sqlserver)://[^:@/\s]+:[^@/\s]+@", re.IGNORECASE)
URL_TOKEN_RE = re.compile(r"^(https?://)[^/\s]*:(//)?[A-Za-z0-9_\-]{16,}", re.IGNORECASE)
QUERY_CRED_RE = re.compile(r"[?&](key|token|secret|access[_-]?token|api[_-]?key)=[A-Za-z0-9_\-]{12,}", re.IGNORECASE)
PROVIDER_SECRET_RE = re.compile(r"(?:sk-[A-Za-z0-9_-]{16,}|gh[pousr]_[A-Za-z0-9]{20,}|tvly-[A-Za-z0-9_-]{16,}|AKIA[0-9A-Z]{16}|ASIA[0-9A-Z]{16}|xox[baprs]-[A-Za-z0-9-]{10,}|ya29\.[A-Za-z0-9_-]+|AIza[0-9A-Za-z_-]{35}|sk_live_[A-Za-z0-9]{16,})")
SAFE_ENV_REF_TOKEN = r"(?:\$\{env:[A-Za-z_][A-Za-z0-9_]*\}|\$\{[A-Za-z_][A-Za-z0-9_]*\}|\{env:[A-Za-z_][A-Za-z0-9_]*\})"
SAFE_ENV_REF_RE = re.compile(SAFE_ENV_REF_TOKEN)
SAFE_ENV_REF_FULL_RE = re.compile(r"^" + SAFE_ENV_REF_TOKEN + r"$")
SAFE_BEARER_REF_RE = re.compile(r"^Bearer\s+" + SAFE_ENV_REF_TOKEN + r"$", re.IGNORECASE)

def is_safe_reference_value(value):
    """Return true only when every credential payload is a symbolic env ref."""
    if not isinstance(value, str):
        return False
    if target_ide == "opencode":
        exact_ref = re.fullmatch(r"\{env:[A-Za-z_][A-Za-z0-9_]*\}", value)
        bearer_ref = re.fullmatch(r"Bearer\s+\{env:[A-Za-z_][A-Za-z0-9_]*\}", value, re.IGNORECASE)
    else:
        exact_ref = SAFE_ENV_REF_FULL_RE.fullmatch(value)
        bearer_ref = SAFE_BEARER_REF_RE.fullmatch(value)
    if exact_ref or bearer_ref:
        return True
    if not value.lower().startswith(("http://", "https://")) or not SAFE_ENV_REF_RE.search(value):
        return False
    if PROVIDER_SECRET_RE.search(value) or URL_CRED_RE.match(value) or URL_TOKEN_RE.match(value):
        return False
    try:
        parsed = urlsplit(value)
    except ValueError:
        return False
    if parsed.username or parsed.password:
        return False
    credential_params = [
        param_value
        for key, param_value in parse_qsl(parsed.query, keep_blank_values=True)
        if SECRET_KEY_RE.search(key)
    ]
    if target_ide == "opencode":
        return bool(credential_params) and all(
            re.fullmatch(r"\{env:[A-Za-z_][A-Za-z0-9_]*\}", item)
            for item in credential_params
        )
    return bool(credential_params) and all(SAFE_ENV_REF_FULL_RE.fullmatch(item) for item in credential_params)

def normalize_environment_references(node):
    """Translate documented Cursor refs into OpenCode's documented syntax."""
    if isinstance(node, dict):
        for key, value in list(node.items()):
            node[key] = normalize_environment_references(value)
    elif isinstance(node, list):
        for index, value in enumerate(node):
            node[index] = normalize_environment_references(value)
    elif isinstance(node, str) and target_ide == "opencode":
        return re.sub(
            r"\$\{env:([A-Za-z_][A-Za-z0-9_]*)\}",
            r"{env:\1}",
            node,
        )
    return node

def redact_value(v):
    if isinstance(v, str):
        if is_safe_reference_value(v):
            return v
        if PROVIDER_SECRET_RE.search(v):
            return ""
        if SECRET_KEY_RE.search(v) and ' ' not in v:
            return ""
        if URL_CRED_RE.match(v) or URL_TOKEN_RE.match(v):
            return ""
        if QUERY_CRED_RE.search(v):
            return ""
    return v

FLAG_RE = re.compile(r"^--?[A-Za-z0-9_\-]+$")
FLAG_EQ_RE = re.compile(r"^(--?[A-Za-z0-9_\-]+)=(.+)$")
SHORT_SECRET_FLAGS = {"-p", "-t", "-k"}

def redact_node(node, key_ctx=""):
    if isinstance(node, dict):
        for k, v in list(node.items()):
            if isinstance(v, (dict, list)):
                redact_node(v, k)
            elif isinstance(v, str) and SECRET_KEY_RE.search(k) and not is_safe_reference_value(v):
                node[k] = ""
            else:
                node[k] = redact_value(v)
    elif isinstance(node, list):
        parent_secret = bool(SECRET_KEY_RE.search(key_ctx or ""))
        blank_next = False
        for i, item in enumerate(node):
            if isinstance(item, (dict, list)):
                redact_node(item, key_ctx)
                blank_next = False
            elif isinstance(item, str):
                if parent_secret and not is_safe_reference_value(item):
                    node[i] = ""
                elif blank_next:
                    node[i] = item if is_safe_reference_value(item) else ""
                    blank_next = False
                else:
                    m_eq = FLAG_EQ_RE.match(item)
                    if m_eq and (SECRET_KEY_RE.search(m_eq.group(1)) or m_eq.group(1) in SHORT_SECRET_FLAGS):
                        node[i] = m_eq.group(1) + "="
                    elif item in SHORT_SECRET_FLAGS:
                        blank_next = True  # short secret flag (-p/-t/-k); value blanked
                    elif FLAG_RE.match(item) and SECRET_KEY_RE.search(item):
                        blank_next = True  # flag kept; next argv element blanked
                    else:
                        node[i] = redact_value(item)
            else:
                blank_next = False

def _strip_jsonc(text):
    out = []
    i = 0
    in_string = False
    escaped = False
    line_comment = False
    block_comment = False
    while i < len(text):
        ch = text[i]
        nxt = text[i + 1] if i + 1 < len(text) else ""
        if line_comment:
            if ch in "\r\n":
                line_comment = False
                out.append(ch)
            i += 1
            continue
        if block_comment:
            if ch == "*" and nxt == "/":
                block_comment = False
                i += 2
                continue
            if ch in "\r\n":
                out.append(ch)
            i += 1
            continue
        if in_string:
            out.append(ch)
            if escaped:
                escaped = False
            elif ch == "\\":
                escaped = True
            elif ch == '"':
                in_string = False
            i += 1
            continue
        if ch == '"':
            in_string = True
            out.append(ch)
            i += 1
        elif ch == "/" and nxt == "/":
            line_comment = True
            i += 2
        elif ch == "/" and nxt == "*":
            block_comment = True
            i += 2
        else:
            out.append(ch)
            i += 1
    text = "".join(out)
    out = []
    in_string = False
    escaped = False
    i = 0
    while i < len(text):
        ch = text[i]
        if in_string:
            out.append(ch)
            if escaped:
                escaped = False
            elif ch == "\\":
                escaped = True
            elif ch == '"':
                in_string = False
            i += 1
            continue
        if ch == '"':
            in_string = True
            out.append(ch)
            i += 1
            continue
        if ch == ",":
            j = i + 1
            while j < len(text) and text[j].isspace():
                j += 1
            if j < len(text) and text[j] in "]}":
                i += 1
                continue
        out.append(ch)
        i += 1
    return "".join(out)

def _load_json_document(path):
    with open(path) as f:
        raw = f.read()
    if path.lower().endswith(".jsonc"):
        raw = _strip_jsonc(raw)
    return json.loads(raw)

try:
    data = _load_json_document(src)
except Exception:
    sys.exit(2)  # not JSON/JSONC -> caller handles it explicitly
def read_path(obj, key):
    for part in key.split('.') if key else []:
        if not isinstance(obj, dict):
            return {}
        obj = obj.get(part, {})
    return obj

def write_path(obj, key, value):
    parts = key.split('.') if key else []
    for part in parts[:-1]:
        if not isinstance(obj.get(part), dict):
            obj[part] = {}
        obj = obj[part]
    if parts:
        obj[parts[-1]] = value

if isinstance(data, dict):
    if src_key and ('.' in src_key or src_key in data):
        servers = read_path(data, src_key)
    elif "mcpServers" in data:
        servers = data["mcpServers"]
    else:
        servers = {}
else:
    servers = {}
if not servers:
    sys.exit(3)
normalize_environment_references(servers)
redact_node(servers)
def strip_execution_approvals(node):
    if isinstance(node, dict):
        for key in ("autoApprove", "enabledTools", "disabledTools"):
            node.pop(key, None)
        for value in node.values():
            strip_execution_approvals(value)
    elif isinstance(node, list):
        for value in node:
            strip_execution_approvals(value)

strip_execution_approvals(servers)
if target_ide == "copilot":
    supported_types = {"local", "stdio", "http", "sse"}
    if not isinstance(servers, dict):
        sys.exit(4)
    for server in servers.values():
        if not isinstance(server, dict):
            sys.exit(4)
        transport = server.get("type")
        tools = server.get("tools")
        if not isinstance(tools, list):
            sys.exit(4)
        if transport is None:
            if not isinstance(server.get("command"), str) or not isinstance(server.get("args"), list):
                sys.exit(4)
        elif transport not in supported_types:
            sys.exit(4)
        elif transport in {"local", "stdio"}:
            if not isinstance(server.get("command"), str) or not isinstance(server.get("args"), list):
                sys.exit(4)
        elif not isinstance(server.get("url"), str):
            sys.exit(4)
if target_ide == "cline":
    if not isinstance(servers, dict):
        sys.exit(7)
    for server in servers.values():
        if not isinstance(server, dict):
            sys.exit(7)
        has_command = isinstance(server.get("command"), str)
        has_url = isinstance(server.get("url"), str)
        if has_command == has_url:
            sys.exit(7)
        if has_command and "args" in server and not isinstance(server["args"], list):
            sys.exit(7)
        if "env" in server and not isinstance(server["env"], dict):
            sys.exit(7)
        if "disabled" in server and not isinstance(server["disabled"], bool):
            sys.exit(7)
        if "timeout" in server and not isinstance(server["timeout"], (int, float)):
            sys.exit(7)
if target_ide == "void-editor":
    if not isinstance(servers, dict):
        sys.exit(15)
    for server in servers.values():
        if not isinstance(server, dict):
            sys.exit(15)
        has_command = "command" in server
        has_url = "url" in server
        if has_command == has_url:
            sys.exit(15)
        source_type = server.pop("type", None)
        server.pop("transport", None)
        if has_command:
            if source_type not in (None, "local", "stdio"):
                sys.exit(15)
            if not isinstance(server.get("command"), str) or not server.get("command"):
                sys.exit(15)
            if "args" in server and (not isinstance(server["args"], list) or not all(isinstance(item, str) for item in server["args"])):
                sys.exit(15)
            if "env" in server and (not isinstance(server["env"], dict) or not all(isinstance(key, str) and isinstance(value, str) for key, value in server["env"].items())):
                sys.exit(15)
            if set(server) - {"command", "args", "env"}:
                sys.exit(15)
        else:
            if source_type not in (None, "remote", "http", "sse", "streamable-http"):
                sys.exit(15)
            if not isinstance(server.get("url"), str) or not server.get("url"):
                sys.exit(15)
            if set(server) - {"url"}:
                sys.exit(15)
if target_ide == "gemini-cli":
    if not isinstance(servers, dict):
        sys.exit(8)
    for name, server in servers.items():
        if "_" in name or not isinstance(server, dict):
            sys.exit(8)
        endpoint_keys = ("command", "url", "httpUrl")
        if not any(isinstance(server.get(key), str) and server.get(key) for key in endpoint_keys):
            sys.exit(8)
        for key in endpoint_keys:
            if key in server and not isinstance(server[key], str):
                sys.exit(8)
        if "args" in server and (not isinstance(server["args"], list) or not all(isinstance(item, str) for item in server["args"])):
            sys.exit(8)
        if "headers" in server and (not isinstance(server["headers"], dict) or not all(isinstance(key, str) and isinstance(value, str) for key, value in server["headers"].items())):
            sys.exit(8)
        if "env" in server and (not isinstance(server["env"], dict) or not all(isinstance(key, str) and isinstance(value, str) for key, value in server["env"].items())):
            sys.exit(8)
        if "cwd" in server and not isinstance(server["cwd"], str):
            sys.exit(8)
        if "timeout" in server and (not isinstance(server["timeout"], (int, float)) or isinstance(server["timeout"], bool)):
            sys.exit(8)
        if "trust" in server and not isinstance(server["trust"], bool):
            sys.exit(8)
        for key in ("includeTools", "excludeTools"):
            if key in server and (not isinstance(server[key], list) or not all(isinstance(item, str) for item in server[key])):
                sys.exit(8)
if target_ide == "kilocode":
    if not isinstance(servers, dict):
        sys.exit(10)
    for server in servers.values():
        if not isinstance(server, dict) or "transport" in server:
            sys.exit(10)
        has_command = "command" in server
        has_url = "url" in server
        if has_command == has_url:
            sys.exit(10)
        source_type = server.get("type")
        if has_command:
            if source_type not in (None, "local", "stdio"):
                sys.exit(10)
            command = server.get("command")
            args = server.get("args", [])
            if isinstance(command, str):
                command = [command]
            if not isinstance(command, list) or not command or not all(isinstance(item, str) for item in command):
                sys.exit(10)
            if not isinstance(args, list) or not all(isinstance(item, str) for item in args):
                sys.exit(10)
            server["command"] = command + args
            server.pop("args", None)
            server["type"] = "local"
            if "env" in server:
                if "environment" in server or not isinstance(server["env"], dict):
                    sys.exit(10)
                server["environment"] = server.pop("env")
            if "environment" in server and (not isinstance(server["environment"], dict) or not all(isinstance(k, str) and isinstance(v, str) for k, v in server["environment"].items())):
                sys.exit(10)
            if any(key in server for key in ("headers", "oauth", "url")):
                sys.exit(10)
        else:
            if source_type not in (None, "remote", "http", "sse", "streamable-http"):
                sys.exit(10)
            if not isinstance(server.get("url"), str) or not server.get("url"):
                sys.exit(10)
            server["type"] = "remote"
            if "headers" in server and (not isinstance(server["headers"], dict) or not all(isinstance(k, str) and isinstance(v, str) for k, v in server["headers"].items())):
                sys.exit(10)
            if any(key in server for key in ("args", "env", "environment", "cwd", "command")):
                sys.exit(10)
        if "enabled" in server and not isinstance(server["enabled"], bool):
            sys.exit(10)
        if "timeout" in server and (not isinstance(server["timeout"], (int, float)) or isinstance(server["timeout"], bool)):
            sys.exit(10)
        if "oauth" in server and not isinstance(server["oauth"], (bool, dict)):
            sys.exit(10)
if target_ide in {"kimiai", "kiro", "zcode"}:
    if not isinstance(servers, dict):
        sys.exit(12)
    for server in servers.values():
        if not isinstance(server, dict):
            sys.exit(12)
        has_command = "command" in server
        has_url = "url" in server
        if has_command == has_url:
            sys.exit(12)
        source_type = server.pop("type", None)
        if has_command:
            if source_type not in (None, "local", "stdio"):
                sys.exit(12)
            command = server.get("command")
            args = server.get("args", [])
            if not isinstance(args, list) or not all(isinstance(item, str) for item in args):
                sys.exit(12)
            if isinstance(command, list):
                if not command or not all(isinstance(item, str) for item in command):
                    sys.exit(12)
                command, args = command[0], command[1:] + args
            if not isinstance(command, str) or not command:
                sys.exit(12)
            server["command"] = command
            server["args"] = args
            if "environment" in server:
                if "env" in server or not isinstance(server["environment"], dict):
                    sys.exit(12)
                server["env"] = server.pop("environment")
            if "env" in server and (not isinstance(server["env"], dict) or not all(isinstance(k, str) and isinstance(v, str) for k, v in server["env"].items())):
                sys.exit(12)
            if "headers" in server:
                sys.exit(12)
        else:
            if source_type not in (None, "remote", "http", "sse", "streamable-http"):
                sys.exit(12)
            if not isinstance(server.get("url"), str) or not server.get("url"):
                sys.exit(12)
            if source_type == "sse" and target_ide == "kimiai":
                server["transport"] = "sse"
            if "headers" in server and (not isinstance(server["headers"], dict) or not all(isinstance(k, str) and isinstance(v, str) for k, v in server["headers"].items())):
                sys.exit(12)
            if any(key in server for key in ("args", "env", "environment", "cwd", "command")):
                sys.exit(12)
        if "transport" in server:
            if target_ide != "kimiai" or server["transport"] != "sse":
                sys.exit(12)
        for key in ("enabled", "disabled"):
            if key in server and not isinstance(server[key], bool):
                sys.exit(12)
        for key in ("startupTimeoutMs", "toolTimeoutMs", "timeout"):
            if key in server and (not isinstance(server[key], (int, float)) or isinstance(server[key], bool)):
                sys.exit(12)
if target_ide == "workbuddy":
    if not isinstance(servers, dict):
        sys.exit(16)
    allowed_keys = {"command", "args", "env"}
    for server in servers.values():
        if not isinstance(server, dict) or set(server) - allowed_keys:
            sys.exit(16)
        if not isinstance(server.get("command"), str) or not server.get("command"):
            sys.exit(16)
        if "args" in server and (not isinstance(server["args"], list) or not all(isinstance(item, str) for item in server["args"])):
            sys.exit(16)
        if "env" in server and (not isinstance(server["env"], dict) or not all(isinstance(key, str) and isinstance(value, str) for key, value in server["env"].items())):
            sys.exit(16)
if target_ide == "jetbrains":
    if not isinstance(servers, dict):
        sys.exit(17)
    for server in servers.values():
        if not isinstance(server, dict) or set(server) - {"command", "args", "env"}:
            sys.exit(17)
        if not isinstance(server.get("command"), str) or not server.get("command"):
            sys.exit(17)
        if "args" in server and (not isinstance(server["args"], list) or not all(isinstance(item, str) for item in server["args"])):
            sys.exit(17)
        if "env" in server and (not isinstance(server["env"], dict) or not all(isinstance(key, str) and isinstance(value, str) for key, value in server["env"].items())):
            sys.exit(17)
if target_ide == "augment-code":
    if not isinstance(servers, dict):
        sys.exit(13)
    for server in servers.values():
        if not isinstance(server, dict):
            sys.exit(13)
        has_command = "command" in server
        has_url = "url" in server
        if has_command == has_url:
            sys.exit(13)
        source_type = server.get("type")
        if has_command:
            if source_type not in (None, "local", "stdio"):
                sys.exit(13)
            command = server.get("command")
            args = server.get("args", [])
            if not isinstance(args, list) or not all(isinstance(item, str) for item in args):
                sys.exit(13)
            if isinstance(command, list):
                if not command or not all(isinstance(item, str) for item in command):
                    sys.exit(13)
                command, args = command[0], command[1:] + args
            if not isinstance(command, str) or not command or not isinstance(args, list) or not all(isinstance(item, str) for item in args):
                sys.exit(13)
            server["command"], server["args"] = command, args
            server.pop("type", None)
            if "env" in server and (not isinstance(server["env"], dict) or not all(isinstance(k, str) and isinstance(v, str) for k, v in server["env"].items())):
                sys.exit(13)
        else:
            if source_type not in {"http", "sse"} or not isinstance(server.get("url"), str) or not server.get("url"):
                sys.exit(13)
            if "headers" in server and (not isinstance(server["headers"], dict) or not all(isinstance(k, str) and isinstance(v, str) for k, v in server["headers"].items())):
                sys.exit(13)
        if "enabled" in server and not isinstance(server["enabled"], bool):
            sys.exit(13)
if target_ide == "baidu-comate":
    if not isinstance(servers, dict):
        sys.exit(14)
    for server in servers.values():
        if not isinstance(server, dict):
            sys.exit(14)
        transport = server.get("type", server.get("transportType"))
        if transport not in {"stdio", "sse", "streamableHttp", "streamable-http", "http"}:
            sys.exit(14)
        server["type"] = transport
        server.pop("transportType", None)
        if transport == "stdio":
            if not isinstance(server.get("command"), str) or not server.get("command"):
                sys.exit(14)
            if "url" in server or ("args" in server and (not isinstance(server["args"], list) or not all(isinstance(item, str) for item in server["args"]))):
                sys.exit(14)
        else:
            if not isinstance(server.get("url"), str) or not server.get("url"):
                sys.exit(14)
            if "command" in server or "args" in server:
                sys.exit(14)
        for key in ("env", "headers", "requestInit"):
            if key in server and not isinstance(server[key], dict):
                sys.exit(14)
        if "cwd" in server and not isinstance(server["cwd"], str):
            sys.exit(14)
        for key in ("timeout",):
            if key in server and (not isinstance(server[key], (int, float)) or isinstance(server[key], bool)):
                sys.exit(14)
        if "disabled" in server and not isinstance(server["disabled"], bool):
            sys.exit(14)
if target_ide == "opencode":
    if not isinstance(servers, dict):
        sys.exit(10)
    for server in servers.values():
        if not isinstance(server, dict):
            sys.exit(10)
        has_command = "command" in server
        has_url = "url" in server
        if has_command == has_url:
            sys.exit(10)
        source_type = server.get("type")
        if "transport" in server:
            sys.exit(10)
        if has_command:
            if source_type not in (None, "local", "stdio"):
                sys.exit(10)
            command = server.get("command")
            args = server.get("args", [])
            if isinstance(command, str):
                command_array = [command]
            elif isinstance(command, list) and all(isinstance(item, str) for item in command):
                command_array = list(command)
            else:
                sys.exit(10)
            if not isinstance(args, list) or not all(isinstance(item, str) for item in args):
                sys.exit(10)
            server["command"] = command_array + args
            server.pop("args", None)
            server["type"] = "local"
            if "env" in server:
                if "environment" in server or not isinstance(server["env"], dict):
                    sys.exit(10)
                server["environment"] = server.pop("env")
            if "environment" in server and (
                not isinstance(server["environment"], dict)
                or not all(isinstance(key, str) and isinstance(value, str) for key, value in server["environment"].items())
            ):
                sys.exit(10)
            if "cwd" in server and not isinstance(server["cwd"], str):
                sys.exit(10)
            if "enabled" in server and not isinstance(server["enabled"], bool):
                sys.exit(10)
            if "timeout" in server and (not isinstance(server["timeout"], (int, float)) or isinstance(server["timeout"], bool)):
                sys.exit(10)
            if any(key in server for key in ("headers", "oauth")):
                sys.exit(10)
        else:
            if source_type not in (None, "remote", "http", "sse", "streamable-http"):
                sys.exit(10)
            if not isinstance(server.get("url"), str) or not server.get("url"):
                sys.exit(10)
            server["type"] = "remote"
            if "headers" in server and (
                not isinstance(server["headers"], dict)
                or not all(isinstance(key, str) and isinstance(value, str) for key, value in server["headers"].items())
            ):
                sys.exit(10)
            if "oauth" in server and server["oauth"] is not False and not isinstance(server["oauth"], dict):
                sys.exit(10)
            if "enabled" in server and not isinstance(server["enabled"], bool):
                sys.exit(10)
            if "timeout" in server and (not isinstance(server["timeout"], (int, float)) or isinstance(server["timeout"], bool)):
                sys.exit(10)
            if any(key in server for key in ("args", "env", "environment", "cwd")):
                sys.exit(10)
        if target_version == "v2":
            if "enabled" in server and "disabled" in server:
                sys.exit(10)
            if "enabled" in server:
                server["disabled"] = not server.pop("enabled")
            if "timeout" in server:
                timeout = server["timeout"]
                if not isinstance(timeout, (int, float)) or isinstance(timeout, bool):
                    sys.exit(10)
                server["timeout"] = {
                    "catalog": timeout,
                    "execution": timeout,
                }
            if isinstance(server.get("oauth"), dict):
                oauth = server["oauth"]
                for old_key, new_key in {
                    "clientId": "client_id",
                    "clientSecret": "client_secret",
                    "callbackPort": "callback_port",
                    "redirectUri": "redirect_uri",
                }.items():
                    if old_key in oauth and new_key in oauth:
                        sys.exit(10)
                    if old_key in oauth:
                        oauth[new_key] = oauth.pop(old_key)
if target_ide in {"vscode", "visual-studio"}:
    if not isinstance(servers, dict):
        sys.exit(6)
    for server in servers.values():
        if not isinstance(server, dict):
            sys.exit(6)
        if any(key in server for key in ("transport", "serverUrl")):
            sys.exit(6)
        has_command = "command" in server
        has_url = "url" in server
        if has_command == has_url:
            sys.exit(6)
        transport = server.get("type")
        if transport is not None and transport not in {"stdio", "http", "sse"}:
            sys.exit(6)
        if has_command:
            if transport not in (None, "stdio"):
                sys.exit(6)
            if not isinstance(server.get("command"), str) or not server.get("command"):
                sys.exit(6)
            if "args" in server and (
                not isinstance(server["args"], list)
                or not all(isinstance(item, str) for item in server["args"])
            ):
                sys.exit(6)
            if "env" in server and (
                not isinstance(server["env"], dict)
                or not all(isinstance(key, str) and isinstance(value, str) for key, value in server["env"].items())
            ):
                sys.exit(6)
            for key in ("cwd", "envFile"):
                if key in server and not isinstance(server[key], str):
                    sys.exit(6)
            if "sandboxEnabled" in server and not isinstance(server["sandboxEnabled"], bool):
                sys.exit(6)
            if any(key in server for key in ("url", "headers", "oauth")):
                sys.exit(6)
        else:
            if not isinstance(server.get("url"), str) or not server.get("url"):
                sys.exit(6)
            if transport not in {"http", "sse"}:
                sys.exit(6)
            if any(key in server for key in ("command", "args", "env", "cwd", "envFile", "sandboxEnabled")):
                sys.exit(6)
            if "headers" in server and (
                not isinstance(server["headers"], dict)
                or not all(isinstance(key, str) and isinstance(value, str) for key, value in server["headers"].items())
            ):
                sys.exit(6)
            if "oauth" in server and not isinstance(server["oauth"], dict):
                sys.exit(6)
if target_ide == "windsurf":
    if not isinstance(servers, dict):
        sys.exit(18)
    for server in servers.values():
        if not isinstance(server, dict) or any(key in server for key in ("type", "transport")):
            sys.exit(18)
        has_command = "command" in server
        remote_keys = [key for key in ("serverUrl", "url") if key in server]
        if has_command and remote_keys:
            sys.exit(18)
        if has_command:
            if set(server) - {"command", "args", "env"}:
                sys.exit(18)
            if not isinstance(server.get("command"), str) or not server.get("command"):
                sys.exit(18)
            if "args" in server and (
                not isinstance(server["args"], list)
                or not all(isinstance(item, str) for item in server["args"])
            ):
                sys.exit(18)
            if "env" in server and (
                not isinstance(server["env"], dict)
                or not all(isinstance(key, str) and isinstance(value, str) for key, value in server["env"].items())
            ):
                sys.exit(18)
        else:
            if len(remote_keys) != 1:
                sys.exit(18)
            remote_key = remote_keys[0]
            if not isinstance(server.get(remote_key), str) or not server.get(remote_key):
                sys.exit(18)
            if set(server) - {remote_key, "headers"}:
                sys.exit(18)
            if "headers" in server and (
                not isinstance(server["headers"], dict)
                or not all(isinstance(key, str) and isinstance(value, str) for key, value in server["headers"].items())
            ):
                sys.exit(18)
if target_ide == "openclaw":
    if not isinstance(servers, dict):
        sys.exit(5)
    for server in servers.values():
        if not isinstance(server, dict):
            sys.exit(5)
        if "url" in server:
            transport = server.get("transport")
            if transport == "http":
                server["transport"] = "streamable-http"
            elif transport != "streamable-http":
                sys.exit(5)
if target_ide == "zed":
    if not isinstance(servers, dict):
        sys.exit(6)
    for server in servers.values():
        if not isinstance(server, dict) or "type" in server:
            sys.exit(6)
        has_command = "command" in server
        has_url = "url" in server
        if has_command == has_url:
            sys.exit(6)
        if has_command:
            if not isinstance(server.get("command"), str):
                sys.exit(6)
            if "args" in server and not isinstance(server["args"], list):
                sys.exit(6)
            if "env" in server and not isinstance(server["env"], dict):
                sys.exit(6)
        else:
            if not isinstance(server.get("url"), str):
                sys.exit(6)
            if "headers" in server and not isinstance(server["headers"], dict):
                sys.exit(6)
if target_ide == "antigravity" and isinstance(servers, dict):
    for server in servers.values():
        if isinstance(server, dict) and "url" in server:
            server.setdefault("serverUrl", server["url"])
            del server["url"]
existing = {}
if os.path.exists(dst):
    try:
        existing = _load_json_document(dst)
    except Exception:
        if target_ide in {"gemini-cli", "opencode", "kilocode", "kimiai", "kiro", "workbuddy", "jetbrains", "vscode", "visual-studio", "windsurf", "void-editor", "augment-code", "baidu-comate", "zcode"}:
            sys.exit(9)
        existing = {}
if not isinstance(existing, dict):
    if target_ide in {"gemini-cli", "opencode", "kilocode", "kimiai", "kiro", "workbuddy", "jetbrains", "vscode", "visual-studio", "windsurf", "void-editor", "augment-code", "baidu-comate", "zcode"}:
        sys.exit(9)
    existing = {}
if target_ide == "opencode" and isinstance(existing.get("mcp"), dict):
    existing_mcp = existing["mcp"]
    if target_version == "v2":
        if any(key not in {"servers", "timeout"} for key in existing_mcp):
            existing["mcp"] = {}
    elif "servers" in existing_mcp:
        existing["mcp"] = {}
if strategy == "overwrite":
    if dst_key:
        write_path(existing, dst_key, {})
    else:
        existing = {}
if dst_key:
    cur = read_path(existing, dst_key)
    if not isinstance(cur, dict):
        cur = {}
    if isinstance(servers, dict):
        cur.update(servers)
    write_path(existing, dst_key, cur)
else:
    if isinstance(servers, dict):
        existing.update(servers)
    else:
        existing = servers
with open(dst, "w") as f:
    json.dump(existing, f, indent=2)
sys.exit(0)
PYEOF
        if [[ "$json_conversion_rc" -eq 0 ]]; then
            if MCP_REDACTED_COUNT=$(redact_secrets_in_file "$dst"); then
                CONV_RESULT="success"
                CONV_DETAIL="MCP config converted (root key ${src_key:-mcpServers} -> ${dst_key:-mcpServers}); literal credentials cleared and supported environment references preserved/converted"
            else
                MCP_REDACTED_COUNT=0
                CONV_RESULT="failed"
                CONV_DETAIL="MCP config redaction failed, target file deleted to prevent secret leak (source file untouched)"
            fi
            return
        fi
        if [[ "$target_ide" == "copilot" && "$json_conversion_rc" -eq 4 ]]; then
            CONV_RESULT="failed"
            CONV_DETAIL="GitHub Copilot CLI MCP transport/schema is unsupported; review manually (supported: local, stdio, http, sse)"
            return
        fi
        if [[ ( "$target_ide" == "vscode" || "$target_ide" == "visual-studio" ) && "$json_conversion_rc" -eq 6 ]]; then
            CONV_RESULT="failed"
            CONV_DETAIL="GitHub Copilot IDE MCP schema/transport is ambiguous or unsupported; review manually (the target uses servers with stdio/http/sse)"
            return
        fi
        if [[ ( "$target_ide" == "vscode" || "$target_ide" == "visual-studio" ) && "$json_conversion_rc" -eq 9 ]]; then
            CONV_RESULT="failed"
            CONV_DETAIL="GitHub Copilot IDE target MCP file is not a valid JSON object; existing target was not overwritten"
            return
        fi
        if [[ "$target_ide" == "windsurf" && "$json_conversion_rc" -eq 18 ]]; then
            CONV_RESULT="failed"
            CONV_DETAIL="Windsurf MCP schema is invalid or ambiguous; review documented command/args/env or serverUrl|url/headers shapes"
            return
        fi
        if [[ "$target_ide" == "windsurf" && "$json_conversion_rc" -eq 9 ]]; then
            CONV_RESULT="failed"
            CONV_DETAIL="Windsurf target mcp_config.json is not a valid JSON object; existing target was not overwritten"
            return
        fi
        if [[ "$target_ide" == "openclaw" && "$json_conversion_rc" -eq 5 ]]; then
            CONV_RESULT="failed"
            CONV_DETAIL="OpenClaw MCP transport/schema is unsupported; remote entries require url plus transport=streamable-http (no transport is not inferred)"
            return
        fi
        if [[ "$target_ide" == "zed" && "$json_conversion_rc" -eq 6 ]]; then
            CONV_RESULT="failed"
            CONV_DETAIL="Zed context_servers schema is unsupported; review manually (use local command/args/env or remote url/headers; do not infer transport/type)"
            return
        fi
        if [[ "$target_ide" == "cline" && "$json_conversion_rc" -eq 7 ]]; then
            CONV_RESULT="failed"
            CONV_DETAIL="Cline MCP mcpServers schema is invalid or ambiguous; review manually (each server needs exactly one command or url, with args/env/disabled/timeout types validated)"
            return
        fi
        if [[ "$target_ide" == "gemini-cli" && "$json_conversion_rc" -eq 8 ]]; then
            CONV_RESULT="failed"
            CONV_DETAIL="Gemini CLI MCP schema is invalid or ambiguous; review manually (each server needs command, url, or httpUrl, and aliases must not contain underscores)"
            return
        fi
        if [[ "$target_ide" == "gemini-cli" && "$json_conversion_rc" -eq 9 ]]; then
            CONV_RESULT="failed"
            CONV_DETAIL="Gemini CLI target settings.json is not a valid JSON object; existing target was not overwritten"
            return
        fi
        if [[ "$target_ide" == "kilocode" && "$json_conversion_rc" -eq 10 ]]; then
            CONV_RESULT="failed"
            CONV_DETAIL="Kilo Code MCP JSONC schema is invalid or ambiguous; review mcp entries manually (local type=local with command array/environment, remote type=remote with url/headers)"
            return
        fi
        if [[ "$json_conversion_rc" -eq 12 && ("$target_ide" == "kimiai" || "$target_ide" == "kiro" || "$target_ide" == "zcode") ]]; then
            CONV_RESULT="failed"
            CONV_DETAIL="target IDE's MCP mcpServers/schema is invalid or ambiguous; please review manually per official command/args or url/headers format"
            return
        fi
        if [[ "$target_ide" == "workbuddy" && "$json_conversion_rc" -eq 16 ]]; then
            CONV_RESULT="failed"
            CONV_DETAIL="WorkBuddy desktop MCP schema is unsupported or contains an undocumented remote/metadata field; review manually (documented local shape: command, optional args, optional env)"
            return
        fi
        if [[ "$target_ide" == "jetbrains" && "$json_conversion_rc" -eq 17 ]]; then
            CONV_RESULT="failed"
            CONV_DETAIL="Junie MCP schema is unsupported or contains an undocumented remote/metadata field; review manually (documented local shape: command, optional args, optional env)"
            return
        fi
        if [[ "$target_ide" == "void-editor" && "$json_conversion_rc" -eq 15 ]]; then
            CONV_RESULT="failed"
            CONV_DETAIL="Void MCP schema is invalid or ambiguous; review the custom mcpServers format (command/args/env or URL-only remote; headers/auth require manual review)"
            return
        fi
        if [[ "$target_ide" == "augment-code" && "$json_conversion_rc" -eq 13 ]]; then
            CONV_RESULT="failed"
            CONV_DETAIL="Augment MCP schema is invalid or remote transport is ambiguous; review manually (local command/args/env, remote type=http|sse with url/headers)"
            return
        fi
        if [[ "$target_ide" == "baidu-comate" && "$json_conversion_rc" -eq 14 ]]; then
            CONV_RESULT="failed"
            CONV_DETAIL="Comate MCP schema is invalid; review manually (required type=stdio|sse|streamableHttp with command or url)"
            return
        fi
        if [[ "$target_ide" == "opencode" && "$json_conversion_rc" -eq 10 ]]; then
            CONV_RESULT="failed"
            CONV_DETAIL="OpenCode MCP schema is invalid or ambiguous; review manually (local requires type=local plus command array/environment, remote requires type=remote plus url/headers/oauth)"
            return
        fi
        if [[ "$target_ide" == "gemini-cli" ]]; then
            CONV_RESULT="failed"
            CONV_DETAIL="Gemini CLI MCP source is not a valid non-empty JSON mcpServers map; manual conversion required"
            return
        fi
    fi

    if [[ "$target_ide" == "gemini-cli" ]]; then
        CONV_RESULT="failed"
        CONV_DETAIL="Gemini CLI MCP requires a JSON mcpServers conversion; source format is unsupported for automatic migration"
        return
    fi

    if [[ "$target_ide" == "opencode" ]]; then
        CONV_RESULT="failed"
        CONV_DETAIL="OpenCode MCP requires a JSON mcp conversion; source format is unsupported for automatic migration"
        return
    fi

    if [[ "$target_ide" == "vscode" ]]; then
        CONV_RESULT="failed"
        CONV_DETAIL='VS Code MCP requires a JSON `servers` conversion; source format is unsupported for automatic migration'
        return
    fi

    if [[ "$target_ide" == "windsurf" ]]; then
        CONV_RESULT="failed"
        CONV_DETAIL="Windsurf MCP requires a JSON mcpServers conversion; source format is unsupported for automatic migration"
        return
    fi

    if [[ "$target_ide" == "kilocode" || "$target_ide" == "kimiai" || "$target_ide" == "kiro" || "$target_ide" == "workbuddy" || "$target_ide" == "jetbrains" || "$target_ide" == "void-editor" || "$target_ide" == "augment-code" || "$target_ide" == "baidu-comate" || "$target_ide" == "zcode" ]]; then
        CONV_RESULT="failed"
        CONV_DETAIL="target IDE's MCP file needs JSON/JSONC Schema conversion; current source format not supported for auto migration"
        return
    fi

    if [[ -n "${SOURCE_MCP_FILE:-}" ]]; then
        CONV_RESULT="failed"
        CONV_DETAIL="explicit MCP source did not pass schema conversion; copy-as-is fallback is disabled"
        return
    fi

    if [[ "${MCP_ALLOW_COPY_FALLBACK:-1}" -ne 1 ]]; then
        CONV_RESULT="failed"
        CONV_DETAIL="source/target MCP format not directly compatible, and copy-as-is fallback is disabled (MCP_ALLOW_COPY_FALLBACK=0)"
        return
    fi
    if cp "$src" "$dst"; then
        if [[ -s "$dst" ]]; then
            if MCP_REDACTED_COUNT=$(redact_secrets_in_file "$dst"); then
                CONV_RESULT="copied"
                CONV_DETAIL="MCP config copied as-is (source/target format not directly compatible, manual root key adjustment ${src_key:-?} -> ${dst_key:-?} needed); literal credentials cleared and supported environment references preserved"
            else
                MCP_REDACTED_COUNT=0
                CONV_RESULT="failed"
                CONV_DETAIL="MCP config redaction failed, target file deleted to prevent secret leak (source file untouched)"
            fi
        else
            CONV_RESULT="failed"
            CONV_DETAIL="MCP config empty after copy"
        fi
    else
        CONV_RESULT="failed"
        CONV_DETAIL="MCP config copy failed"
    fi
}

inspect_mcp_source_file() {
    local src="$1" src_key="$2"

    if ! command -v python3 >/dev/null 2>&1; then
        echo "  [FAIL] cannot validate MCP source without python3: $src" >&2
        return 1
    fi

    python3 - "$src" "$src_key" <<'PYEOF'
import json, re, sys

src, root_key = sys.argv[1], sys.argv[2]

def strip_jsonc(text):
    out = []
    i = 0
    in_string = escaped = line_comment = block_comment = False
    while i < len(text):
        ch = text[i]
        nxt = text[i + 1] if i + 1 < len(text) else ""
        if line_comment:
            if ch in "\r\n":
                line_comment = False
                out.append(ch)
            i += 1
            continue
        if block_comment:
            if ch == "*" and nxt == "/":
                block_comment = False
                i += 2
                continue
            if ch in "\r\n":
                out.append(ch)
            i += 1
            continue
        if in_string:
            out.append(ch)
            if escaped:
                escaped = False
            elif ch == "\\":
                escaped = True
            elif ch == '"':
                in_string = False
            i += 1
            continue
        if ch == '"':
            in_string = True
            out.append(ch)
            i += 1
        elif ch == "/" and nxt == "/":
            line_comment = True
            i += 2
        elif ch == "/" and nxt == "*":
            block_comment = True
            i += 2
        else:
            out.append(ch)
            i += 1
    text = "".join(out)
    out = []
    i = 0
    in_string = escaped = False
    while i < len(text):
        ch = text[i]
        if in_string:
            out.append(ch)
            if escaped:
                escaped = False
            elif ch == "\\":
                escaped = True
            elif ch == '"':
                in_string = False
            i += 1
            continue
        if ch == '"':
            in_string = True
            out.append(ch)
            i += 1
            continue
        if ch == ",":
            j = i + 1
            while j < len(text) and text[j].isspace():
                j += 1
            if j < len(text) and text[j] in "]}":
                i += 1
                continue
        out.append(ch)
        i += 1
    return "".join(out)

def read_path(node, dotted):
    for part in filter(None, dotted.split(".")):
        if not isinstance(node, dict):
            return None
        node = node.get(part)
    return node

try:
    with open(src, encoding="utf-8") as handle:
        document = json.loads(strip_jsonc(handle.read()))
except (OSError, UnicodeError, json.JSONDecodeError) as exc:
    print(f"  [FAIL] MCP source is not readable JSON/JSONC: {exc}", file=sys.stderr)
    sys.exit(1)

servers = read_path(document, root_key)
if not isinstance(servers, dict) or not servers:
    print(
        f"  [FAIL] MCP source has no non-empty object at root key {root_key or '<document>'}",
        file=sys.stderr,
    )
    sys.exit(1)

if not all(isinstance(name, str) and name and isinstance(server, dict) for name, server in servers.items()):
    print("  [FAIL] MCP source server map contains an invalid name or entry", file=sys.stderr)
    sys.exit(1)

for name, server in servers.items():
    has_command = isinstance(server.get("command"), (str, list)) and bool(server.get("command"))
    url_endpoints = [
        key for key in ("url", "serverUrl", "httpUrl")
        if isinstance(server.get(key), str) and bool(server.get(key))
    ]
    if int(has_command) + len(url_endpoints) != 1:
        print(
            f"  [FAIL] MCP source entry {name!r} must declare exactly one command or url endpoint",
            file=sys.stderr,
        )
        sys.exit(1)

print(f"  validated MCP source: {len(servers)} server entries at root key {root_key or '<document>'}")
PYEOF
}

REDACTOR_PY=""
ensure_redactor_script() {
    if [[ -n "${REDACTOR_PY:-}" && -f "${REDACTOR_PY:-}" ]]; then
        return 0
    fi
    REDACTOR_PY=$(mktemp "${TMPDIR:-/tmp}/redact-engine.XXXXXX") || return 1
    cat >"$REDACTOR_PY" <<'PYEOF'
import os, re, sys
from urllib.parse import parse_qsl, urlsplit

SECRET_KEY_RE = re.compile(r"(?i)(api[_-]?key|token|secret|password|passwd|authorization|auth|bearer|private[_-]?key|access[_-]?key|client[_-]?secret|session|cookie)")
URL_CRED_RE = re.compile(r"^(?:https?|postgres|postgresql|mysql|mongodb|mongodb\+srv|redis|ftp|amqp|sqlserver)://[^:@/\s]+:[^@/\s]+@", re.IGNORECASE)
URL_TOKEN_RE = re.compile(r"^(https?://)[^/\s]*:(//)?[A-Za-z0-9_\-]{16,}", re.IGNORECASE)
QUERY_CRED_RE = re.compile(r"[?&](key|token|secret|access[_-]?token|api[_-]?key)=[A-Za-z0-9_\-]{12,}", re.IGNORECASE)
PROVIDER_SECRET_RE = re.compile(r"(?:sk-[A-Za-z0-9_-]{16,}|gh[pousr]_[A-Za-z0-9]{20,}|tvly-[A-Za-z0-9_-]{16,}|AKIA[0-9A-Z]{16}|ASIA[0-9A-Z]{16}|xox[baprs]-[A-Za-z0-9-]{10,}|ya29\.[A-Za-z0-9_-]+|AIza[0-9A-Za-z_-]{35}|sk_live_[A-Za-z0-9]{16,})")
SAFE_ENV_REF_TOKEN = r"(?:\$\{env:[A-Za-z_][A-Za-z0-9_]*\}|\$\{[A-Za-z_][A-Za-z0-9_]*\}|\{env:[A-Za-z_][A-Za-z0-9_]*\})"
SAFE_ENV_REF_RE = re.compile(SAFE_ENV_REF_TOKEN)
SAFE_ENV_REF_FULL_RE = re.compile(r"^" + SAFE_ENV_REF_TOKEN + r"$")
SAFE_BEARER_REF_RE = re.compile(r"^Bearer\s+" + SAFE_ENV_REF_TOKEN + r"$", re.IGNORECASE)
SHORT_SECRET_FLAGS = {"-p", "-t", "-k"}
FLAG_RE = re.compile(r"^--?[A-Za-z0-9_\-]+$")
FLAG_EQ_RE = re.compile(r"^(--?[A-Za-z0-9_\-]+)=(.+)$")

def is_safe_reference_value(value):
    if not isinstance(value, str):
        return False
    if SAFE_ENV_REF_FULL_RE.fullmatch(value) or SAFE_BEARER_REF_RE.fullmatch(value):
        return True
    if not value.lower().startswith(("http://", "https://")) or not SAFE_ENV_REF_RE.search(value):
        return False
    if PROVIDER_SECRET_RE.search(value) or URL_CRED_RE.match(value) or URL_TOKEN_RE.match(value):
        return False
    try:
        parsed = urlsplit(value)
    except ValueError:
        return False
    if parsed.username or parsed.password:
        return False
    credential_params = [
        param_value
        for key, param_value in parse_qsl(parsed.query, keep_blank_values=True)
        if SECRET_KEY_RE.search(key)
    ]
    return bool(credential_params) and all(SAFE_ENV_REF_FULL_RE.fullmatch(item) for item in credential_params)

def is_secret_value(val):
    if not isinstance(val, str):
        return False
    if is_safe_reference_value(val):
        return False
    if PROVIDER_SECRET_RE.search(val):
        return True
    if URL_CRED_RE.match(val) or URL_TOKEN_RE.match(val):
        return True
    if QUERY_CRED_RE.search(val):
        return True
    if SECRET_KEY_RE.search(val) and ' ' not in val:
        return True
    return False

def is_secret_key(key):
    return bool(SECRET_KEY_RE.search(key or ""))

def is_secret_flag(tok):
    if tok in SHORT_SECRET_FLAGS:
        return True
    return bool(FLAG_RE.match(tok) and SECRET_KEY_RE.search(tok))

def blank_all_quoted(text, preserve_safe_refs=False):
    n = [0]
    def repl(m):
        if preserve_safe_refs and is_safe_reference_value(m.group(1)):
            return m.group(0)
        n[0] += 1
        return '""'
    new = re.sub(r'["\']([^"\']+)["\']', repl, text)
    return new, n[0]

def redact_one(file):
    TMP = file + ".redact.tmp"
    count = 0
    out = []
    secret_array_depth = 0
    flag_pending = False

    def redact_kv(m):
        nonlocal count
        k = m.group(1).strip().rstrip(":").strip('"\'')
        value = m.group(2)
        if (is_secret_key(k) and not is_safe_reference_value(value)) or is_secret_value(value):
            count += 1
            return '%s""' % m.group(1)
        return m.group(0)

    with open(file) as f:
        raw_lines = f.readlines()

    for raw in raw_lines:
        line = raw.rstrip("\n")
        if secret_array_depth > 0:
            secret_array_depth += line.count("[") - line.count("]")
            stripped = line.strip()
            if stripped and not stripped.startswith(("]", "}")):
                new_line, n = blank_all_quoted(line)
                if n:
                    line = new_line
                    count += n
            out.append(line + "\n")
            continue
        ym = re.match(r'^\s*-\s+(.*\S)\s*$', line)
        if ym:
            item = ym.group(1)
            km = re.match(r'["\']?([A-Za-z0-9_.\-]+)["\']?\s*[:=]\s*(.*)$', item)
            if km:
                flag_pending = False  # a keyed list line ends any pending pair
                key, rest = km.group(1), km.group(2).strip()
                if is_secret_key(key):
                    if rest == "[":
                        secret_array_depth = 1
                    elif rest.startswith("["):
                        new_rest, n = blank_all_quoted(rest, preserve_safe_refs=True)
                        line = line[:line.index("[")] + new_rest
                        count += n
                    elif rest.startswith("{") or rest == "":
                        pass
                    else:
                        qm = re.match(r'^["\'](.*)["\']\s*,?\s*$', rest)
                        if qm:
                            if qm.group(1) and not is_safe_reference_value(qm.group(1)):
                                line = re.sub(r'([:=]\s*)["\'].*?["\'](\s*,?\s*)$', r'\1""\2', line)
                                count += 1
                        elif not rest.startswith(('"', "'")):
                            line = re.sub(r'[:=]\s*\S.*?(\s*,?\s*)$', r': ""\1', line)
                            count += 1
                out.append(line + "\n")
                continue
            if flag_pending:
                if FLAG_RE.match(item):
                    flag_pending = is_secret_flag(item)
                    out.append(line + "\n")
                    continue
                if not is_safe_reference_value(item):
                    idx = line.rfind(item)
                    if idx != -1:
                        line = line[:idx] + '""'
                        count += 1
                flag_pending = False
                out.append(line + "\n")
                continue
            if "=" in item:
                eqm = FLAG_EQ_RE.match(item)
                if eqm and (SECRET_KEY_RE.search(eqm.group(1)) or eqm.group(1) in SHORT_SECRET_FLAGS):
                    idx = line.rfind(item)
                    if idx != -1:
                        line = line[:idx] + eqm.group(1) + "="
                        count += 1
                    out.append(line + "\n")
                    continue
            elif is_secret_flag(item):
                flag_pending = True
                out.append(line + "\n")
                continue
        line = re.sub(r'("?[A-Za-z0-9_.\-]+"?\s*:\s*)"([^"]*)"', redact_kv, line)
        m = re.match(r'^\s*(?:export\s+)?["\']?([A-Za-z0-9_.\-]+)["\']?\s*[:=]\s*(.*)$', line)
        if m:
            key, rest = m.group(1), m.group(2).strip()
            key_secret = bool(SECRET_KEY_RE.search(key))
            flag_pending = False  # a fresh keyed line ends any pending argv pair
            if rest == "[":
                if key_secret:
                    secret_array_depth = 1
                out.append(line + "\n")
                continue
            if rest.startswith("["):
                if key_secret:
                    new_rest, n = blank_all_quoted(rest, preserve_safe_refs=True)
                    prefix = re.match(r'^(\s*["\']?[A-Za-z0-9_.\-]+["\']?\s*[:=]\s*)', raw.rstrip("\n")).group(1)
                    line = prefix + new_rest
                    count += n
                else:
                    elems = re.findall(r'["\'](.*?)["\']', rest)
                    blank_next = False
                    changed = False
                    new_elems = []
                    for e in elems:
                        if blank_next:
                            if is_safe_reference_value(e):
                                new_elems.append(e)
                            else:
                                new_elems.append("")
                                count += 1
                                changed = True
                            blank_next = False
                        elif FLAG_EQ_RE.match(e) and (SECRET_KEY_RE.search(FLAG_EQ_RE.match(e).group(1)) or FLAG_EQ_RE.match(e).group(1) in SHORT_SECRET_FLAGS):
                            new_elems.append(FLAG_EQ_RE.match(e).group(1) + "=")
                            count += 1
                            changed = True
                        elif e in SHORT_SECRET_FLAGS:
                            new_elems.append(e)
                            blank_next = True
                        elif FLAG_RE.match(e) and SECRET_KEY_RE.search(e):
                            new_elems.append(e)
                            blank_next = True
                        else:
                            new_elems.append(e)
                    if changed:
                        it = iter(new_elems)
                        new_rest = re.sub(r'["\'](.*?)["\']', lambda mm: '"%s"' % next(it, mm.group(0)), rest)
                        prefix = re.match(r'^(\s*["\']?[A-Za-z0-9_.\-]+["\']?\s*[:=]\s*)', raw.rstrip("\n")).group(1)
                        line = prefix + new_rest
                    if blank_next and not rest.rstrip().endswith("]"):
                        flag_pending = True
                out.append(line + "\n")
                continue
            if rest in ("{", ""):
                out.append(line + "\n")
                continue
            qm = re.match(r'^["\'](.*)["\']\s*,?\s*$', rest)
            if qm:
                val = qm.group(1)
                if val and ((key_secret and not is_safe_reference_value(val)) or is_secret_value(val)):
                    line = re.sub(r'([:=]\s*)["\'].*?["\'](\s*,?\s*)$', r'\1""\2', line)
                    count += 1
            else:
                bare = rest.rstrip(',').strip()
                if bare and not bare.startswith(('"', "'")) and ((key_secret and not is_safe_reference_value(bare)) or is_secret_value(bare)):
                    line = re.sub(r'[:=]\s*\S.*?(\s*,?\s*)$', r': ""\1', line)
                    count += 1
        if not line.strip().startswith("[") and not m:
            stripped = line.strip()
            if flag_pending:
                mnext = re.match(r'^["\']?(--?[A-Za-z0-9_\-]+)["\']?,?\s*$', stripped)
                if mnext and FLAG_RE.match(mnext.group(1)):
                    flag_pending = is_secret_flag(mnext.group(1))
                else:
                    new_line, n = blank_all_quoted(line, preserve_safe_refs=True)
                    if n:
                        line = new_line
                        count += n
                    else:
                        if stripped and not stripped.startswith(('"', "'")):
                            line = re.sub(r'\S.*$', '""', line)
                            count += 1
                    flag_pending = False
            else:
                mflag = re.match(r'^["\'](--?[A-Za-z0-9_\-]+)["\']?,?\s*$', stripped)
                if mflag and is_secret_flag(mflag.group(1)) and "=" not in mflag.group(1):
                    flag_pending = True
        out.append(line + "\n")

    with open(TMP, "w") as f:
        f.writelines(out)
    os.replace(TMP, file)
    return count

total = 0
failed = 0
for _f in sys.argv[1:]:
    try:
        total += redact_one(_f)
    except BaseException:
        for _p in (_f + ".redact.tmp", _f):
            try:
                os.unlink(_p)
            except OSError:
                pass
        failed += 1
print(total, flush=True)
sys.exit(4 if failed else 0)
PYEOF
}

remove_failed_redaction_artifact() {
    local expected_target="$1"
    local candidate="$2"
    local expected_parent candidate_parent

    case "$expected_target" in
        /*) ;;
        *)
            echo "  [GUARD] refused redaction cleanup: expected target is not absolute '$expected_target'" >&2
            return 1
            ;;
    esac
    case "$candidate" in
        "$expected_target"|"${expected_target}.redact.tmp") ;;
        *)
            echo "  [GUARD] refused redaction cleanup outside the exact target artifacts: $candidate" >&2
            return 1
            ;;
    esac
    if [[ -L "$candidate" ]]; then
        echo "  [GUARD] refused redaction cleanup of symbolic link: $candidate" >&2
        return 1
    fi
    [[ -e "$candidate" ]] || return 0
    [[ -f "$candidate" ]] || {
        echo "  [GUARD] refused redaction cleanup of non-file target: $candidate" >&2
        return 1
    }

    expected_parent="$(cd "$(dirname "$expected_target")" 2>/dev/null && pwd -P)" || return 1
    candidate_parent="$(cd "$(dirname "$candidate")" 2>/dev/null && pwd -P)" || return 1
    [[ "$candidate_parent" == "$expected_parent" ]] || {
        echo "  [GUARD] refused redaction cleanup outside target parent: $candidate" >&2
        return 1
    }

    unlink "$candidate"
}

remove_files_within_copy_root() {
    local copy_root="$1"
    shift
    local candidate failed=0

    [[ -d "$copy_root" && ! -L "$copy_root" ]] || {
        echo "  [GUARD] refused copy cleanup: invalid target copy root '$copy_root'" >&2
        return 1
    }
    for candidate in "$@"; do
        if [[ -d "$candidate" && ! -L "$candidate" ]]; then
            echo "  [GUARD] refused copy cleanup of directory: $candidate" >&2
            failed=1
            continue
        fi
        safe_remove_path_within "$copy_root" "$candidate" || failed=1
    done
    return $failed
}

redact_secrets_in_file() {
    local file="$1"
    [[ -f "$file" ]] || { echo 0; return 0; }
    if ! command -v python3 >/dev/null 2>&1; then
        echo "  [SECURITY] python3 missing, cannot redact $file; target copy deleted to prevent secret leak (source file untouched)" >&2
        remove_failed_redaction_artifact "$file" "$file" || true
        echo 0
        return 1
    fi
    if ! ensure_redactor_script; then
        echo "  [SECURITY] cannot generate redaction engine, target copy deleted to prevent secret leak (source file untouched): $file" >&2
        remove_failed_redaction_artifact "$file" "$file" || true
        echo 0
        return 1
    fi
    local n rc=0 pyout
    pyout=$(mktemp "${TMPDIR:-/tmp}/redact-out.XXXXXX")
    python3 "$REDACTOR_PY" "$file" >"$pyout" || rc=$?
    n=$(cat "$pyout" 2>/dev/null || echo "-1")
    rm -f "$pyout"
    if [[ $rc -ne 0 || -z "$n" || "$n" == "-1" ]]; then
        remove_failed_redaction_artifact "$file" "$file" || true
        remove_failed_redaction_artifact "$file" "${file}.redact.tmp" || true
        echo "  [SECURITY] secret redaction failed, target file deleted to prevent leak (source file untouched): $file" >&2
        echo "-1"
        return 1
    fi
    echo "$n"
    return 0
}

redact_skill_copy() {
    local root="$1"
    local total=0 had_fail=0 f rc=0 pyout
    local -a excluded_env_files=()
    local -a files=()

    while IFS= read -r -d '' f; do
        excluded_env_files+=("$f")
    done < <(find "$root" \( -type f -o -type l \) -name '.env*' -print0 2>/dev/null)
    if [[ ${#excluded_env_files[@]} -gt 0 ]]; then
        remove_files_within_copy_root "$root" "${excluded_env_files[@]}" || had_fail=1
        echo "  [SECURITY] excluded ${#excluded_env_files[@]} .env file(s) from migrated copy" >&2
    fi

    while IFS= read -r -d '' f; do
        files+=("$f")
    done < <(find "$root" -name '*.bak.*' -prune -o -type f \( \
        -name '*.json' -o -name '*.jsonc' -o -name '*.yaml' -o -name '*.yml' \
        -o -name '*.toml' \
        -o -name '*.sh' -o -name '*.bash' -o -name '*.zsh' \) -print0 2>/dev/null)

    if [[ ${#files[@]} -eq 0 ]]; then
        echo 0
        return $had_fail
    fi

    if ! command -v python3 >/dev/null 2>&1; then
        echo "  [SECURITY] python3 missing, cannot redact skill copy; candidate files deleted to prevent secret leak (source directory untouched)" >&2
        remove_files_within_copy_root "$root" "${files[@]}" || true
        echo 0
        return 1
    fi
    if ! ensure_redactor_script; then
        echo "  [SECURITY] cannot generate redaction engine; candidate files deleted to prevent secret leak (source directory untouched)" >&2
        remove_files_within_copy_root "$root" "${files[@]}" || true
        echo 0
        return 1
    fi

    pyout=$(mktemp "${TMPDIR:-/tmp}/redact-out.XXXXXX")
    python3 "$REDACTOR_PY" "${files[@]}" >"$pyout" || rc=$?
    total=$(cat "$pyout" 2>/dev/null || echo "-1")
    rm -f "$pyout"
    if [[ $rc -ne 0 || -z "$total" || "$total" == "-1" ]]; then
        had_fail=1
        echo "  [SECURITY] skill copy redaction has failures; failed files were deleted by the redactor (source directory untouched)" >&2
        [[ "$total" == "-1" || -z "$total" ]] && total=0
    fi
    echo "$total"
    return $had_fail
}

migrate_mcp() {
    local source_ide="$1"
    local target_ide="$2"
    local scope="${3:-global}"
    local scope_label="global/user"
    local source_sha256_before=""
    local evidence_backup_path=""
    [[ "$scope" == "project" ]] && scope_label="project"

    MIGRATION_TOTAL=$((MIGRATION_TOTAL + 1))

    if [[ "$source_ide" == "goose-cli" || "$target_ide" == "goose-cli" ]]; then
        set_status "mcp" "manual"
        set_message "mcp" "Goose config.yaml uses YAML extensions; automatic MCP migration is unsupported"
        set_manual_step "mcp" "Goose: manually rebuild each extension under ~/.config/goose/config.yaml/extensions; preserve type (builtin/platform/stdio/streamable_http), cmd/args or uri/headers, enabled, and envs without copying secrets.yaml"
        MIGRATION_SKIPPED=$((MIGRATION_SKIPPED + 1))
        return 0
    fi

    if [[ "$source_ide" == "gemini-cli" || "$target_ide" == "gemini-cli" ]]; then
        set_manual_step "mcp" "Gemini CLI: selected ${scope_label} scope; review ~/.gemini/settings.json versus project .gemini/settings.json, preserve the mcpServers endpoint schema, and review project settings precedence"
    fi

    if [[ "$source_ide" == "opencode" || "$target_ide" == "opencode" ]]; then
        set_manual_step "mcp" "OpenCode: selected ${scope_label} scope and ${OPENCODE_VERSION} target schema; review ~/.config/opencode/opencode.json versus project opencode.json, JSONC files, merged precedence, OAuth/keychain state, and agent-specific MCP permissions manually"
    fi

    if [[ "$source_ide" == "kimiai" || "$target_ide" == "kimiai" ]]; then
        set_manual_step "mcp" "Kimi Code: selected ${scope_label} scope; review ~/.kimi-code/mcp.json versus project .kimi-code/mcp.json and KIMI_CODE_HOME precedence manually"
    fi

    if [[ "$source_ide" == "workbuddy" || "$target_ide" == "workbuddy" ]]; then
        set_manual_step "mcp" "WorkBuddy: selected ${scope_label} scope; the official files are ~/.workbuddy/mcp.json and project .workbuddy/mcp.json. Review the merged mcpServers map in 插件 → MCP 服务器 → 配置 MCP, keep only local command/args/env for automatic conversion, and configure remote URL/OAuth/headers plus enablement in the UI"
    fi

    if [[ "$source_ide" == "kiro" || "$target_ide" == "kiro" ]]; then
        set_manual_step "mcp" "Kiro: selected ${scope_label} scope; review ~/.kiro/settings/mcp.json versus workspace .kiro/settings/mcp.json and Kiro CLI/IDE scope manually"
    fi

    if [[ "$source_ide" == "augment-code" || "$target_ide" == "augment-code" ]]; then
        set_manual_step "mcp" "Augment: selected ${scope_label} scope; review ~/.augment/settings.json, .augment/settings.json/.augment/settings.local.json precedence, and credentials manually"
    fi

    if [[ "$source_ide" == "baidu-comate" || "$target_ide" == "baidu-comate" ]]; then
        set_manual_step "mcp" "Comate: selected ${scope_label} scope; review ~/.comate/mcp.json, .comate/mcp.json, and experimental .comate/mcp.local.json precedence manually"
    fi

    if [[ "$source_ide" == "zcode" || "$target_ide" == "zcode" ]]; then
        set_manual_step "mcp" "ZCode: selected ${scope_label} scope; review ~/.zcode/cli/config.json or workspace .zcode/config.json (root mcp.servers), or use Settings → MCP Servers → Import to select external Claude/Codex/OpenCode/.agents servers. The mapper leaves source files untouched and does not guess .agents precedence"
    fi

    if [[ "$source_ide" == "trae" || "$target_ide" == "trae" ||
          "$source_ide" == "trae-cn" || "$target_ide" == "trae-cn" ]]; then
        if [[ "$scope" == "project" ]]; then
            set_manual_step "mcp" "TRAE: project MCP is .trae/mcp.json with root mcpServers; review command/args/env, URL/headers, workspace variables, and enablement after the narrow merge. Global MCP is configured through the IDE Settings → MCP Servers/raw JSON UI"
        else
            set_status "mcp" "manual"
            set_message "mcp" "TRAE global MCP has an official settings/raw-JSON method but no stable published filesystem path"
            set_manual_step "mcp" "TRAE: open Settings → MCP Servers (or the MCP settings/raw JSON editor), recreate or import the global mcpServers entries there, and review enablement/credentials. Project scope is the documented .trae/mcp.json file; do not infer ~/.trae/mcp.json or ~/.trae-cn/mcp.json"
            MIGRATION_SKIPPED=$((MIGRATION_SKIPPED + 1))
            return 0
        fi
    fi

    if [[ "$source_ide" == "void-editor" || "$target_ide" == "void-editor" ]]; then
        set_manual_step "mcp" "Void is deprecated/archived: selected ${scope_label} scope uses legacy ~/.void-editor/mcp.json for the custom store, while inherited VS Code project .vscode/mcp.json uses servers. Automatic conversion is limited to local command/args/env or URL-only remote; headers/auth and migration to Kilo Code require manual review"
    fi

    if [[ "$source_ide" == "jetbrains" || "$target_ide" == "jetbrains" ]]; then
        set_manual_step "mcp" "Junie: selected ${scope_label} scope; review ~/.junie/mcp/mcp.json versus project .junie/mcp/mcp.json; automatic conversion accepts only the documented local command/args/env shape and leaves remote/unknown fields for review"
    fi

    if [[ "$source_ide" == "amazon-q" || "$target_ide" == "amazon-q" ]]; then
        local q_global_default="${HOME}/.aws/amazonq/default.json"
        local q_global_legacy="${HOME}/.aws/amazonq/mcp.json"
        local q_global_agent="${HOME}/.aws/amazonq/agents/default.json"
        local q_project_default="${WORKSPACE_ROOT}/.amazonq/default.json"
        local q_project_legacy="${WORKSPACE_ROOT}/.amazonq/mcp.json"
        local q_project_agent="${WORKSPACE_ROOT}/.amazonq/agents/default.json"

        if [[ "$scope" == "project" ]]; then
            if [[ -f "$q_project_agent" && ! -f "$q_project_default" && ! -f "$q_project_legacy" ]]; then
                set_status "mcp" "manual"
                set_message "mcp" "Amazon Q project agents/default.json is a custom-agent definition, not IDE MCP configuration"
                set_manual_step "mcp" "Amazon Q: .amazonq/agents/default.json belongs to the custom-agent profile and must not be treated as the IDE .amazonq/default.json MCP file. Choose the active Q profile, then configure its documented MCP surface without overwriting the agent definition"
                MIGRATION_SKIPPED=$((MIGRATION_SKIPPED + 1))
                return 0
            fi
        elif [[ -f "$q_global_agent" && ! -f "$q_global_default" && ! -f "$q_global_legacy" ]]; then
            set_status "mcp" "manual"
            set_message "mcp" "Amazon Q agents/default.json is a custom-agent definition, not IDE MCP configuration"
            set_manual_step "mcp" "Amazon Q: ~/.aws/amazonq/agents/default.json belongs to the custom-agent profile and must not be treated as the IDE ~/.aws/amazonq/default.json MCP file. Choose the active Q profile, then configure its documented MCP surface without overwriting the agent definition"
            MIGRATION_SKIPPED=$((MIGRATION_SKIPPED + 1))
            return 0
        fi

        set_manual_step "mcp" "Amazon Q: standard IDE MCP uses ~/.aws/amazonq/default.json and .amazonq/default.json; existing legacy mcp.json is retained only as a legacy source/target. Workspace configuration takes precedence. Review useLegacyMcpJson, permissions, OAuth, CLI agent files, and the Q panel tools icon after this narrow mcpServers merge"
    fi

    if [[ "$source_ide" == "blackbox" || "$target_ide" == "blackbox" ]]; then
        set_status "mcp" "manual"
        set_message "mcp" "Blackbox only documents built-in blackbox mcp command; no portable MCP file or server Schema"
        set_manual_step "mcp" "Blackbox: use official CLI/UI to configure manually; do not infer ~/.blackbox, .blackbox/mcp.json or mcpServers root key"
        MIGRATION_SKIPPED=$((MIGRATION_SKIPPED + 1))
        return 0
    fi

    if [[ "$source_ide" == "pieces" || "$target_ide" == "pieces" ]]; then
        set_status "mcp" "manual"
        set_message "mcp" "Pieces is a PiecesOS-backed MCP server, not a file-backed MCP client"
        set_manual_step "mcp" "Pieces: keep PiecesOS running and enable LTM, then configure the consuming IDE with the current endpoint from PiecesOS/Desktop Settings → MCP or use pieces mcp setup; do not invent ~/.pieces/.pieces or copy a client MCP file into Pieces"
        MIGRATION_SKIPPED=$((MIGRATION_SKIPPED + 1))
        return 0
    fi

    if [[ "$source_ide" == "replit" || "$target_ide" == "replit" ]]; then
        set_status "mcp" "manual"
        set_message "mcp" "Replit MCP connections are cloud/UI-managed through Integrations; no local MCP file is migrated"
        set_manual_step "mcp" "Replit: manage MCP connections at replit.com/integrations or the Agent MCP settings pane; do not copy .replit/replit.nix or infer a local MCP file"
        MIGRATION_SKIPPED=$((MIGRATION_SKIPPED + 1))
        return 0
    fi

    if [[ "$source_ide" == "cody" || "$target_ide" == "cody" ]]; then
        set_status "mcp" "manual"
        set_message "mcp" "Cody MCP is configured through the cody.mcpServers extension setting/UI; standalone file migration is unsupported"
        set_manual_step "mcp" "Cody: enable the Enterprise agentic-context MCP feature, then review VS Code settings.json or JetBrains cody_settings.json and the Cody MCP Settings UI; only local MCP tools are supported"
        MIGRATION_SKIPPED=$((MIGRATION_SKIPPED + 1))
        return 0
    fi

    if [[ "$source_ide" == "supermaven" || "$target_ide" == "supermaven" ]]; then
        set_status "mcp" "manual"
        set_message "mcp" "Supermaven has no documented portable MCP file or server schema; automatic migration is unsupported"
        set_manual_step "mcp" "Supermaven: configure MCP, if needed, in the host editor's documented MCP surface; do not infer ~/.supermaven or .supermaven as an MCP file"
        MIGRATION_SKIPPED=$((MIGRATION_SKIPPED + 1))
        return 0
    fi

    if [[ "$source_ide" == "continue" || "$target_ide" == "continue" ]]; then
        set_status "mcp" "manual"
        set_message "mcp" "Continue uses YAML/array configuration; automatic MCP/config migration is unsupported"
        set_manual_step "mcp" "Review ~/.continue/config.yaml or .continue/mcpServers/*.yaml manually; preserve mcpServers as an array of named entries and migrate secrets through Continue's documented environment/secret references"
        MIGRATION_SKIPPED=$((MIGRATION_SKIPPED + 1))
        return 0
    fi

    if [[ "$source_ide" == "roo-code" || "$target_ide" == "roo-code" ]]; then
        if [[ "$scope" != "project" ]]; then
            set_status "mcp" "manual"
            set_message "mcp" "Roo Code global MCP is extension-storage/UI managed; no stable official filesystem path is published"
            set_manual_step "mcp" "Roo Code: configure global MCP through the Roo MCP settings UI; do not infer a VS Code globalStorage or Cline path. Project MCP is separately documented at .roo/mcp.json"
            MIGRATION_SKIPPED=$((MIGRATION_SKIPPED + 1))
            return 0
        fi
        set_manual_step "mcp" "Roo Code: project scope uses .roo/mcp.json with root mcpServers; review mode permissions, remote headers/auth, and extension behavior after the narrow JSON merge. Global MCP remains UI-managed"
    fi

    if [[ "$source_ide" == "cline" || "$target_ide" == "cline" ]]; then
        if [[ "$scope" != "project" ]]; then
            local cline_primary
            cline_primary="$(get_mcp_path cline)"
            local cline_alternative="${HOME}/.cline/mcp.json"
            if [[ -z "${CLINE_MCP_PATH:-}" && -f "$cline_primary" && -f "$cline_alternative" ]]; then
                set_status "mcp" "manual"
                set_message "mcp" "Cline has both the current data/settings MCP file and a legacy ~/.cline/mcp.json alternative; the active store is ambiguous"
                set_manual_step "mcp" "Cline: use ~/.cline/data/settings/cline_mcp_settings.json, or set CLINE_DATA_DIR to replace ~/.cline/data. Treat ~/.cline/mcp.json only as a reviewed legacy candidate; CLINE_MCP_PATH remains a compatibility override. The project file is .cline/mcp.json"
                MIGRATION_SKIPPED=$((MIGRATION_SKIPPED + 1))
                return 0
            fi
            set_manual_step "mcp" "Cline: global MCP writes to ~/.cline/data/settings/cline_mcp_settings.json. CLINE_DATA_DIR replaces ~/.cline/data; a legacy ~/.cline/mcp.json candidate or CLINE_MCP_PATH override requires explicit review. Verify with the Cline MCP panel or 'cline mcp'. Project MCP is .cline/mcp.json"
        else
            set_manual_step "mcp" "Cline: project MCP is .cline/mcp.json with mcpServers; review IDE/CLI precedence and validate with the Cline MCP panel or cline mcp after the narrow merge"
        fi
    fi

    if [[ "$source_ide" == "claude-desktop" || "$target_ide" == "claude-desktop" ]]; then
        if [[ -z "$(get_mcp_path claude-desktop)" ]]; then
            set_status "mcp" "manual"
            set_message "mcp" "Claude Desktop has no confirmed legacy JSON path on this platform"
            set_manual_step "mcp" "Claude Desktop: on macOS use ~/Library/Application Support/Claude/claude_desktop_config.json; on native Windows use %APPDATA%\\Claude\\claude_desktop_config.json but do not guess MSIX virtualized paths; on Linux use Settings → Extensions or verify the current Developer path manually. For all platforms, install .mcpb through Settings → Extensions → Advanced settings → Install Extension; configure remote MCP through Settings → Connectors. Claude Code can import supported Desktop entries with claude mcp add-from-claude-desktop on macOS/WSL."
            MIGRATION_SKIPPED=$((MIGRATION_SKIPPED + 1))
            return 0
        fi
        set_manual_step "mcp" "Claude Desktop legacy local MCP JSON is migrated only at the documented platform path; install modern local servers as .mcpb via Settings → Extensions → Advanced settings → Install Extension, and configure remote MCP via Settings → Connectors. Claude Code's official claude mcp add-from-claude-desktop remains the supported interactive import on macOS/WSL."
    fi

    local source_mcp
    local target_mcp
    if [[ "$scope" == "project" ]]; then
        source_mcp=$(get_project_mcp_path "$source_ide")
        target_mcp=$(get_project_mcp_path "$target_ide")
    else
        source_mcp=$(get_mcp_path "$source_ide")
        target_mcp=$(get_mcp_path "$target_ide")
    fi

    if [[ -n "${SOURCE_MCP_FILE:-}" ]]; then
        source_mcp="$SOURCE_MCP_FILE"
        set_manual_step "mcp" "explicit MCP source override: validate '$source_mcp' against the declared $source_ide schema; only the source location is overridden, while the target remains registry-resolved"
    fi

    if [[ "$scope" != "project" && -z "$source_mcp" && "$source_ide" == "vscode" ]]; then
        set_status "mcp" "manual"
        set_message "mcp" "VS Code user MCP is profile-managed; no absolute path was guessed"
        set_manual_step "mcp" "VS Code: use MCP: Open User Configuration or MCP: Add Server in the active Profile; code --add-mcp is also documented. For a workspace use .vscode/mcp.json with root servers. Do not use GitHub Copilot CLI ~/.copilot/mcp-config.json or its mcpServers root as a VS Code file"
        MIGRATION_SKIPPED=$((MIGRATION_SKIPPED + 1))
        return 0
    fi
    if [[ "$target_ide" == "vscode" && "$scope" == "project" ]]; then
        target_mcp="$WORKSPACE_ROOT/.vscode/mcp.json"
    fi

    if [[ -n "$source_mcp" && "$source_mcp" != /* && "$source_mcp" != [A-Za-z]:* && "$source_mcp" != "\\"* ]]; then
        source_mcp="$WORKSPACE_ROOT/$source_mcp"
    fi
    if [[ -n "$target_mcp" && "$target_mcp" != /* && "$target_mcp" != [A-Za-z]:* && "$target_mcp" != "\\"* ]]; then
        target_mcp="$WORKSPACE_ROOT/$target_mcp"
    fi

    if [[ -z "$source_mcp" ]]; then
        set_status "mcp" "skipped"
        set_message "mcp" "source IDE does not support MCP configuration"
        MIGRATION_SKIPPED=$((MIGRATION_SKIPPED + 1))
        return 0
    fi

    if [[ -z "$target_mcp" ]]; then
        set_status "mcp" "manual"
        set_message "mcp" "target IDE does not support MCP configuration, manual migration required"
        set_manual_step "mcp" "target IDE ($target_ide) does not support automatic MCP migration, please refer to IDE Registry to configure manually"
        MIGRATION_SKIPPED=$((MIGRATION_SKIPPED + 1))
        return 0
    fi

    local source_identity target_identity
    if command -v python3 >/dev/null 2>&1; then
        source_identity="$(python3 -c 'import os,sys; print(os.path.realpath(sys.argv[1]))' "$source_mcp")"
        target_identity="$(python3 -c 'import os,sys; print(os.path.realpath(sys.argv[1]))' "$target_mcp")"
    else
        source_identity="$(cd "$(dirname "$source_mcp")" 2>/dev/null && pwd -P)/$(basename "$source_mcp")"
        target_identity="$(cd "$(dirname "$target_mcp")" 2>/dev/null && pwd -P)/$(basename "$target_mcp")"
    fi
    if [[ "$source_identity" == "$target_identity" ]]; then
        set_status "mcp" "manual"
        set_message "mcp" "MCP source and target resolve to the same file; refusing to self-overwrite"
        set_manual_step "mcp" "MCP: source and target IDEs share '$source_mcp' on this workspace; pick a different target or relocate the source manually before retrying"
        MIGRATION_SKIPPED=$((MIGRATION_SKIPPED + 1))
        return 0
    fi
    if [[ -L "$target_mcp" ]]; then
        set_status "mcp" "failed"
        set_message "mcp" "MCP target is a symbolic link; refusing conversion or cleanup through an indirect path"
        set_manual_step "mcp" "MCP: replace the target symlink with a reviewed regular file at '$target_mcp', then preview again"
        MIGRATION_FAILED=$((MIGRATION_FAILED + 1))
        return 0
    fi

    if [[ "$scope" == "project" ]]; then
        set_manual_step "mcp" "project MCP: this run only processes explicit workspace file ${source_mcp} -> ${target_mcp}; review project priority, Workspace Trust, approval, OAuth/headers and same-name server conflicts"
    else
        set_manual_step "mcp" "user MCP: this run only processes user-level file; project MCP, local scope, Workspace Trust and UI/profile state still need manual review"
    fi

    if [[ "$source_ide" == "claude" || "$target_ide" == "claude" ]]; then
        set_manual_step "mcp" "Claude Code: selected ${scope_label} scope; review ~/.claude.json user/local entries, project .mcp.json, and local per-project entries manually"
    fi

    if [[ "$source_ide" == "tabnine" || "$target_ide" == "tabnine" ]]; then
        set_manual_step "mcp" "Tabnine: selected ${scope_label} scope; review ~/.tabnine/mcp_servers.json versus project .tabnine/mcp_servers.json and configure extension-managed permissions in Tabnine Settings manually"
    fi

    if [[ "$source_ide" == "tencent-codebuddy" || "$target_ide" == "tencent-codebuddy" ]]; then
        set_manual_step "mcp" "CodeBuddy Code: selected ${scope_label} scope; review ~/.codebuddy/.mcp.json, project .mcp.json, legacy ~/.codebuddy/mcp.json/~/.codebuddy.json, --mcp-config overrides, and .codebuddy/settings.json approval keys manually"
    fi

    if [[ "$source_ide" == "copilot" || "$target_ide" == "copilot" ]]; then
        set_manual_step "mcp" "GitHub Copilot CLI: selected ${scope_label} scope; review ~/.copilot/mcp-config.json and project .mcp.json/.github/mcp.json (both mcpServers) manually"
    fi

    print_progress "MIGRATE" "Migrating MCP server configuration..."

    if [[ ! -e "$source_mcp" ]]; then
        set_status "mcp" "absent"
        set_message "mcp" "source MCP config does not exist: $source_mcp"
        MIGRATION_SKIPPED=$((MIGRATION_SKIPPED + 1))
        return 0
    fi

    source_sha256_before="$(sha256_file "$source_identity" 2>/dev/null || true)"

    if [[ "$source_ide" == "codex" || "$target_ide" == "codex" ]]; then
        set_status "mcp" "manual"
        set_message "mcp" "Codex MCP config uses TOML; auto migration unsupported, manual migration required"
        set_manual_step "mcp" "rebuild servers using [mcp_servers.<server-name>] TOML table in Codex user ~/.codex/config.toml or trusted project .codex/config.toml; stdio uses command, Streamable HTTP uses url"
        MIGRATION_SKIPPED=$((MIGRATION_SKIPPED + 1))
        record_mcp_evidence "$scope" "$source_identity" "$target_identity" "$source_sha256_before"
        return 0
    fi

    local src_key dst_key
    src_key=$(get_mcp_root_key "$source_ide" "$scope")
    dst_key=$(get_mcp_root_key "$target_ide" "$scope")

    if [[ -n "${SOURCE_MCP_FILE:-}" ]]; then
        if ! inspect_mcp_source_file "$source_mcp" "$src_key"; then
            set_status "mcp" "failed"
            set_message "mcp" "explicit MCP source failed strict schema validation"
            MIGRATION_FAILED=$((MIGRATION_FAILED + 1))
            record_mcp_evidence "$scope" "$source_identity" "$target_identity" "$source_sha256_before"
            return 0
        fi
    fi

    if [[ $DRY_RUN -eq 1 ]]; then
        echo "  DRY-RUN: converting MCP config"
        echo "    source: $source_mcp (root key: ${src_key:-none})"
        echo "    target: $target_mcp (root key: ${dst_key:-none})"
        set_status "mcp" "skipped"
        set_message "mcp" "DRY-RUN: planned MCP config conversion (${src_key:-?} -> ${dst_key:-?})"
        record_mcp_evidence "$scope" "$source_identity" "$target_identity" "$source_sha256_before"
        return 0
    fi

    mkdir -p "$(dirname "$target_mcp")"

    if [[ -e "$target_mcp" ]]; then
        case "$STRATEGY" in
            skip)
                echo "  [SKIP] target MCP config already exists: $target_mcp"
                set_status "mcp" "skipped"
                set_message "mcp" "target MCP config already exists, skip (strategy: skip)"
                MIGRATION_SKIPPED=$((MIGRATION_SKIPPED + 1))
                record_mcp_evidence "$scope" "$source_identity" "$target_identity" "$source_sha256_before"
                return 0
                ;;
            backup)
                local ts
                ts="$(date +%Y%m%d%H%M%S).$$"
                cp -r "$target_mcp" "$target_mcp.bak.$ts"
                evidence_backup_path="$target_identity.bak.$ts"
                echo "  [BACKUP] backed up existing MCP config: $target_mcp.bak.$ts"
                ;;
            overwrite)
                ;;
        esac
    fi

    convert_mcp_file "$source_mcp" "$src_key" "$target_mcp" "$dst_key" "$target_ide" "$STRATEGY" "$OPENCODE_VERSION"

    case "$CONV_RESULT" in
        success)
            echo "  [OK] converted MCP config: ${src_key:-mcpServers} -> ${dst_key:-mcpServers}"
            if [[ ${MCP_REDACTED_COUNT:-0} -ne 0 ]]; then
            echo "  [SECURITY] literal credentials in MCP config were cleared; exact supported environment references were preserved or converted. Review target environment/secret-manager bindings before enabling."
            fi
            set_status "mcp" "success"
            set_message "mcp" "$CONV_DETAIL"
            MIGRATION_SUCCESS=$((MIGRATION_SUCCESS + 1))
            ;;
        copied)
            echo "  [COPY] copied MCP config as-is: $target_mcp"
            if [[ ${MCP_REDACTED_COUNT:-0} -ne 0 ]]; then
            echo "  [SECURITY] literal credentials in MCP config were cleared; exact supported environment references were preserved. Review target environment/secret-manager bindings before enabling."
            fi
            set_status "mcp" "copied"
            set_message "mcp" "$CONV_DETAIL"
            set_manual_step "mcp" "check MCP root key compatibility: ${src_key:-?} -> ${dst_key:-?}"
            MIGRATION_SUCCESS=$((MIGRATION_SUCCESS + 1))
            ;;
        failed)
            echo "  [FAIL] MCP config migration failed"
            set_status "mcp" "failed"
            set_message "mcp" "$CONV_DETAIL"
            MIGRATION_FAILED=$((MIGRATION_FAILED + 1))
            ;;
        *)
            echo "  [FAIL] MCP config migration unknown state"
            set_status "mcp" "failed"
        set_message "mcp" "MCP config migration failed (unknown state)"
            MIGRATION_FAILED=$((MIGRATION_FAILED + 1))
            ;;
    esac

    record_mcp_evidence "$scope" "$source_identity" "$target_identity" "$source_sha256_before" "$evidence_backup_path"
}

migrate_config() {
    local source_ide="$1"
    local target_ide="$2"

    MIGRATION_TOTAL=$((MIGRATION_TOTAL + 1))
    set_status "config" "manual"
    set_message "config" "automatic whole-IDE config migration is unsupported"
    set_manual_step "config" "Review only documented, object-specific settings for $source_ide -> $target_ide. Rebuild target config manually; do not copy opaque IDE config files, credentials, permissions, hooks, or trust state."
    MIGRATION_SKIPPED=$((MIGRATION_SKIPPED + 1))
}

migrate_project() {
    local source_ide="$1"
    local target_ide="$2"

    MIGRATION_TOTAL=$((MIGRATION_TOTAL + 1))
    set_status "project" "manual"
    set_message "project" "automatic whole-project configuration migration is unsupported"
    set_manual_step "project" "Review dedicated objects for $source_ide -> $target_ide (skills, rules, prompts, and project MCP) one at a time. Do not copy opaque project directories, credentials, permissions, hooks, or trust state."
    MIGRATION_SKIPPED=$((MIGRATION_SKIPPED + 1))
}

manual_only_object() {
    local object="$1"
    local source_ide="$2"
    local target_ide="$3"

    MIGRATION_TOTAL=$((MIGRATION_TOTAL + 1))
    case "$object" in
        agents)
            set_status "agents" "manual"
            set_message "agents" "Agents/Subagents are product-specific schema; currently diagnosis only, no auto conversion"
            set_manual_step "agents" "Agents ($source_ide -> $target_ide): review official surfaces like .github/agents, .claude/agents, .cursor/agents, .trae/agents, .kiro/agents, .codebuddy/agents, .zcode/agents separately; do not copy tools, permissions, hooks, handoffs or mcpServers fields across IDEs"
            ;;
        hooks)
            set_status "hooks" "manual"
            set_message "hooks" "Hooks execute commands and each IDE's events/schema/scope differ; cross-IDE auto migration has no safe strict intersection"
            set_manual_step "hooks" "Hooks ($source_ide -> $target_ide): review .github/hooks, .trae/hooks.json, .kiro/hooks/*, .windsurf/hooks.json, Codex hooks.json or settings hooks; do not auto-execute, copy or rewrite commands from one shell to another"
            ;;
        memory)
            set_status "memory" "manual"
            set_message "memory" "Memory is mostly local/cloud generated state, project identity encoding and schema are inconsistent; currently only listing manual handling boundaries"
            set_manual_step "memory" "Memory ($source_ide -> $target_ide): Trae/Claude/Codex/Windsurf generated memory, Replit replit.md, Amazon Q .amazonq/rules/memory-bank, Goose memory, CodeBuddy CODEBUDDY.md/Auto Memory, WorkBuddy UI/private memory need item-by-item review; copying entire memory directory is prohibited"
            ;;
        *)
            set_status "$object" "failed"
            set_message "$object" "unsupported manual object: $object"
            MIGRATION_FAILED=$((MIGRATION_FAILED + 1))
            ;;
    esac
    MIGRATION_SKIPPED=$((MIGRATION_SKIPPED + 1))
}

run_migration() {
    local source_ide="$1"
    local target_ide="$2"

    local OLD_IFS="$IFS"
    IFS=',' read -ra OBJECT_LIST <<< "$OBJECTS"
    IFS="$OLD_IFS"

    for obj in "${OBJECT_LIST[@]}"; do
        case "$obj" in
            skills)
                migrate_skills "$source_ide" "$target_ide" "$SCOPE"
                ;;
            rules)
                migrate_rules "$source_ide" "$target_ide"
                ;;
            prompts)
                migrate_prompts "$source_ide" "$target_ide"
                ;;
            mcp)
                if [[ "$SCOPE" == "both" ]]; then
                    migrate_mcp "$source_ide" "$target_ide" "global"
                    migrate_mcp "$source_ide" "$target_ide" "project"
                else
                    migrate_mcp "$source_ide" "$target_ide" "$SCOPE"
                fi
                ;;
            project-mcp)
                migrate_mcp "$source_ide" "$target_ide" "project"
                local project_mcp_status project_mcp_message project_mcp_steps project_mcp_step
                project_mcp_status=$(get_status "mcp")
                project_mcp_message=$(get_message "mcp")
                [[ -n "$project_mcp_status" ]] && set_status "project-mcp" "$project_mcp_status"
                [[ -n "$project_mcp_message" ]] && set_message "project-mcp" "$project_mcp_message"
                project_mcp_steps=$(get_manual_steps "mcp")
                if [[ -n "$project_mcp_steps" ]]; then
                    while IFS= read -r project_mcp_step; do
                        [[ -n "$project_mcp_step" ]] && set_manual_step "project-mcp" "$project_mcp_step"
                    done <<< "$project_mcp_steps"
                fi
                ;;
            agents|hooks|memory)
                manual_only_object "$obj" "$source_ide" "$target_ide"
                ;;
            config)
                migrate_config "$source_ide" "$target_ide"
                ;;
            project)
                migrate_project "$source_ide" "$target_ide"
                ;;
            *)
                echo "[WARN] unknown content type: $obj"
                ;;
        esac
    done
}

generate_report() {
    local source_ide="$1"
    local target_ide="$2"
    local report=""

    report+="========================================\n"
    report+="       IDE migration report
"
    report+="========================================\n"
    report+="\n"
    report+="Migration details:
"
    report+="  source IDE: $(get_ide_name "$source_ide") ($source_ide)
"
    report+="  target IDE: $(get_ide_name "$target_ide") ($target_ide)
"
    report+="  workspace: $WORKSPACE_ROOT
"
    report+="  strategy: $STRATEGY
"
    report+="  time: $(date '+%Y-%m-%dT%H:%M:%S%z')\n"  # portable (BSD date lacks -Iseconds)
    report+="\n"
    report+="Statistics:
"
    report+="  total operations: $MIGRATION_TOTAL
"
    report+="  succeeded: $MIGRATION_SUCCESS
"
    report+="  failed: $MIGRATION_FAILED
"
    report+="  skipped: $MIGRATION_SKIPPED
"
    report+="\n"
    report+="Detailed results:
"

    for obj in skills rules prompts mcp project-mcp config project agents hooks memory; do
        local status
        status=$(get_status "$obj")
        if [[ -n "$status" ]]; then
            local message
            message=$(get_message "$obj")
            local status_icon

            case "$status" in
                success) status_icon="OK" ;;
                copied)  status_icon="OK" ;;
                manual)  status_icon="WARN" ;;
                partial) status_icon="WARN" ;;
                failed)  status_icon="FAIL" ;;
                absent)  status_icon="-" ;;
                skipped) status_icon="-" ;;
                *)       status_icon="?" ;;
            esac

            report+="  [$status_icon] $obj: $message\n"
        fi
    done

    report+="\n"
    report+="Steps requiring manual handling:
"

    local has_manual=0
    for obj in skills rules prompts mcp project-mcp config project agents hooks memory; do
        local steps
        steps=$(get_manual_steps "$obj")
        if [[ -n "$steps" ]]; then
            has_manual=1
            report+="\n  [$obj]\n"
            report+="    $steps\n"
        fi
    done

    if [[ $has_manual -eq 0 ]]; then
        report+="  none - all migrations completed automatically
"
    fi

    report+="\n"
    report+="========================================\n"

    if [[ "${MIGRATE_JSON:-}" == "1" ]]; then
        _emit_json_report "$source_ide" "$target_ide"
    else
        # '%b' would reinterpret escape sequences embedded in content — on
        # Windows hosts report lines contain drive-letter paths whose back-
        # slash sequences (e.g. a capital U after a separator) abort bash
        # printf. Expand only the literal "\n" separators.
        printf '%s' "${report//\\n/$'\n'}"
    fi
}

_emit_json_report() {
    local source_ide="$1"
    local target_ide="$2"
    local entries=()
    local object_entries=()
    local requested_object

    for obj in skills rules prompts mcp project-mcp config project agents hooks memory; do
        local status message token steps
        status=$(get_status "$obj")
        [[ -n "$status" ]] || continue
        message=$(get_message "$obj")
        token=$(status_token "$status")
        entries+=("$(printf '{"object":"%s","status":"%s","token":"%s","message":"%s"}' \
            "$obj" "$status" "$token" "$(json_escape "$message")")")
        steps=$(get_manual_steps "$obj")
        if [[ -n "$steps" ]]; then
            entries+=("$(printf '{"object":"%s","status":"manual","token":"WARN","steps":"%s"}' \
                "$obj" "$(json_escape "$steps")")")
        fi
    done

    local entries_json
    entries_json=$(IFS=,; echo "${entries[*]}")
    while IFS= read -r requested_object; do
        [[ -n "$requested_object" ]] || continue
        object_entries+=("\"$(json_escape "$requested_object")\"")
    done < <(printf '%s\n' "$OBJECTS" | tr ',' '\n')
    local objects_json
    objects_json=$(IFS=,; echo "${object_entries[*]}")

    local report_scope="$SCOPE"
    if [[ ",$OBJECTS," == *",project-mcp,"* && ",$OBJECTS," != *",mcp,"* ]]; then
        report_scope="project"
    fi
    local report_mode="apply"
    [[ $DRY_RUN -eq 1 ]] && report_mode="dry-run"

    local evidence_json=""
    if [[ -s "$MIGRATION_EVIDENCE_FILE" ]]; then
        evidence_json="$(paste -sd, "$MIGRATION_EVIDENCE_FILE")"
    fi

    printf '{"source_ide":"%s","target_ide":"%s","mode":"%s","scope":"%s","objects":[%s],"workspace":"%s","strategy":"%s","opencode_version":"%s","statistics":{"total":%s,"succeeded":%s,"failed":%s,"skipped":%s},"results":[%s],"evidence":{"mcp":[%s]}}\n' \
        "$source_ide" "$target_ide" "$report_mode" "$report_scope" "$objects_json" "$(json_escape "$WORKSPACE_ROOT")" "$STRATEGY" "$OPENCODE_VERSION" \
        "$MIGRATION_TOTAL" "$MIGRATION_SUCCESS" "$MIGRATION_FAILED" "$MIGRATION_SKIPPED" \
        "$entries_json" "$evidence_json"
}


main() {
    trap cleanup_migration_files EXIT

    while [[ $# -gt 0 ]]; do
        case "$1" in
            --source)
                SOURCE_IDE="$2"
                shift 2
                ;;
            --target)
                TARGET_IDE="$2"
                shift 2
                ;;
            --workspace)
                WORKSPACE_ROOT="$2"
                WORKSPACE_EXPLICIT=1
                shift 2
                ;;
            --objects)
                OBJECTS="$2"
                shift 2
                ;;
            --source-mcp-file)
                if [[ $# -lt 2 || -z "${2:-}" ]]; then
                    echo "Error: --source-mcp-file requires a file path" >&2
                    exit 1
                fi
                SOURCE_MCP_FILE="$2"
                shift 2
                ;;
            --opencode-version)
                if [[ $# -lt 2 || -z "${2:-}" ]]; then
                    echo "Error: --opencode-version requires v1 or v2" >&2
                    exit 1
                fi
                OPENCODE_VERSION="$2"
                OPENCODE_VERSION_EXPLICIT=1
                shift 2
                ;;
            --scope)
                SCOPE="$2"
                shift 2
                ;;
            --strategy)
                STRATEGY="$2"
                shift 2
                ;;
            --report)
                REPORT_FILE="$2"
                shift 2
                ;;
            --dry-run)
                DRY_RUN=1
                shift
                ;;
            --json)
                MIGRATE_JSON=1
                shift
                ;;
            --yes|-y)
                ASSUME_YES=1
                shift
                ;;
            --print-path)
                PRINT_PATH_IDE="$2"
                PRINT_PATH_OBJECT="$3"
                shift 3
                ;;
            -h|--help)
                usage
                exit 0
                ;;
            *)
            echo "Error: unknown argument: $1" >&2
                usage >&2
                exit 1
                ;;
        esac
    done

    case "$STRATEGY" in
        skip|backup|overwrite)
            ;;
        *)
            echo "Error: invalid strategy: $STRATEGY (options: skip, backup, overwrite)" >&2
            exit 1
            ;;
    esac

    if [[ "${MIGRATE_JSON:-}" == "1" ]]; then
        exec 3>&1
        exec 1>&2
    fi

    if [[ -z "$PRINT_PATH_IDE" ]]; then
        print_header
    fi

    if [[ -n "$PRINT_PATH_IDE" ]]; then
        if ! validate_ide "$PRINT_PATH_IDE"; then
            echo "Error: invalid IDE: $PRINT_PATH_IDE" >&2
            echo "Supported IDEs: $SUPPORTED_IDES" >&2
            exit 1
        fi

        resolved=""
        case "$PRINT_PATH_OBJECT" in
            global)  resolved=$(get_global_path "$PRINT_PATH_IDE") ;;
            project) resolved=$(get_project_path "$PRINT_PATH_IDE") ;;
            project-skills) resolved=$(get_project_skills_path "$PRINT_PATH_IDE") ;;
            mcp)     resolved=$(get_mcp_path "$PRINT_PATH_IDE") ;;
            project-mcp) resolved=$(get_project_mcp_path "$PRINT_PATH_IDE") ;;
            project-config) resolved=$(get_project_config_file "$PRINT_PATH_IDE") ;;
            config)  resolved=$(get_config_file "$PRINT_PATH_IDE") ;;
            rules)   resolved=$(get_rules_file "$PRINT_PATH_IDE") ;;
            prompts|commands) resolved=$(get_prompts_path "$PRINT_PATH_IDE") ;;
            *)
            echo "Error: unsupported object: $PRINT_PATH_OBJECT (options: global, project, project-skills, mcp, project-mcp, project-config, config, rules, prompts|commands)" >&2
                exit 1
                ;;
        esac

        if [[ -z "$resolved" ]]; then
            echo "Error: $PRINT_PATH_IDE does not support object: $PRINT_PATH_OBJECT" >&2
            exit 1
        fi

        if [[ "$resolved" == "${HOME}/"* ]]; then
            resolved="~${resolved#"${HOME}"}"
        fi

        echo "$resolved"
        exit 0
    fi

    if [[ -z "$SOURCE_IDE" ]]; then
            echo "Error: source IDE must be specified (--source)" >&2
        echo "" >&2
            echo "Supported IDEs:" >&2
        for ide in $SUPPORTED_IDES; do
            printf "  - %-12s %s\n" "$ide" "$(get_ide_name "$ide")" >&2
        done
        exit 1
    fi

    if [[ -z "$TARGET_IDE" ]]; then
            echo "Error: target IDE must be specified (--target)" >&2
        echo "" >&2
            echo "Supported IDEs:" >&2
        for ide in $SUPPORTED_IDES; do
            printf "  - %-12s %s\n" "$ide" "$(get_ide_name "$ide")" >&2
        done
        exit 1
    fi

    if ! validate_ide "$SOURCE_IDE"; then
            echo "Error: invalid source IDE: $SOURCE_IDE" >&2
            echo "Supported IDEs: $SUPPORTED_IDES" >&2
        exit 1
    fi

    if ! validate_ide "$TARGET_IDE"; then
            echo "Error: invalid target IDE: $TARGET_IDE" >&2
            echo "Supported IDEs: $SUPPORTED_IDES" >&2
        exit 1
    fi

    case "$OPENCODE_VERSION" in
        v1|v2)
            ;;
        *)
            echo "Error: invalid OpenCode version: $OPENCODE_VERSION (options: v1, v2)" >&2
            exit 1
            ;;
    esac
    if [[ $OPENCODE_VERSION_EXPLICIT -eq 1 && "$TARGET_IDE" != "opencode" ]]; then
        echo "Error: --opencode-version applies only when --target opencode" >&2
        exit 1
    fi

    case "$SCOPE" in
        global|project|both)
            ;;
        *)
            echo "Error: invalid scope: ${SCOPE} (options: global, project, both)" >&2
            exit 1
            ;;
    esac

    if [[ "$SOURCE_IDE" == "$TARGET_IDE" ]]; then
            echo "Error: source IDE and target IDE cannot be the same" >&2
        exit 1
    fi

    if [[ "$TARGET_IDE" == "firebase-studio" ]]; then
        echo "Error: firebase-studio is a source-only migration ID because the product is shutting down; choose a maintained target" >&2
        exit 1
    fi

    if [[ -z "$OBJECTS" ]]; then
        if [[ "$SCOPE" == "global" ]]; then
            OBJECTS="skills"
            echo "No --objects specified: global migrations default to skills." >&2
        else
            if [[ $WORKSPACE_EXPLICIT -eq 0 ]]; then
                echo "Error: project scope requires an explicit --workspace path" >&2
                exit 1
            fi
            OBJECTS=$(list_available_objects "$SOURCE_IDE" | tr ',' '\n' | grep -E '^(skills|rules|prompts)$' | paste -sd, -)
            [[ -n "$OBJECTS" ]] || OBJECTS="skills,rules,prompts"
            echo "No --objects specified: project migrations default to skills,rules,prompts." >&2
        fi
    fi

    local requires_workspace=0
    case ",$OBJECTS," in
        *,rules,*|*,prompts,*|*,project,*|*,project-mcp,*)
            requires_workspace=1
            ;;
    esac
    if [[ "$SCOPE" != "global" && ",$OBJECTS," == *,skills,* ]]; then
        requires_workspace=1
    fi
    if [[ "$SCOPE" != "global" && ",$OBJECTS," == *,mcp,* ]]; then
        requires_workspace=1
    fi
    if [[ $requires_workspace -eq 1 && $WORKSPACE_EXPLICIT -eq 0 ]]; then
        echo "Error: the selected project-backed objects require an explicit --workspace path" >&2
        exit 1
    fi

    if [[ -n "$SOURCE_MCP_FILE" ]]; then
        if [[ "$OBJECTS" != *mcp* ]]; then
            echo "Error: --source-mcp-file requires --objects mcp or project-mcp" >&2
            exit 1
        fi
        if [[ "$SCOPE" == "both" ]]; then
            echo "Error: --source-mcp-file cannot represent both global and project MCP scopes; choose one scope" >&2
            exit 1
        fi
        if [[ ! -f "$SOURCE_MCP_FILE" || ! -r "$SOURCE_MCP_FILE" ]]; then
            echo "Error: --source-mcp-file must name a readable regular file: $SOURCE_MCP_FILE" >&2
            exit 1
        fi
        case "${SOURCE_MCP_FILE##*.}" in
            json|jsonc) ;;
            *)
                echo "Error: --source-mcp-file accepts JSON or JSONC only; YAML/TOML MCP formats require manual reconstruction" >&2
                exit 1
                ;;
        esac
        if ! command -v python3 >/dev/null 2>&1; then
            echo "Error: --source-mcp-file requires python3 for safe path and schema validation" >&2
            exit 1
        fi
        SOURCE_MCP_FILE="$(python3 -c 'import os,sys; print(os.path.realpath(sys.argv[1]))' "$SOURCE_MCP_FILE")"
    fi

    echo "========================================"
    echo "Migration summary"
    echo "========================================"
    echo ""
    echo "  source IDE: $(get_ide_name "$SOURCE_IDE")"
    echo "  target IDE: $(get_ide_name "$TARGET_IDE")"
    echo "  workspace: $WORKSPACE_ROOT"
    echo "  migration content: $OBJECTS"
    if [[ -n "$SOURCE_MCP_FILE" ]]; then
        echo "  explicit MCP source: $SOURCE_MCP_FILE"
    fi
    echo "  scope: $SCOPE (only applies to skills/mcp)"
    echo "  strategy: $STRATEGY"
    echo ""

    if [[ $DRY_RUN -eq 1 ]]; then
        echo "  mode: DRY-RUN (will not modify any files)"
    fi

    echo ""

    if [[ $DRY_RUN -eq 0 && $ASSUME_YES -eq 0 ]]; then
        echo "Error: --yes is required for writes; interactive confirmation is intentionally unsupported." >&2
        echo "Preview with --dry-run, obtain approval, then rerun the reviewed command with --yes. No files modified." >&2
        exit 2
    fi

    init_migration_files

    echo "[START] starting migration: $(get_ide_name "$SOURCE_IDE") -> $(get_ide_name "$TARGET_IDE")"
    echo ""

    run_migration "$SOURCE_IDE" "$TARGET_IDE"

    echo ""
    echo "========================================"
    echo "       migration complete"
    echo "========================================"
    echo ""

    if [[ "${MIGRATE_JSON:-}" == "1" ]]; then
        exec 1>&3
    fi

    report=$(generate_report "$SOURCE_IDE" "$TARGET_IDE")
    echo "$report"

    if [[ -n "$REPORT_FILE" ]]; then
        echo "$report" > "$REPORT_FILE"
        if [[ "${MIGRATE_JSON:-}" == "1" ]]; then
            echo "Report saved to: $REPORT_FILE" >&2
        else
            echo "Report saved to: $REPORT_FILE"
        fi
    fi

    if [[ -n "${SOURCE_MCP_FILE:-}" && $MIGRATION_FAILED -gt 0 ]]; then
        return 1
    fi
}

if [[ "${BASH_SOURCE[0]}" == "$0" ]]; then
    main "$@"
fi
