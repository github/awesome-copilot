#!/usr/bin/env bash

set -euo pipefail

SOURCE_DIR="${AGENT_SKILLS_SOURCE_DIR:-${HOME}/.gemini/antigravity/skills}"
STATE_DIR="${OPENCLAW_STATE_DIR:-${HOME}/.openclaw}"
MANAGED_DIR="${AGENT_SKILLS_OPENCLAW_DIR:-${STATE_DIR}/skills}"
DRY_RUN=0
SKIP_RUNTIME=0
SKIP_CLAWHUB=0
SKIP_MIRROR=0
SKIP_DOCTOR=0

declare -a WORKSPACES=()
declare -a AGENTS=()
declare -a REQUESTED_SKILLS=()

usage() {
    cat <<'EOF'
Usage: update-openclaw-skills.sh [options]

Update the OpenClaw runtime, registry-managed skills, and mirrored local skills.

Options:
  --source <dir>          Source skill root. Default: ~/.gemini/antigravity/skills
  --managed-dir <dir>     Managed OpenClaw skill directory. Default: ~/.openclaw/skills
  --workspace <dir>       Run ClawHub/mirror updates for this workspace. Repeatable.
  --agent <id:workspace>  Add a workspace via agent notation. Repeatable.
  --skills <list>         Comma-separated subset of skills to mirror-update.
  --skip-runtime          Do not run `openclaw update`.
  --skip-clawhub          Do not run `clawhub update --all`.
  --skip-mirror           Do not run local rsync mirror updates.
    --skip-doctor           Do not run `openclaw doctor` after updates.
  --dry-run               Preview commands and rsync changes without applying.
  -h, --help              Show this help text.
EOF
}

die() {
    echo "ERROR: $*" >&2
    exit 1
}

run_cmd() {
    printf '+ '
    printf '%q ' "$@"
    printf '\n'
    if [[ $DRY_RUN -eq 0 ]]; then
        "$@"
    fi
}

command_exists() {
    command -v "$1" >/dev/null 2>&1
}

split_csv_into_array() {
    local raw="$1"
    local output_name="$2"
    local old_ifs="$IFS"
    local -a parsed=()

    IFS=',' read -r -a parsed <<< "$raw"
    IFS="$old_ifs"

    eval "$output_name=()"
    local item
    for item in "${parsed[@]}"; do
        eval "$output_name+=(\"\$item\")"
    done
}

while [[ $# -gt 0 ]]; do
    case "$1" in
        --source)
            [[ $# -ge 2 ]] || die "--source requires a value"
            SOURCE_DIR="$2"
            shift 2
            ;;
        --managed-dir)
            [[ $# -ge 2 ]] || die "--managed-dir requires a value"
            MANAGED_DIR="$2"
            shift 2
            ;;
        --workspace)
            [[ $# -ge 2 ]] || die "--workspace requires a value"
            WORKSPACES+=("$2")
            shift 2
            ;;
        --agent)
            [[ $# -ge 2 ]] || die "--agent requires a value"
            AGENTS+=("$2")
            shift 2
            ;;
        --skills)
            [[ $# -ge 2 ]] || die "--skills requires a value"
            split_csv_into_array "$2" REQUESTED_SKILLS
            shift 2
            ;;
        --skip-runtime)
            SKIP_RUNTIME=1
            shift
            ;;
        --skip-clawhub)
            SKIP_CLAWHUB=1
            shift
            ;;
        --skip-mirror)
            SKIP_MIRROR=1
            shift
            ;;
        --skip-doctor)
            SKIP_DOCTOR=1
            shift
            ;;
        --dry-run)
            DRY_RUN=1
            shift
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        *)
            die "Unknown argument: $1"
            ;;
    esac
done

[[ -d "$SOURCE_DIR" ]] || die "Source skills directory not found: $SOURCE_DIR"

if [[ ${#REQUESTED_SKILLS[@]} -eq 0 ]]; then
    while IFS= read -r skill_name; do
        REQUESTED_SKILLS+=("$skill_name")
    done < <(find "$SOURCE_DIR" -mindepth 1 -maxdepth 1 -type d -exec basename {} \; | sort)
fi

if [[ ${#AGENTS[@]} -gt 0 ]]; then
    for agent_spec in "${AGENTS[@]}"; do
        [[ "$agent_spec" == *:* ]] || die "--agent must be in id:workspace format"
        WORKSPACES+=("${agent_spec#*:}")
    done
fi

mirror_selected_skills() {
    local destination_root="$1"
    local skill_name
    local -a rsync_cmd=(rsync -a --delete)

    if [[ $DRY_RUN -eq 1 ]]; then
        rsync_cmd+=(--dry-run --itemize-changes)
    fi

    run_cmd mkdir -p "$destination_root"

    for skill_name in "${REQUESTED_SKILLS[@]}"; do
        [[ -d "$SOURCE_DIR/$skill_name" ]] || die "Requested skill not found: $SOURCE_DIR/$skill_name"
        run_cmd "${rsync_cmd[@]}" "$SOURCE_DIR/$skill_name/" "$destination_root/$skill_name/"
    done
}

if [[ $SKIP_RUNTIME -eq 0 ]]; then
    if command_exists openclaw; then
        if [[ $DRY_RUN -eq 1 ]]; then
            run_cmd openclaw update --dry-run
        else
            run_cmd openclaw update
        fi
    else
        echo "WARN: openclaw not found; skipping runtime update" >&2
    fi
fi

if [[ $SKIP_CLAWHUB -eq 0 ]]; then
    if command_exists clawhub; then
        if [[ ${#WORKSPACES[@]} -gt 0 ]]; then
            for workspace in "${WORKSPACES[@]}"; do
                if [[ -f "$workspace/.clawhub/lock.json" ]]; then
                    if [[ $DRY_RUN -eq 1 ]]; then
                        run_cmd clawhub update --all --workdir "$workspace" --no-input
                    else
                        run_cmd clawhub update --all --workdir "$workspace"
                    fi
                fi
            done
        fi
    else
        echo "WARN: clawhub not found; skipping registry skill updates" >&2
    fi
fi

if [[ $SKIP_MIRROR -eq 0 ]]; then
    mirror_selected_skills "$MANAGED_DIR"
    if [[ ${#WORKSPACES[@]} -gt 0 ]]; then
        for workspace in "${WORKSPACES[@]}"; do
            mirror_selected_skills "$workspace/skills"
        done
    fi
fi

if [[ $DRY_RUN -eq 0 && $SKIP_DOCTOR -eq 0 ]] && command_exists openclaw; then
    run_cmd openclaw doctor
fi

echo "OpenClaw update workflow complete"