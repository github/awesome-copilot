#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

SOURCE_IDE=""
TARGET_IDE=""
WORKSPACE_ROOT="$(pwd)"
OBJECTS=""
STRATEGY="backup"
DRY_RUN=0
REPORT_FILE=""
PRINT_PATH_IDE=""
PRINT_PATH_OBJECT=""

SUPPORTED_IDES="antigravity claude codex copilot cursor windsurf jetbrains openclaw trae trae-cn vscode zed neovim emacs continue aider roo-code cline amazon-q cody codeium tabnine replit pearai supermaven pieces blackbox gemini-cli goose-cli opencode kilocode kimiai workbuddy"

MIGRATION_TOTAL=0
MIGRATION_SUCCESS=0
MIGRATION_FAILED=0
MIGRATION_SKIPPED=0

MIGRATION_STATUS_FILE=""
MIGRATION_MESSAGES_FILE=""
MIGRATION_MANUAL_FILE=""

get_ide_name() {
    local ide="$1"
    case "$ide" in
        antigravity) echo "Antigravity" ;;
        claude)      echo "Claude Code" ;;
        codex)       echo "OpenAI Codex CLI" ;;
        copilot)     echo "VS Code Copilot" ;;
        cursor)      echo "Cursor" ;;
        windsurf)    echo "Windsurf" ;;
        jetbrains)   echo "JetBrains IDEs" ;;
        openclaw)    echo "OpenClaw" ;;
        trae)        echo "Trae (International)" ;;
        trae-cn)     echo "Trae CN (China)" ;;
        vscode)      echo "VS Code" ;;
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
        kilocode)    echo "Kilocode" ;;
        kimiai)      echo "Kimi AI" ;;
        workbuddy)   echo "WorkBuddy" ;;
        *)           echo "$ide" ;;
    esac
}

# SOURCE OF TRUTH: skills/agent-skills-setup/references/ide-registry.md (and ide-paths.json).
# Keep these functions in sync with that file. Drift is caught by test-ide-paths.sh.
get_global_path() {
    local ide="$1"
    case "$ide" in
        antigravity) echo "${HOME}/.gemini/antigravity/skills" ;;
        claude)      echo "${HOME}/.claude/skills" ;;
        codex)       echo "${HOME}/.agents/skills" ;;
        copilot)     echo "${HOME}/.copilot/skills" ;;
        cursor)      echo "${HOME}/.cursor" ;;
        windsurf)    echo "${HOME}/.windsurf" ;;
        jetbrains)   echo "${HOME}/.idea" ;;
        openclaw)    echo "${HOME}/.openclaw/skills" ;;
        trae)        echo "${HOME}/.trae/skills" ;;
        trae-cn)     echo "${HOME}/.trae-cn/skills" ;;
        vscode)      echo "${HOME}/.vscode" ;;
        zed)         echo "${HOME}/.config/zed" ;;
        neovim)      echo "${HOME}/.config/nvim" ;;
        emacs)       echo "${HOME}/.emacs.d" ;;
        continue)    echo "${HOME}/.continue" ;;
        aider)       echo "${HOME}/.aider" ;;
        roo-code)    echo "${HOME}/.roo" ;;
        cline)       echo "${HOME}/.cline" ;;
        amazon-q)    echo "${HOME}/.aws/amazon-q" ;;
        # cody/codeium/tabnine/blackbox: no stable global skills directory.
        # Returning "" avoids emitting glob literals (e.g. sourcegraph.cody*)
        # that would otherwise be turned into illegal directory names by mkdir -p.
        cody)        echo "" ;;
        codeium)     echo "" ;;
        tabnine)     echo "" ;;
        replit)      echo "${HOME}/.replit" ;;
        pearai)      echo "${HOME}/.pearai" ;;
        supermaven)  echo "${HOME}/.supermaven" ;;
        pieces)      echo "${HOME}/.pieces" ;;
        blackbox)    echo "" ;;
        gemini-cli)  echo "${HOME}/.gemini" ;;
        goose-cli)   echo "${HOME}/.config/goose" ;;
        opencode)    echo "${HOME}/.config/opencode" ;;
        kilocode)    echo "${HOME}/.kilocode" ;;
        kimiai)      echo "${HOME}/.kimi-code/skills" ;;
        workbuddy)   echo "${HOME}/.workbuddy/skills" ;;
        *)           echo "" ;;
    esac
}

get_project_path() {
    local ide="$1"
    # Returns the project-level path for an IDE. NOTE: this may be a DIRECTORY
    # (e.g. .vscode, skills, .cursor) OR a FILE (e.g. .dir-locals.el,
    # .aider.conf.yml, .github/copilot-instructions.md). Callers that create
    # paths must guard against file-type returns: use
    # `mkdir -p "$(dirname "$path")"` for files, never `mkdir -p "$path"` on a
    # file path.
    case "$ide" in
        antigravity) echo ".agents/skills" ;;
        claude)      echo ".claude" ;;
        codex)       echo ".codex" ;;
        copilot)     echo ".github/copilot-instructions.md" ;;
        cursor)      echo ".cursor" ;;
        windsurf)    echo ".windsurf" ;;
        jetbrains)   echo ".idea" ;;
        openclaw)    echo "skills" ;;
        trae)        echo ".trae" ;;
        trae-cn)     echo ".trae" ;;
        vscode)      echo ".vscode" ;;
        zed)         echo ".zed" ;;
        neovim)      echo ".nvim" ;;
        emacs)       echo ".dir-locals.el" ;;
        continue)    echo ".continue" ;;
        aider)       echo ".aider.conf.yml" ;;
        roo-code)    echo ".roo" ;;
        cline)       echo ".cline" ;;
        amazon-q)    echo ".amazon-q" ;;
        cody)        echo ".cody" ;;
        codeium)     echo ".codeium" ;;
        tabnine)     echo ".tabnine" ;;
        replit)      echo ".replit" ;;
        pearai)      echo ".pearai" ;;
        supermaven)  echo ".supermaven" ;;
        pieces)      echo ".pieces" ;;
        blackbox)    echo ".blackbox" ;;
        gemini-cli)  echo ".gemini" ;;
        goose-cli)   echo ".goose" ;;
        opencode)    echo ".opencode" ;;
        kilocode)    echo ".kilocode" ;;
        kimiai)      echo ".kimi-code/skills" ;;
        workbuddy)   echo ".workbuddy/skills" ;;
        *)           echo "" ;;
    esac
}

get_rules_file() {
    local ide="$1"
    case "$ide" in
        cursor)      echo ".cursorrules" ;;
        windsurf)    echo ".windsurfrules" ;;
        copilot)     echo ".github/copilot-instructions.md" ;;
        openclaw)    echo "AGENT_RULES.md" ;;
        claude)      echo "CLAUDE.md" ;;
        aider)       echo "CONVENTIONS.md" ;;
        cline)       echo ".clinerules" ;;
        continue)    echo ".continuerc.json" ;;
        roo-code)    echo ".roomotes" ;;
        cody)        echo ".codyrules" ;;
        pearai)      echo ".pearairules" ;;
        codex)       echo "AGENTS.md" ;;
        gemini-cli)  echo "GEMINI.md" ;;
        goose-cli)   echo "GOOSE.md" ;;
        opencode)    echo "OPENCODE.md" ;;
        kilocode)    echo "KILOCODE.md" ;;
        kimiai)      echo "AGENTS.md" ;;
        *)           echo "" ;;
    esac
}

get_prompts_path() {
    local ide="$1"
    case "$ide" in
        cursor)      echo ".cursor/prompts" ;;
        windsurf)    echo ".windsurf/prompts" ;;
        copilot)     echo ".github/prompts" ;;
        openclaw)    echo ".github/prompts" ;;
        continue)    echo ".continue/prompts" ;;
        cline)       echo ".cline/prompts" ;;
        claude)      echo ".claude/commands" ;;
        gemini-cli)  echo ".gemini/commands" ;;
        goose-cli)   echo ".goose/prompts" ;;
        *)           echo "" ;;
    esac
}

get_mcp_path() {
    local ide="$1"
    case "$ide" in
        trae)        echo "${HOME}/.trae/mcps" ;;
        trae-cn)     echo "${HOME}/.trae-cn/mcps" ;;
        openclaw)    echo "${HOME}/.openclaw/openclaw.json" ;;
        claude)      echo "${HOME}/.claude.json" ;;
        continue)    echo "${HOME}/.continue/config.json" ;;
        cline)       echo "${HOME}/.cline/mcp.json" ;;
        cursor)      echo "${HOME}/.cursor/mcp.json" ;;
        roo-code)    echo "${HOME}/.roo/mcp.json" ;;
        windsurf)    echo "${HOME}/.windsurf/mcp.json" ;;
        gemini-cli)  echo "${HOME}/.gemini/settings.json" ;;
        goose-cli)   echo "${HOME}/.config/goose/config.yaml" ;;
        codex)       echo "${HOME}/.codex" ;;
        aider)       echo "${HOME}/.aider.conf.yml" ;;
        kimiai)      echo "${HOME}/.kimi-code/mcp.json" ;;
        workbuddy)   echo "${HOME}/.workbuddy/.mcp.json" ;;
        *)           echo "" ;;
    esac
}

get_config_file() {
    local ide="$1"
    case "$ide" in
        trae)        echo "${HOME}/.trae/argv.json" ;;
        trae-cn)     echo "${HOME}/.trae-cn/argv.json" ;;
        openclaw)    echo "${HOME}/.openclaw/openclaw.json" ;;
        cursor)      echo "${HOME}/.cursor/settings.json" ;;
        windsurf)    echo "${HOME}/.windsurf/settings.json" ;;
        vscode)      echo "${HOME}/.vscode/settings.json" ;;
        zed)         echo "${HOME}/.config/zed/settings.json" ;;
        neovim)      echo "${HOME}/.config/nvim/init.lua" ;;
        emacs)       echo "${HOME}/.emacs.d/init.el" ;;
        continue)    echo "${HOME}/.continue/config.json" ;;
        aider)       echo "${HOME}/.aider.conf.yml" ;;
        cline)       echo "${HOME}/.cline/config.json" ;;
        roo-code)    echo "${HOME}/.roo/config.json" ;;
        claude)      echo "${HOME}/.claude/settings.json" ;;
        replit)      echo "${HOME}/.replit/replit.nix" ;;
        pearai)      echo "${HOME}/.pearai/settings.json" ;;
        gemini-cli)  echo "${HOME}/.gemini/settings.json" ;;
        goose-cli)   echo "${HOME}/.config/goose/config.yaml" ;;
        codex)       echo "${HOME}/.codex" ;;
        opencode)    echo "${HOME}/.config/opencode/config.json" ;;
        kilocode)    echo "${HOME}/.kilocode/config.json" ;;
        kimiai)      echo "${HOME}/.kimi-code/config.toml" ;;
        workbuddy)   echo "${HOME}/.workbuddy/settings.json" ;;
        *)           echo "" ;;
    esac
}

# Returns the MCP server map root key used by an IDE's MCP config file.
# Mirrors the IDE Registry (mcpServers | servers | context_servers |
# mcp.servers | mcp | extensions). Used by convert_mcp_file to map between
# source and target formats.
get_mcp_root_key() {
    local ide="$1"
    case "$ide" in
        claude|cursor|windsurf|gemini-cli|trae|trae-cn|openclaw|continue|cline|roo-code|antigravity|amazon-q|kimiai|workbuddy)
            echo "mcpServers" ;;
        codex)       echo "mcp_servers" ;;
        goose-cli)   echo "extensions" ;;
        zed)         echo "context_servers" ;;
        opencode)    echo "mcp" ;;
        *)           echo "" ;;
    esac
}

usage() {
    cat <<'EOF'
IDE Migration Tool - 在不同AI IDE之间迁移配置

用法: ide-migrate.sh [选项]

必选参数:
  --source <ide>         源IDE (从哪个IDE迁移)
  --target <ide>         目标IDE (迁移到哪个IDE)

可选参数:
  --workspace <dir>      工作区根目录 (默认: 当前目录)
  --objects <list>       要迁移的内容类型 (逗号分隔)
  --strategy <mode>      迁移策略: skip, overwrite, backup (默认: backup)
  --report <file>        保存迁移报告到文件
  --dry-run              预览模式，不实际修改文件
  --print-path <ide> <object>
                          只读诊断：打印指定IDE/对象类型的解析路径并退出(无副作用)
                          object ∈ global|project|mcp|config|rules
  -h, --help             显示帮助信息

支持的IDE:
  antigravity  - Antigravity
  claude       - Claude Code
  codex        - OpenAI Codex CLI
  copilot      - VS Code Copilot
  cursor       - Cursor
  windsurf     - Windsurf
  jetbrains    - JetBrains IDEs
  openclaw     - OpenClaw
  trae         - Trae (国际版)
  trae-cn      - Trae CN (中国版)
  vscode       - VS Code
  zed          - Zed Editor
  neovim       - Neovim
  emacs        - Emacs
  continue     - Continue.dev
  aider        - Aider
  roo-code     - Roo Code
  cline        - Cline
  amazon-q     - Amazon Q Developer
  cody         - Sourcegraph Cody
  codeium      - Codeium
  tabnine      - Tabnine
  replit       - Replit AI
  pearai       - PearAI
  supermaven   - Supermaven
  pieces       - Pieces
  blackbox     - Blackbox AI

支持的CLI工具:
  gemini-cli   - Gemini CLI (Google)
  goose-cli    - Goose CLI (Block)
  opencode     - OpenCode
  kilocode     - Kilocode
  kimiai       - Kimi AI CLI
  workbuddy    - WorkBuddy

内容类型:
  skills       - 技能/Skills (SKILL.md)
  rules        - 规则文件 (.cursorrules, .windsurfrules等)
  prompts      - 提示词模板
  mcp          - MCP服务器配置
  config       - IDE配置文件
  project      - 项目级配置

示例:
  ide-migrate.sh --source trae-cn --target claude
  ide-migrate.sh --source cursor --target windsurf --objects skills,rules
  ide-migrate.sh --source openclaw --target copilot --dry-run
  ide-migrate.sh --source aider --target cline --objects skills,rules
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

    # Source-resolution rule (single coherent rule for every object type):
    #   - skills, mcp, config  -> user-GLOBAL location (HOME-based):
    #       get_global_path / get_mcp_path / get_config_file
    #   - rules, prompts, project -> workspace/PROJECT location (WORKSPACE_ROOT-based):
    #       get_rules_file / get_prompts_path / get_project_path
    # This keeps detection consistent: global objects are discovered from the
    # user home, project objects from the current workspace root.

    local global_path
    global_path=$(get_global_path "$source_ide")
    if [[ -d "$global_path" ]]; then
        objects+="skills,"
    fi

    local rules_file
    rules_file=$(get_rules_file "$source_ide")
    if [[ -n "$rules_file" ]] && [[ -f "$WORKSPACE_ROOT/$rules_file" ]]; then
        objects+="rules,"
    fi

    local prompts_path
    prompts_path=$(get_prompts_path "$source_ide")
    if [[ -n "$prompts_path" ]] && [[ -d "$WORKSPACE_ROOT/$prompts_path" ]]; then
        objects+="prompts,"
    fi

    local mcp_path
    mcp_path=$(get_mcp_path "$source_ide")
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
}

cleanup_migration_files() {
    [[ -f "$MIGRATION_STATUS_FILE" ]] && rm -f "$MIGRATION_STATUS_FILE"
    [[ -f "$MIGRATION_MESSAGES_FILE" ]] && rm -f "$MIGRATION_MESSAGES_FILE"
    [[ -f "$MIGRATION_MANUAL_FILE" ]] && rm -f "$MIGRATION_MANUAL_FILE"
    # Always succeed: under `set -e` an EXIT-trap command that fails would
    # override an explicit `exit 0` (e.g. the read-only --print-path mode,
    # which never calls init_migration_files and leaves these vars empty).
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
        grep "^$obj:" "$MIGRATION_STATUS_FILE" | tail -1 | sed 's/^[^:]*://'
    fi
}

get_message() {
    local obj="$1"
    if [[ -f "$MIGRATION_MESSAGES_FILE" ]]; then
        # Parse only on the FIRST colon so values containing ':' (e.g.
        # file://... URLs or Windows C: paths) are preserved intact.
        grep "^$obj:" "$MIGRATION_MESSAGES_FILE" | tail -1 | sed 's/^[^:]*://'
    fi
}

get_manual_steps() {
    local obj="$1"
    if [[ -f "$MIGRATION_MANUAL_FILE" ]]; then
        grep "^$obj:" "$MIGRATION_MANUAL_FILE" | sed 's/^[^:]*://'
    fi
}

migrate_skills() {
    local source_ide="$1"
    local target_ide="$2"
    local source_global
    source_global=$(get_global_path "$source_ide")
    local target_global
    target_global=$(get_global_path "$target_ide")

    # Guard against IDEs with no stable global skills directory (e.g.
    # cody/codeium/tabnine/blackbox return ""). Without this, `mkdir -p ""`
    # would fail under `set -e` and abort the whole script. This covers both
    # the copilot branch and the generic branch below.
    if [[ -z "$target_global" ]]; then
        set_status "skills" "skipped"
        set_message "skills" "目标IDE无全局技能目录，跳过"
        MIGRATION_SKIPPED=$((MIGRATION_SKIPPED + 1))
        return 0
    fi

    MIGRATION_TOTAL=$((MIGRATION_TOTAL + 1))

    if [[ ! -d "$source_global" ]]; then
        set_status "skills" "skipped"
        set_message "skills" "源目录不存在: $source_global"
        MIGRATION_SKIPPED=$((MIGRATION_SKIPPED + 1))
        return 0
    fi

    print_progress "MIGRATE" "迁移技能 (Skills)..."

    local migrated_count=0
    local failed_count=0

    if [[ "$target_ide" == "copilot" ]]; then
        # Copilot (VS Code extension) loads skills from a directory per skill
        # name (registry: global ~/.copilot/skills/, project .github/skills/).
        # Copy the ENTIRE skill directory so scripts/ references/ assets/ are
        # preserved (consistent with CONVERT_SKILL and the non-copilot branch).
        mkdir -p "$target_global"

        local skill_dir skill_name
        for skill_dir in "$source_global"/*/; do
            [[ -d "$skill_dir" ]] || continue
            [[ -f "$skill_dir/SKILL.md" ]] || continue
            skill_name=$(basename "$skill_dir")

            if [[ -f "$skill_dir/SKILL.md" ]]; then
                if [[ $DRY_RUN -eq 1 ]]; then
                    echo "  DRY-RUN: cp -r $skill_dir $target_global/$skill_name"
                    ((migrated_count++))
                else
                    if [[ -d "$target_global/$skill_name" ]]; then
                        case "$STRATEGY" in
                            skip)
                                echo "  [SKIP] 技能已存在: $skill_name"
                                continue
                                ;;
                            backup)
                                local timestamp
                                timestamp=$(date +%Y%m%d%H%M%S)
                                mv "$target_global/$skill_name" "$target_global/$skill_name.bak.$timestamp"
                                echo "  [BACKUP] 备份已存在: $skill_name"
                                ;;
                            overwrite)
                                rm -rf "$target_global/$skill_name"
                                ;;
                        esac
                    fi

                    if cp -r "$skill_dir" "$target_global/$skill_name" 2>/dev/null; then
                        echo "  [OK] 迁移技能: $skill_name"
                        ((migrated_count++))
                    else
                        echo "  [FAIL] 迁移失败: $skill_name"
                        ((failed_count++))
                    fi
                fi
            fi
        done

        set_manual_step "skills" "更新 VS Code settings.json 引用迁移的技能文件 (.github/skills/ 或 ~/.copilot/skills/)"

    else
        mkdir -p "$target_global"

        local skill_dir skill_name
        for skill_dir in "$source_global"/*/; do
            [[ -d "$skill_dir" ]] || continue
            [[ -f "$skill_dir/SKILL.md" ]] || continue
            skill_name=$(basename "$skill_dir")

            if [[ $DRY_RUN -eq 1 ]]; then
                echo "  DRY-RUN: cp -r $skill_dir $target_global/$skill_name"
                ((migrated_count++))
            else
                if [[ -d "$target_global/$skill_name" ]]; then
                    case "$STRATEGY" in
                        skip)
                            echo "  [SKIP] 技能已存在: $skill_name"
                            continue
                            ;;
                        backup)
                            local timestamp
                            timestamp=$(date +%Y%m%d%H%M%S)
                            mv "$target_global/$skill_name" "$target_global/$skill_name.bak.$timestamp"
                            echo "  [BACKUP] 备份已存在: $skill_name"
                            ;;
                        overwrite)
                            rm -rf "$target_global/$skill_name"
                            ;;
                    esac
                fi

                if cp -r "$skill_dir" "$target_global/$skill_name" 2>/dev/null; then
                    echo "  [OK] 迁移技能: $skill_name"
                    ((migrated_count++))
                else
                    echo "  [FAIL] 迁移失败: $skill_name"
                    ((failed_count++))
                fi
            fi
        done
    fi

    if [[ $failed_count -gt 0 ]]; then
        set_status "skills" "partial"
        set_message "skills" "成功 $migrated_count 个, 失败 $failed_count 个"
        MIGRATION_FAILED=$((MIGRATION_FAILED + 1))
    else
        set_status "skills" "success"
        set_message "skills" "成功迁移 $migrated_count 个技能"
        MIGRATION_SUCCESS=$((MIGRATION_SUCCESS + 1))
    fi
}

migrate_rules() {
    local source_ide="$1"
    local target_ide="$2"

    MIGRATION_TOTAL=$((MIGRATION_TOTAL + 1))

    local source_rules
    source_rules=$(get_rules_file "$source_ide")
    local target_rules
    target_rules=$(get_rules_file "$target_ide")

    if [[ -z "$source_rules" ]]; then
        set_status "rules" "skipped"
        set_message "rules" "源IDE不支持规则文件"
        MIGRATION_SKIPPED=$((MIGRATION_SKIPPED + 1))
        return 0
    fi

    if [[ -z "$target_rules" ]]; then
        set_status "rules" "skipped"
        set_message "rules" "目标IDE不支持规则文件"
        MIGRATION_SKIPPED=$((MIGRATION_SKIPPED + 1))
        return 0
    fi

    print_progress "MIGRATE" "迁移规则文件..."

    local source_path="$WORKSPACE_ROOT/$source_rules"
    local target_path="$WORKSPACE_ROOT/$target_rules"

    if [[ ! -f "$source_path" ]]; then
        set_status "rules" "skipped"
        set_message "rules" "源规则文件不存在: $source_rules"
        MIGRATION_SKIPPED=$((MIGRATION_SKIPPED + 1))
        return 0
    fi

    if [[ $DRY_RUN -eq 1 ]]; then
        echo "  DRY-RUN: cp $source_path $target_path"
        set_status "rules" "success"
        set_message "rules" "规则文件准备迁移"
    else
        mkdir -p "$(dirname "$target_path")"
        if cp "$source_path" "$target_path" 2>/dev/null; then
            echo "  [OK] 迁移规则: $source_rules -> $target_rules"
            set_status "rules" "success"
            set_message "rules" "规则文件迁移成功"
            MIGRATION_SUCCESS=$((MIGRATION_SUCCESS + 1))
        else
            set_status "rules" "failed"
            set_message "rules" "规则文件迁移失败"
            MIGRATION_FAILED=$((MIGRATION_FAILED + 1))
        fi
    fi
}

migrate_prompts() {
    local source_ide="$1"
    local target_ide="$2"

    MIGRATION_TOTAL=$((MIGRATION_TOTAL + 1))

    local source_prompts
    source_prompts=$(get_prompts_path "$source_ide")
    local target_prompts
    target_prompts=$(get_prompts_path "$target_ide")

    if [[ -z "$source_prompts" ]]; then
        set_status "prompts" "skipped"
        set_message "prompts" "源IDE不支持提示词模板"
        MIGRATION_SKIPPED=$((MIGRATION_SKIPPED + 1))
        return 0
    fi

    if [[ -z "$target_prompts" ]]; then
        set_status "prompts" "skipped"
        set_message "prompts" "目标IDE不支持提示词模板"
        MIGRATION_SKIPPED=$((MIGRATION_SKIPPED + 1))
        return 0
    fi

    print_progress "MIGRATE" "迁移提示词模板..."

    local source_path="$WORKSPACE_ROOT/$source_prompts"
    local target_path="$WORKSPACE_ROOT/$target_prompts"

    if [[ ! -d "$source_path" ]]; then
        set_status "prompts" "skipped"
        set_message "prompts" "源提示词目录不存在: $source_prompts"
        MIGRATION_SKIPPED=$((MIGRATION_SKIPPED + 1))
        return 0
    fi

    local prompt_count
    prompt_count=$(find "$source_path" -name "*.md" -type f 2>/dev/null | wc -l | tr -d ' ')

    if [[ "$prompt_count" -eq 0 ]]; then
        set_status "prompts" "skipped"
        set_message "prompts" "源提示词目录为空"
        MIGRATION_SKIPPED=$((MIGRATION_SKIPPED + 1))
        return 0
    fi

    if [[ $DRY_RUN -eq 1 ]]; then
        echo "  DRY-RUN: cp -r $source_path/* $target_path/"
        set_status "prompts" "success"
        set_message "prompts" "$prompt_count 个提示词模板准备迁移"
    else
        mkdir -p "$target_path"
        if cp -r "$source_path"/* "$target_path/" 2>/dev/null; then
            echo "  [OK] 迁移提示词: $prompt_count 个文件"
            set_status "prompts" "success"
            set_message "prompts" "成功迁移 $prompt_count 个提示词模板"
            MIGRATION_SUCCESS=$((MIGRATION_SUCCESS + 1))
        else
            set_status "prompts" "failed"
            set_message "prompts" "提示词模板迁移失败"
            MIGRATION_FAILED=$((MIGRATION_FAILED + 1))
        fi
    fi
}

# Reads a source MCP config, maps the server root key into the target IDE's
# format, and writes the result to the target file. Sets the global variables
# CONV_RESULT (success|copied|failed) and CONV_DETAIL (human message) for the
# caller. NEVER reports success when zero bytes were actually transferred.
convert_mcp_file() {
    local src="$1" src_key="$2" dst="$3" dst_key="$4"
    CONV_RESULT=""
    CONV_DETAIL=""

    if [[ ! -r "$src" ]]; then
        CONV_RESULT="failed"
        CONV_DETAIL="源MCP配置不可读: $src"
        return
    fi

    # Only perform a true root-key conversion when BOTH the source and target
    # are JSON files. If either side is TOML/YAML (or any other format) we
    # cannot truly convert, so we fall back to a verbatim copy and report
    # "copied" (never a false "success").
    local src_ext dst_ext
    src_ext="${src##*.}"
    dst_ext="${dst##*.}"

    if [[ "$src_ext" == "json" && "$dst_ext" == "json" ]] && command -v python3 >/dev/null 2>&1; then
        if python3 - "$src" "$src_key" "$dst" "$dst_key" >/dev/null 2>&1 <<'PYEOF'
import json, os, sys
src, src_key, dst, dst_key = sys.argv[1], (sys.argv[2] or ""), sys.argv[3], (sys.argv[4] or "")
try:
    with open(src) as f:
        data = json.load(f)
except Exception:
    sys.exit(2)  # not JSON -> caller falls back to a verbatim copy
if isinstance(data, dict):
    if src_key and src_key in data:
        servers = data[src_key]
    elif "mcpServers" in data:
        servers = data["mcpServers"]
    else:
        servers = {}
else:
    servers = {}
if not servers:
    # No servers were extracted (empty/absent root key). Never report a
    # "success" for a zero-server transfer; signal the caller to fall back
    # to a verbatim copy instead.
    sys.exit(3)
existing = {}
if os.path.exists(dst):
    try:
        with open(dst) as f:
            existing = json.load(f)
    except Exception:
        existing = {}
if not isinstance(existing, dict):
    existing = {}
if dst_key:
    cur = existing.get(dst_key, {})
    if not isinstance(cur, dict):
        cur = {}
    if isinstance(servers, dict):
        cur.update(servers)
    existing[dst_key] = cur
else:
    if isinstance(servers, dict):
        existing.update(servers)
    else:
        existing = servers
with open(dst, "w") as f:
    json.dump(existing, f, indent=2)
sys.exit(0)
PYEOF
        then
            CONV_RESULT="success"
            CONV_DETAIL="MCP配置已转换 (根键 ${src_key:-mcpServers} -> ${dst_key:-mcpServers})"
            return
        fi
        # exit 2 (not JSON) or exit 3 (empty server map) -> fall through to a
        # verbatim copy so we never report a false "success"
    fi

    # Fallback: copy as-is. Marked "copied" (not "success") because the format
    # was not truly converted and manual adjustment is expected.
    if cp "$src" "$dst" 2>/dev/null; then
        if [[ -s "$dst" ]]; then
            CONV_RESULT="copied"
            CONV_DETAIL="MCP配置按原样复制 (源/目标格式不直接兼容，需手动调整根键 ${src_key:-?} -> ${dst_key:-?})"
        else
            CONV_RESULT="failed"
            CONV_DETAIL="MCP配置复制后为空"
        fi
    else
        CONV_RESULT="failed"
        CONV_DETAIL="MCP配置复制失败"
    fi
}

migrate_mcp() {
    local source_ide="$1"
    local target_ide="$2"

    MIGRATION_TOTAL=$((MIGRATION_TOTAL + 1))

    local source_mcp
    source_mcp=$(get_mcp_path "$source_ide")
    local target_mcp
    target_mcp=$(get_mcp_path "$target_ide")

    if [[ -z "$source_mcp" ]]; then
        set_status "mcp" "skipped"
        set_message "mcp" "源IDE不支持MCP配置"
        MIGRATION_SKIPPED=$((MIGRATION_SKIPPED + 1))
        return 0
    fi

    if [[ -z "$target_mcp" ]]; then
        set_status "mcp" "manual"
        set_message "mcp" "目标IDE不支持MCP配置，需手动迁移"
        set_manual_step "mcp" "目标IDE ($target_ide) 不支持自动MCP迁移，请参考 IDE Registry 手动配置"
        MIGRATION_SKIPPED=$((MIGRATION_SKIPPED + 1))
        return 0
    fi

    print_progress "MIGRATE" "迁移MCP服务器配置..."

    if [[ ! -e "$source_mcp" ]]; then
        set_status "mcp" "absent"
        set_message "mcp" "源MCP配置不存在: $source_mcp"
        MIGRATION_SKIPPED=$((MIGRATION_SKIPPED + 1))
        return 0
    fi

    local src_key dst_key
    src_key=$(get_mcp_root_key "$source_ide")
    dst_key=$(get_mcp_root_key "$target_ide")

    if [[ $DRY_RUN -eq 1 ]]; then
        echo "  DRY-RUN: 转换MCP配置"
        echo "    源:   $source_mcp (根键: ${src_key:-无})"
        echo "    目标: $target_mcp (根键: ${dst_key:-无})"
        # Dry-run only prints the plan; never mark success.
        set_status "mcp" "skipped"
        set_message "mcp" "DRY-RUN: 计划转换MCP配置 (${src_key:-?} -> ${dst_key:-?})"
        return 0
    fi

    mkdir -p "$(dirname "$target_mcp")"

    if [[ -e "$target_mcp" ]]; then
        case "$STRATEGY" in
            skip)
                echo "  [SKIP] 目标MCP配置已存在: $target_mcp"
                set_status "mcp" "skipped"
                set_message "mcp" "目标MCP配置已存在，跳过 (策略: skip)"
                MIGRATION_SKIPPED=$((MIGRATION_SKIPPED + 1))
                return 0
                ;;
            backup)
                local ts
                ts=$(date +%Y%m%d%H%M%S)
                cp -r "$target_mcp" "$target_mcp.bak.$ts"
                echo "  [BACKUP] 备份已有MCP配置: $target_mcp.bak.$ts"
                ;;
            overwrite)
                rm -f "$target_mcp"
                ;;
        esac
    fi

    convert_mcp_file "$source_mcp" "$src_key" "$target_mcp" "$dst_key"

    case "$CONV_RESULT" in
        success)
            echo "  [OK] 转换MCP配置: ${src_key:-mcpServers} -> ${dst_key:-mcpServers}"
            set_status "mcp" "success"
            set_message "mcp" "$CONV_DETAIL"
            MIGRATION_SUCCESS=$((MIGRATION_SUCCESS + 1))
            ;;
        copied)
            echo "  [COPY] 按原样复制MCP配置: $target_mcp"
            set_status "mcp" "copied"
            set_message "mcp" "$CONV_DETAIL"
            set_manual_step "mcp" "检查MCP根键兼容性: ${src_key:-?} -> ${dst_key:-?}"
            MIGRATION_SUCCESS=$((MIGRATION_SUCCESS + 1))
            ;;
        failed)
            echo "  [FAIL] MCP配置迁移失败"
            set_status "mcp" "failed"
            set_message "mcp" "$CONV_DETAIL"
            MIGRATION_FAILED=$((MIGRATION_FAILED + 1))
            ;;
        *)
            echo "  [FAIL] MCP配置迁移未知状态"
            set_status "mcp" "failed"
            set_message "mcp" "MCP配置迁移失败 (未知状态)"
            MIGRATION_FAILED=$((MIGRATION_FAILED + 1))
            ;;
    esac
}

migrate_config() {
    local source_ide="$1"
    local target_ide="$2"

    MIGRATION_TOTAL=$((MIGRATION_TOTAL + 1))

    local source_config
    source_config=$(get_config_file "$source_ide")
    local target_config
    target_config=$(get_config_file "$target_ide")

    if [[ -z "$source_config" ]]; then
        set_status "config" "skipped"
        set_message "config" "源IDE无特定配置文件"
        MIGRATION_SKIPPED=$((MIGRATION_SKIPPED + 1))
        return 0
    fi

    if [[ -z "$target_config" ]]; then
        set_status "config" "manual"
        set_message "config" "目标IDE无特定配置文件，需手动迁移"
        set_manual_step "config" "目标IDE ($target_ide) 不支持自动配置迁移，请手动处理"
        MIGRATION_SKIPPED=$((MIGRATION_SKIPPED + 1))
        return 0
    fi

    print_progress "MIGRATE" "迁移IDE配置..."

    if [[ ! -f "$source_config" ]]; then
        set_status "config" "absent"
        set_message "config" "源配置文件不存在: $source_config"
        MIGRATION_SKIPPED=$((MIGRATION_SKIPPED + 1))
        return 0
    fi

    if [[ $DRY_RUN -eq 1 ]]; then
        echo "  DRY-RUN: 复制配置文件"
        echo "    源:   $source_config"
        echo "    目标: $target_config"
        # Dry-run only prints the plan; never mark success.
        set_status "config" "skipped"
        set_message "config" "DRY-RUN: 计划复制配置文件"
        return 0
    fi

    mkdir -p "$(dirname "$target_config")"

    if [[ -e "$target_config" ]]; then
        case "$STRATEGY" in
            skip)
                echo "  [SKIP] 目标配置文件已存在: $target_config"
                set_status "config" "skipped"
                set_message "config" "目标配置文件已存在，跳过 (策略: skip)"
                MIGRATION_SKIPPED=$((MIGRATION_SKIPPED + 1))
                return 0
                ;;
            backup)
                local ts
                ts=$(date +%Y%m%d%H%M%S)
                cp -r "$target_config" "$target_config.bak.$ts"
                echo "  [BACKUP] 备份已有配置文件: $target_config.bak.$ts"
                ;;
            overwrite)
                rm -f "$target_config"
                ;;
        esac
    fi

    # A true cross-IDE config conversion is rarely meaningful (schemas differ
    # per IDE). We perform a real transfer (read + copy) and mark it "copied"
    # with a manual step, NEVER "success" implying full conversion, and never
    # a no-op.
    if cp "$source_config" "$target_config" 2>/dev/null; then
        if [[ -s "$target_config" ]]; then
            echo "  [COPY] 复制配置文件: $target_config"
            set_status "config" "copied"
            set_message "config" "配置文件已复制 (可能需要手动调整格式): $target_config"
            set_manual_step "config" "检查并调整IDE配置文件格式 ($source_ide -> $target_ide)"
            MIGRATION_SUCCESS=$((MIGRATION_SUCCESS + 1))
        else
            echo "  [FAIL] 配置文件复制后为空"
            set_status "config" "failed"
            set_message "config" "配置文件复制后为空"
            MIGRATION_FAILED=$((MIGRATION_FAILED + 1))
        fi
    else
        echo "  [FAIL] 配置文件复制失败"
        set_status "config" "failed"
        set_message "config" "配置文件复制失败"
        MIGRATION_FAILED=$((MIGRATION_FAILED + 1))
    fi
}

migrate_project() {
    local source_ide="$1"
    local target_ide="$2"

    MIGRATION_TOTAL=$((MIGRATION_TOTAL + 1))

    local source_project
    source_project=$(get_project_path "$source_ide")
    local target_project
    target_project=$(get_project_path "$target_ide")

    if [[ -z "$source_project" ]]; then
        set_status "project" "skipped"
        set_message "project" "源IDE不支持项目级配置"
        MIGRATION_SKIPPED=$((MIGRATION_SKIPPED + 1))
        return 0
    fi

    if [[ -z "$target_project" ]]; then
        set_status "project" "skipped"
        set_message "project" "目标IDE不支持项目级配置"
        MIGRATION_SKIPPED=$((MIGRATION_SKIPPED + 1))
        return 0
    fi

    print_progress "MIGRATE" "迁移项目级配置..."

    local source_path="$WORKSPACE_ROOT/$source_project"
    local target_path="$WORKSPACE_ROOT/$target_project"

    if [[ ! -e "$source_path" ]]; then
        set_status "project" "skipped"
        set_message "project" "源项目配置不存在: $source_project"
        MIGRATION_SKIPPED=$((MIGRATION_SKIPPED + 1))
        return 0
    fi

    if [[ $DRY_RUN -eq 1 ]]; then
        if [[ -d "$source_path" ]]; then
            echo "  DRY-RUN: cp -r $source_path $target_path"
        else
            echo "  DRY-RUN: cp $source_path $target_path"
        fi
        set_status "project" "success"
        set_message "project" "项目配置准备迁移"
    else
        if [[ -d "$source_path" ]]; then
            mkdir -p "$target_path"
            if cp -r "$source_path"/* "$target_path/" 2>/dev/null; then
                echo "  [OK] 迁移项目配置目录"
                set_status "project" "success"
                set_message "project" "项目配置迁移成功"
                MIGRATION_SUCCESS=$((MIGRATION_SUCCESS + 1))
            else
                set_status "project" "failed"
                set_message "project" "项目配置迁移失败"
                MIGRATION_FAILED=$((MIGRATION_FAILED + 1))
            fi
        else
            mkdir -p "$(dirname "$target_path")"
            if cp "$source_path" "$target_path" 2>/dev/null; then
                echo "  [OK] 迁移项目配置文件"
                set_status "project" "success"
                set_message "project" "项目配置迁移成功"
                MIGRATION_SUCCESS=$((MIGRATION_SUCCESS + 1))
            else
                set_status "project" "failed"
                set_message "project" "项目配置迁移失败"
                MIGRATION_FAILED=$((MIGRATION_FAILED + 1))
            fi
        fi
    fi
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
                migrate_skills "$source_ide" "$target_ide"
                ;;
            rules)
                migrate_rules "$source_ide" "$target_ide"
                ;;
            prompts)
                migrate_prompts "$source_ide" "$target_ide"
                ;;
            mcp)
                migrate_mcp "$source_ide" "$target_ide"
                ;;
            config)
                migrate_config "$source_ide" "$target_ide"
                ;;
            project)
                migrate_project "$source_ide" "$target_ide"
                ;;
            *)
                echo "[WARN] 未知的内容类型: $obj"
                ;;
        esac
    done
}

generate_report() {
    local source_ide="$1"
    local target_ide="$2"
    local report=""

    report+="========================================\n"
    report+="       IDE 迁移报告\n"
    report+="========================================\n"
    report+="\n"
    report+="迁移详情:\n"
    report+="  源IDE: $(get_ide_name "$source_ide") ($source_ide)\n"
    report+="  目标IDE: $(get_ide_name "$target_ide") ($target_ide)\n"
    report+="  工作区: $WORKSPACE_ROOT\n"
    report+="  策略: $STRATEGY\n"
    report+="  时间: $(date -Iseconds)\n"
    report+="\n"
    report+="统计:\n"
    report+="  总操作数: $MIGRATION_TOTAL\n"
    report+="  成功: $MIGRATION_SUCCESS\n"
    report+="  失败: $MIGRATION_FAILED\n"
    report+="  跳过: $MIGRATION_SKIPPED\n"
    report+="\n"
    report+="详细结果:\n"

    for obj in skills rules prompts mcp config project; do
        local status
        status=$(get_status "$obj")
        if [[ -n "$status" ]]; then
            local message
            message=$(get_message "$obj")
            local status_icon

            case "$status" in
                success) status_icon="✓" ;;
                copied)  status_icon="✓" ;;
                manual)  status_icon="⚠" ;;
                partial) status_icon="⚠" ;;
                failed)  status_icon="✗" ;;
                absent)  status_icon="○" ;;
                skipped) status_icon="○" ;;
                *)       status_icon="?" ;;
            esac

            report+="  [$status_icon] $obj: $message\n"
        fi
    done

    report+="\n"
    report+="需要手动处理的步骤:\n"

    local has_manual=0
    for obj in skills rules prompts mcp config project; do
        local steps
        steps=$(get_manual_steps "$obj")
        if [[ -n "$steps" ]]; then
            has_manual=1
            report+="\n  [$obj]\n"
            report+="    $steps\n"
        fi
    done

    if [[ $has_manual -eq 0 ]]; then
        report+="  无 - 所有迁移已自动完成\n"
    fi

    report+="\n"
    report+="========================================\n"

    echo -e "$report"
}

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
            shift 2
            ;;
        --objects)
            OBJECTS="$2"
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
            echo "错误: 未知参数: $1" >&2
            usage >&2
            exit 1
            ;;
    esac
done

# Suppress the banner in read-only diagnostic mode so --print-path emits only
# the resolved path on stdout (keeps verify-ide-config.sh comparisons exact).
if [[ -z "$PRINT_PATH_IDE" ]]; then
    print_header
fi

# ---------------------------------------------------------------------------
# Read-only diagnostic mode: --print-path <ide> <object>
# Resolves and prints the path for the requested object using the same
# get_*_path functions the migration logic uses, then exits. This performs NO
# migration and NO filesystem writes (side-effect-free). For an unknown IDE or
# an unsupported object the script prints an error to stderr and exits non-zero.
# ---------------------------------------------------------------------------
if [[ -n "$PRINT_PATH_IDE" ]]; then
    if ! validate_ide "$PRINT_PATH_IDE"; then
        echo "错误: 无效的IDE: $PRINT_PATH_IDE" >&2
        echo "支持的IDE: $SUPPORTED_IDES" >&2
        exit 1
    fi

    resolved=""
    case "$PRINT_PATH_OBJECT" in
        global)  resolved=$(get_global_path "$PRINT_PATH_IDE") ;;
        project) resolved=$(get_project_path "$PRINT_PATH_IDE") ;;
        mcp)     resolved=$(get_mcp_path "$PRINT_PATH_IDE") ;;
        config)  resolved=$(get_config_file "$PRINT_PATH_IDE") ;;
        rules)   resolved=$(get_rules_file "$PRINT_PATH_IDE") ;;
        *)
            echo "错误: 不支持的对象: $PRINT_PATH_OBJECT (可选: global, project, mcp, config, rules)" >&2
            exit 1
            ;;
    esac

    if [[ -z "$resolved" ]]; then
        # IDE exists but does not support this object type.
        echo "错误: $PRINT_PATH_IDE 不支持对象: $PRINT_PATH_OBJECT" >&2
        exit 1
    fi

    # Normalize the user-global HOME prefix to a literal "~" so the output is
    # comparable against registry-canonical "~"-prefixed expected values.
    if [[ "$resolved" == "${HOME}/"* ]]; then
        resolved="~${resolved#"${HOME}"}"
    fi

    echo "$resolved"
    exit 0
fi

if [[ -z "$SOURCE_IDE" ]]; then
    echo "错误: 必须指定源IDE (--source)" >&2
    echo "" >&2
    echo "支持的IDE:" >&2
    for ide in $SUPPORTED_IDES; do
        printf "  - %-12s %s\n" "$ide" "$(get_ide_name "$ide")" >&2
    done
    exit 1
fi

if [[ -z "$TARGET_IDE" ]]; then
    echo "错误: 必须指定目标IDE (--target)" >&2
    echo "" >&2
    echo "支持的IDE:" >&2
    for ide in $SUPPORTED_IDES; do
        printf "  - %-12s %s\n" "$ide" "$(get_ide_name "$ide")" >&2
    done
    exit 1
fi

if ! validate_ide "$SOURCE_IDE"; then
    echo "错误: 无效的源IDE: $SOURCE_IDE" >&2
    echo "支持的IDE: $SUPPORTED_IDES" >&2
    exit 1
fi

if ! validate_ide "$TARGET_IDE"; then
    echo "错误: 无效的目标IDE: $TARGET_IDE" >&2
    echo "支持的IDE: $SUPPORTED_IDES" >&2
    exit 1
fi

if [[ "$SOURCE_IDE" == "$TARGET_IDE" ]]; then
    echo "错误: 源IDE和目标IDE不能相同" >&2
    exit 1
fi

if [[ -z "$OBJECTS" ]]; then
    OBJECTS=$(list_available_objects "$SOURCE_IDE")
    if [[ -z "$OBJECTS" ]]; then
        echo "警告: 未检测到可迁移的内容，将尝试迁移所有类型" >&2
        OBJECTS="skills,rules,prompts,mcp,config,project"
    fi
    echo "自动检测到可迁移内容: $OBJECTS"
fi

echo "========================================"
echo "迁移摘要"
echo "========================================"
echo ""
echo "  源IDE: $(get_ide_name "$SOURCE_IDE")"
echo "  目标IDE: $(get_ide_name "$TARGET_IDE")"
echo "  工作区: $WORKSPACE_ROOT"
echo "  迁移内容: $OBJECTS"
echo "  策略: $STRATEGY"
echo ""

if [[ $DRY_RUN -eq 1 ]]; then
    echo "  模式: DRY-RUN (不会修改任何文件)"
fi

echo ""

init_migration_files

echo "[START] 开始迁移: $(get_ide_name "$SOURCE_IDE") -> $(get_ide_name "$TARGET_IDE")"
echo ""

run_migration "$SOURCE_IDE" "$TARGET_IDE"

echo ""
echo "========================================"
echo "       迁移完成"
echo "========================================"
echo ""

report=$(generate_report "$SOURCE_IDE" "$TARGET_IDE")
echo "$report"

if [[ -n "$REPORT_FILE" ]]; then
    echo "$report" > "$REPORT_FILE"
    echo "报告已保存到: $REPORT_FILE"
fi
