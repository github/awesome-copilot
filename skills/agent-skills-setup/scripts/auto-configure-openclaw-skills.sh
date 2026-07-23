#!/usr/bin/env bash

set -euo pipefail

SOURCE_DIR="${AGENT_SKILLS_SOURCE_DIR:-${HOME}/.gemini/antigravity/skills}"
STATE_DIR="${OPENCLAW_STATE_DIR:-${HOME}/.openclaw}"
CONFIG_PATH="${OPENCLAW_CONFIG_PATH:-${STATE_DIR}/openclaw.json}"
MANAGED_DIR="${STATE_DIR}/skills"
ENV_FILE="${STATE_DIR}/.env"
BIN_DIR="${STATE_DIR}/bin"
TOOLS_DIR="${STATE_DIR}/tools"
NODE_MANAGER="npm"
PREFER_BREW=1
WATCH=1
WATCH_DEBOUNCE_MS=250
SCOPE="both"
DRY_RUN=0
CONFIRM_WRITE=0
YES=0
SKIP_OPENCLAW_INSTALL=0
SKIP_CLAWHUB_INSTALL=0
SKIP_DOCTOR=0
DEFAULT_AGENT_ID=""

declare -a WORKSPACES=()
declare -a AGENTS=()
declare -a EXTRA_DIRS=()
declare -a ENV_ASSIGNMENTS=()
declare -a API_KEY_ENV_ASSIGNMENTS=()
declare -a REQUESTED_SKILLS=()

usage() {
    cat <<'EOF'
Usage: auto-configure-openclaw-skills.sh [options]

Install and configure OpenClaw skill support from the Antigravity source-of-truth.

Options:
  --source <dir>                Source skill root. Default: ~/.gemini/antigravity/skills
  --config <file>               OpenClaw config file. Default: ~/.openclaw/openclaw.json
  --managed-dir <dir>           Shared managed skill directory. Default: ~/.openclaw/skills
  --workspace <dir>             Sync skills into <dir>/skills. Repeatable.
  --agent <id:workspace>        Add/update agents.list[] and sync <workspace>/skills. Repeatable.
  --default-agent <id>          Mark the matching --agent entry as default.
  --skills <list>               Comma-separated subset of skills to sync. Default: all skills.
  --scope managed|workspace|both
                                Where to sync skills. Default: both.
  --node-manager <mgr>          npm | pnpm | yarn | bun. Default: npm.
  --prefer-brew true|false      Prefer Homebrew installers when available. Default: true.
  --extra-dir <dir>             Append a shared skills.load.extraDirs entry. Repeatable.
  --env <skill:KEY=VALUE>       Set skills.entries.<skill>.env.<KEY>. Repeatable.
  --api-key-env <skill:ENVVAR>  Set skills.entries.<skill>.apiKey SecretRef. Repeatable.
  --watch true|false            Configure skills.load.watch. Default: true.
  --watch-debounce-ms <ms>      Configure skills.load.watchDebounceMs. Default: 250.
  --skip-openclaw-install       Do not install OpenClaw automatically.
  --skip-clawhub-install        Do not install ClawHub automatically.
  --skip-doctor                 Do not run `openclaw doctor` after applying changes.
  --dry-run                     Print planned commands without changing the system.
  --yes                         Confirm global installs, config writes, and replacement syncs.
  -h, --help                    Show this help text.
EOF
}

die() {
    echo "ERROR: $*" >&2
    exit 1
}

log() {
    echo "$*"
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

sha256_file() {
    local file_path="$1"

    if command_exists sha256sum; then
        sha256sum "$file_path" | awk '{print $1}'
    elif command_exists shasum; then
        shasum -a 256 "$file_path" | awk '{print $1}'
    elif command_exists openssl; then
        openssl dgst -sha256 "$file_path" | awk '{print $NF}'
    else
        die "A SHA-256 tool is required (sha256sum, shasum, or openssl)"
    fi
}

check_prerequisites() {
    local missing=()

    for tool in curl rsync node; do
        command_exists "$tool" || missing+=("$tool")
    done

    if ! command_exists tar && ! command_exists unzip; then
        missing+=("tar-or-unzip")
    fi

    if [[ ${#missing[@]} -gt 0 ]]; then
        die "缺少必要的前置工具：${missing[*]}。请先安装后再运行本脚本（例如 macOS: brew install curl rsync gnu-tar node；node 也可从 nodejs.org 下载安装；解压工具需要 tar 或 unzip 之一）。"
    fi
}

parse_bool() {
    local lowered

    lowered="$(printf '%s' "$1" | tr '[:upper:]' '[:lower:]')"
    case "$lowered" in
        true|1|yes|on)
            echo 1
            ;;
        false|0|no|off)
            echo 0
            ;;
        *)
            die "Invalid boolean value: $1"
            ;;
    esac
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

ensure_supported_scope() {
    case "$SCOPE" in
        managed|workspace|both)
            ;;
        *)
            die "Unsupported scope: $SCOPE"
            ;;
    esac
}

ensure_node_manager_supported() {
    case "$NODE_MANAGER" in
        npm|pnpm|yarn|bun)
            ;;
        *)
            die "Unsupported node manager: $NODE_MANAGER"
            ;;
    esac
}

while [[ $# -gt 0 ]]; do
    case "$1" in
        --source)
            [[ $# -ge 2 ]] || die "--source requires a value"
            SOURCE_DIR="$2"
            shift 2
            ;;
        --config)
            [[ $# -ge 2 ]] || die "--config requires a value"
            CONFIG_PATH="$2"
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
        --default-agent)
            [[ $# -ge 2 ]] || die "--default-agent requires a value"
            DEFAULT_AGENT_ID="$2"
            shift 2
            ;;
        --skills)
            [[ $# -ge 2 ]] || die "--skills requires a value"
            split_csv_into_array "$2" REQUESTED_SKILLS
            shift 2
            ;;
        --scope)
            [[ $# -ge 2 ]] || die "--scope requires a value"
            SCOPE="$2"
            shift 2
            ;;
        --node-manager)
            [[ $# -ge 2 ]] || die "--node-manager requires a value"
            NODE_MANAGER="$2"
            shift 2
            ;;
        --prefer-brew)
            [[ $# -ge 2 ]] || die "--prefer-brew requires a value"
            PREFER_BREW="$(parse_bool "$2")"
            shift 2
            ;;
        --extra-dir)
            [[ $# -ge 2 ]] || die "--extra-dir requires a value"
            EXTRA_DIRS+=("$2")
            shift 2
            ;;
        --env)
            [[ $# -ge 2 ]] || die "--env requires a value"
            ENV_ASSIGNMENTS+=("$2")
            shift 2
            ;;
        --api-key-env)
            [[ $# -ge 2 ]] || die "--api-key-env requires a value"
            API_KEY_ENV_ASSIGNMENTS+=("$2")
            shift 2
            ;;
        --watch)
            [[ $# -ge 2 ]] || die "--watch requires a value"
            WATCH="$(parse_bool "$2")"
            shift 2
            ;;
        --watch-debounce-ms)
            [[ $# -ge 2 ]] || die "--watch-debounce-ms requires a value"
            WATCH_DEBOUNCE_MS="$2"
            shift 2
            ;;
        --skip-openclaw-install)
            SKIP_OPENCLAW_INSTALL=1
            shift
            ;;
        --skip-clawhub-install)
            SKIP_CLAWHUB_INSTALL=1
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
        --yes)
            CONFIRM_WRITE=1
            YES=1
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

ensure_supported_scope
ensure_node_manager_supported
check_prerequisites

[[ -d "$SOURCE_DIR" ]] || die "Source skills directory not found: $SOURCE_DIR"

if [[ ${#REQUESTED_SKILLS[@]} -eq 0 ]]; then
    while IFS= read -r skill_name; do
        REQUESTED_SKILLS+=("$skill_name")
    done < <(find "$SOURCE_DIR" -mindepth 1 -maxdepth 1 -type d -exec basename {} \; | sort)
fi

[[ ${#REQUESTED_SKILLS[@]} -gt 0 ]] || die "No skills selected"

for skill_name in "${REQUESTED_SKILLS[@]}"; do
    [[ -d "$SOURCE_DIR/$skill_name" ]] || die "Requested skill not found: $SOURCE_DIR/$skill_name"
done

if [[ ${#AGENTS[@]} -gt 0 ]]; then
    for agent_spec in "${AGENTS[@]}"; do
        [[ "$agent_spec" == *:* ]] || die "--agent must be in id:workspace format"
        WORKSPACES+=("${agent_spec#*:}")
    done
fi

install_openclaw_if_needed() {
    if command_exists openclaw; then
        return 0
    fi

    if [[ $SKIP_OPENCLAW_INSTALL -eq 1 ]]; then
        die "OpenClaw is not installed and --skip-openclaw-install was specified"
    fi

    case "$(uname -s)" in
        Darwin|Linux)
            if [[ $DRY_RUN -eq 1 ]]; then
                log "[dry-run] would install OpenClaw runtime via https://openclaw.ai/install.sh (requires --yes + optional checksum)"
                return 0
            fi

            if [[ $YES -ne 1 ]]; then
                die "即将安装外部运行时 OpenClaw（会修改你的系统）。请使用 --yes 显式授权后重试。"
            fi

            log "WARNING: 即将执行外部安装脚本 install.sh（来源 https://openclaw.ai/install.sh）"
            log "         该脚本会修改你的系统；仅当你明确授权（--yes）且已核对校验和后才应继续。"

            local tmp_install actual_sha256 expected
            tmp_install="$(mktemp "/tmp/openclaw-install.XXXXXX.sh")"
            trap 'rm -f "$tmp_install" 2>/dev/null' EXIT
            curl -fsSL https://openclaw.ai/install.sh -o "$tmp_install" || die "下载 OpenClaw install.sh 失败"
            actual_sha256="$(sha256_file "$tmp_install")"

            if [[ -n "${OPENCLAW_INSTALL_SHA256:-}" ]]; then
                expected="$(printf '%s' "$OPENCLAW_INSTALL_SHA256" | tr '[:upper:]' '[:lower:]')"
                if [[ "$(printf '%s' "$actual_sha256" | tr '[:upper:]' '[:lower:]')" != "$expected" ]]; then
                    rm -f "$tmp_install"
                    die "OpenClaw install.sh 校验和不符：期望 $expected，实际 $actual_sha256"
                fi
                log "install.sh 校验和已验证"
            else
                log "WARN: 未设置 OPENCLAW_INSTALL_SHA256，无法校验 install.sh 完整性。下载文件 sha256: $actual_sha256"
            fi

            run_cmd bash "$tmp_install" --no-onboard --no-prompt
            rm -f "$tmp_install"
            ;;
        *)
            die "Automatic OpenClaw installation is only supported by this script on macOS/Linux"
            ;;
    esac
}

build_node_install_command() {
    local package_spec="$1"

    case "$NODE_MANAGER" in
        npm)
            printf 'npm\0install\0-g\0%s\0' "$package_spec"
            ;;
        pnpm)
            printf 'pnpm\0add\0-g\0%s\0' "$package_spec"
            ;;
        yarn)
            printf 'yarn\0global\0add\0%s\0' "$package_spec"
            ;;
        bun)
            printf 'bun\0add\0-g\0%s\0' "$package_spec"
            ;;
    esac
}

run_node_install() {
    local package_spec="$1"
    local -a cmd=()

    while IFS= read -r -d '' part; do
        cmd+=("$part")
    done < <(build_node_install_command "$package_spec")

    run_cmd "${cmd[@]}"
}

install_clawhub_if_needed() {
    if command_exists clawhub; then
        return 0
    fi

    if [[ $SKIP_CLAWHUB_INSTALL -eq 1 ]]; then
        return 0
    fi

    if [[ $DRY_RUN -eq 1 ]]; then
        log "[dry-run] would install ClawHub via ${NODE_MANAGER} install -g clawhub (requires --yes)"
        return 0
    fi

    if [[ $YES -ne 1 ]]; then
        die "即将安装外部包 ClawHub（${NODE_MANAGER} install -g，会修改你的系统）。请使用 --yes 显式授权后重试。"
    fi

    log "WARNING: 即将通过 ${NODE_MANAGER} install -g 安装 ClawHub（会修改你的系统）；仅当你明确授权（--yes）后才应继续。"

    if ! command_exists "$NODE_MANAGER"; then
        die "Required node manager not found on PATH: $NODE_MANAGER"
    fi

    run_node_install "clawhub@latest"
}

sync_skill_dir() {
    local skill_name="$1"
    local destination_root="$2"
    local destination_dir="$destination_root/$skill_name"

    if [[ -d "$destination_dir" ]]; then
        run_cmd cp -a "$destination_dir" "${destination_dir}.bak.$(date +%Y%m%d%H%M%S).$$"
    fi
    run_cmd mkdir -p "$destination_root"
    run_cmd rsync -a --delete "$SOURCE_DIR/$skill_name/" "$destination_dir/"
}

ensure_env_file_path() {
    local path_entry="$1"

    run_cmd mkdir -p "$(dirname "$ENV_FILE")"
    if [[ $DRY_RUN -eq 1 ]]; then
        log "+ ensure PATH entry in $ENV_FILE: $path_entry"
        return 0
    fi

    touch "$ENV_FILE"
    if ! grep -Fqx "PATH=$path_entry:\$PATH" "$ENV_FILE" 2>/dev/null; then
        printf 'PATH=%s:$PATH\n' "$path_entry" >> "$ENV_FILE"
    fi
}

extract_skill_metadata() {
    local skill_dir="$1"
    local skill_name="$2"
    local brew_available=0

    if command_exists brew; then
        brew_available=1
    fi

    SKILL_DIR="$skill_dir" \
    SKILL_NAME="$skill_name" \
    PLATFORM="$(uname -s | tr '[:upper:]' '[:lower:]')" \
    PREFER_BREW="$PREFER_BREW" \
    BREW_AVAILABLE="$brew_available" \
    node <<'NODE'
const fs = require("node:fs");
const path = require("node:path");

const skillDir = process.env.SKILL_DIR;
const skillName = process.env.SKILL_NAME;
const platform = process.env.PLATFORM || process.platform;
const preferBrew = process.env.PREFER_BREW === "1";
const brewAvailable = process.env.BREW_AVAILABLE === "1";
const skillFile = path.join(skillDir, "SKILL.md");
const text = fs.readFileSync(skillFile, "utf8");
const match = text.match(/^---\n([\s\S]*?)\n---\n?/);
const frontmatter = {};

if (match) {
  for (const line of match[1].split(/\r?\n/)) {
    const entry = line.match(/^([A-Za-z0-9._-]+):\s*(.*)$/);
    if (entry) {
      frontmatter[entry[1]] = entry[2];
    }
  }
}

let metadata = {};
if (frontmatter.metadata) {
  try {
    metadata = JSON.parse(frontmatter.metadata);
  } catch {
    metadata = {};
  }
}

const openclaw = metadata.openclaw && typeof metadata.openclaw === "object" ? metadata.openclaw : {};
const install = Array.isArray(openclaw.install) ? openclaw.install.filter((spec) => {
  if (!spec || typeof spec !== "object") {
    return false;
  }
  if (!Array.isArray(spec.os) || spec.os.length === 0) {
    return true;
  }
  return spec.os.includes(platform);
}) : [];

let preferredInstall = null;
if (install.length > 0) {
  if (preferBrew && brewAvailable) {
    preferredInstall = install.find((spec) => spec.kind === "brew") || null;
  }
  if (!preferredInstall) {
    preferredInstall =
      install.find((spec) => spec.kind === "node") ||
      install.find((spec) => spec.kind === "uv") ||
      install.find((spec) => spec.kind === "go") ||
      install.find((spec) => spec.kind === "download") ||
      install[0] ||
      null;
  }
}

const requires = openclaw.requires && typeof openclaw.requires === "object" ? openclaw.requires : {};
const skillKey = typeof openclaw.skillKey === "string" && openclaw.skillKey.trim() ? openclaw.skillKey.trim() : skillName;
const result = {
  skillKey,
  primaryEnv: typeof openclaw.primaryEnv === "string" ? openclaw.primaryEnv : "",
  requiredBins: Array.isArray(requires.bins) ? requires.bins : [],
  preferredInstall,
};

process.stdout.write(JSON.stringify(result));
NODE
}

json_get() {
    local json_payload="$1"
    local expression="$2"

    JSON_PAYLOAD="$json_payload" JSON_EXPR="$expression" node <<'NODE'
const payload = JSON.parse(process.env.JSON_PAYLOAD);
const expr = process.env.JSON_EXPR;
const parts = expr.split('.');
let current = payload;
for (const part of parts) {
  if (!part) continue;
  if (current === null || current === undefined) {
    current = "";
    break;
  }
  current = current[part];
}
if (current === null || current === undefined) {
  process.stdout.write("");
} else if (typeof current === "string") {
  process.stdout.write(current);
} else {
  process.stdout.write(JSON.stringify(current));
}
NODE
}

has_all_bins() {
    local bins_json="$1"
    local bin_name

    [[ -z "$bins_json" || "$bins_json" == "[]" ]] && return 0

    while IFS= read -r bin_name; do
        [[ -z "$bin_name" ]] && continue
        if ! command_exists "$bin_name" && [[ ! -x "$BIN_DIR/$bin_name" ]]; then
            return 1
        fi
    done < <(printf '%s' "$bins_json" | node -e 'const bins=JSON.parse(require("node:fs").readFileSync(0,"utf8")); for (const bin of bins) console.log(bin);')

    return 0
}

install_download_spec() {
    local skill_name="$1"
    local spec_json="$2"
    local url archive extract strip_components target_dir bins_json expected_sha256 actual_sha256
    local tmp_dir archive_path extract_dir link_target bin_name

    url="$(json_get "$spec_json" url)"
    archive="$(json_get "$spec_json" archive)"
    extract="$(json_get "$spec_json" extract)"
    strip_components="$(json_get "$spec_json" stripComponents)"
    target_dir="$(json_get "$spec_json" targetDir)"
    bins_json="$(json_get "$spec_json" bins)"
    expected_sha256="$(json_get "$spec_json" sha256)"

    [[ -n "$url" ]] || die "Download installer for $skill_name is missing url"
    [[ -n "$target_dir" ]] || target_dir="$TOOLS_DIR/$skill_name"

    if [[ -n "$expected_sha256" && ! "$expected_sha256" =~ ^[[:xdigit:]]{64}$ ]]; then
        die "Download installer for $skill_name has an invalid sha256 value"
    fi

    tmp_dir="$(mktemp -d /tmp/openclaw-skill-download.XXXXXX)"
    archive_path="$tmp_dir/archive"
    extract_dir="$tmp_dir/extracted"

    if [[ $DRY_RUN -eq 1 ]]; then
        log "+ download $url -> $target_dir"
        if [[ -n "$expected_sha256" ]]; then
            log "+ verify sha256 $expected_sha256"
        else
            log "WARN: Download installer for $skill_name has no sha256; integrity cannot be verified"
        fi
        rm -rf "$tmp_dir"
        return 0
    fi

    if [[ $YES -ne 1 ]]; then
        rm -rf "$tmp_dir"
        die "即将下载并安装外部依赖（${skill_name} 的 download 类型安装器，会修改你的系统）。请使用 --yes 显式授权后重试。"
    fi

    mkdir -p "$extract_dir" "$BIN_DIR"
    curl -fsSL "$url" -o "$archive_path" || { rm -rf "$tmp_dir"; die "下载失败: $url"; }

    if [[ -n "$expected_sha256" ]]; then
        actual_sha256="$(sha256_file "$archive_path")"
        expected_sha256="$(printf '%s' "$expected_sha256" | tr '[:upper:]' '[:lower:]')"
        actual_sha256="$(printf '%s' "$actual_sha256" | tr '[:upper:]' '[:lower:]')"
        if [[ "$actual_sha256" != "$expected_sha256" ]]; then
            rm -rf "$tmp_dir"
            die "SHA-256 mismatch for $skill_name download: expected $expected_sha256, got $actual_sha256"
        fi
    else
        log "WARN: Download installer for $skill_name has no sha256; integrity was not verified"
    fi

    mkdir -p "$target_dir"

    if [[ "$extract" == "true" || -n "$archive" ]]; then
        case "$archive" in
            tar.gz|tgz|"")
                tar -xzf "$archive_path" -C "$extract_dir" ${strip_components:+--strip-components="$strip_components"}
                ;;
            tar.bz2)
                tar -xjf "$archive_path" -C "$extract_dir" ${strip_components:+--strip-components="$strip_components"}
                ;;
            zip)
                unzip -q "$archive_path" -d "$extract_dir"
                ;;
            *)
                die "Unsupported archive format for $skill_name: $archive"
                ;;
        esac
        rsync -a --delete "$extract_dir/" "$target_dir/"
    else
        cp "$archive_path" "$target_dir/"
    fi

    if [[ -n "$bins_json" && "$bins_json" != "[]" ]]; then
        while IFS= read -r bin_name; do
            [[ -z "$bin_name" ]] && continue
            link_target=""
            if [[ -x "$target_dir/$bin_name" ]]; then
                link_target="$target_dir/$bin_name"
            elif [[ -x "$target_dir/bin/$bin_name" ]]; then
                link_target="$target_dir/bin/$bin_name"
            fi

            if [[ -n "$link_target" ]]; then
                ln -sf "$link_target" "$BIN_DIR/$bin_name"
            fi
        done < <(printf '%s' "$bins_json" | node -e 'const bins=JSON.parse(require("node:fs").readFileSync(0,"utf8")); for (const bin of bins) console.log(bin);')
        ensure_env_file_path "$BIN_DIR"
    fi

    rm -rf "$tmp_dir"
}

install_skill_dependencies() {
    local skill_name="$1"
    local skill_dir="$2"
    local metadata_json skill_key required_bins install_spec install_kind bins_json package_spec go_module formula uv_package

    metadata_json="$(extract_skill_metadata "$skill_dir" "$skill_name")"
    skill_key="$(json_get "$metadata_json" skillKey)"
    required_bins="$(json_get "$metadata_json" requiredBins)"
    install_spec="$(json_get "$metadata_json" preferredInstall)"

    if has_all_bins "$required_bins"; then
        return 0
    fi

    if [[ -z "$install_spec" || "$install_spec" == "null" ]]; then
        if [[ -n "$required_bins" && "$required_bins" != "[]" ]]; then
            die "Skill $skill_key requires missing bins but does not declare metadata.openclaw.install"
        fi
        return 0
    fi

    install_kind="$(json_get "$install_spec" kind)"
    bins_json="$(json_get "$install_spec" bins)"

    case "$install_kind" in
        brew)
            formula="$(json_get "$install_spec" formula)"
            [[ -n "$formula" ]] || die "Brew installer for $skill_key is missing formula"
            run_cmd brew install "$formula"
            ;;
        node)
            package_spec="$(json_get "$install_spec" package)"
            [[ -n "$package_spec" ]] || die "Node installer for $skill_key is missing package"
            run_node_install "$package_spec"
            ;;
        go)
            go_module="$(json_get "$install_spec" module)"
            [[ -n "$go_module" ]] || die "Go installer for $skill_key is missing module"
            if ! command_exists go; then
                if command_exists brew; then
                    run_cmd brew install go
                else
                    die "go is required for $skill_key and brew is unavailable"
                fi
            fi
            if command_exists brew; then
                export GOBIN="$(brew --prefix)/bin"
            fi
            run_cmd go install "$go_module"
            ;;
        uv)
            uv_package="$(json_get "$install_spec" package)"
            [[ -n "$uv_package" ]] || die "uv installer for $skill_key is missing package"
            if ! command_exists uv; then
                if command_exists brew; then
                    run_cmd brew install uv
                else
                    die "uv is required for $skill_key and brew is unavailable"
                fi
            fi
            run_cmd uv tool install "$uv_package"
            ;;
        download)
            install_download_spec "$skill_key" "$install_spec"
            ;;
        *)
            die "Unsupported OpenClaw installer kind: $install_kind"
            ;;
    esac

    if ! has_all_bins "$bins_json" && ! has_all_bins "$required_bins"; then
        die "Dependency installation for $skill_key completed but required bins are still missing"
    fi
}

sync_selected_skills() {
    local destination_root="$1"
    local skill_name

    for skill_name in "${REQUESTED_SKILLS[@]}"; do
        sync_skill_dir "$skill_name" "$destination_root"
        install_skill_dependencies "$skill_name" "$SOURCE_DIR/$skill_name"
    done
}

build_json_array() {
    local input_name="$1"
    local item_count

    eval "item_count=\${#${input_name}[@]}"
    if [[ "$item_count" -eq 0 ]]; then
        printf '[]'
        return 0
    fi

    eval "printf '%s\\0' \"\
\${${input_name}[@]}\"" | node -e '
const fs = require("node:fs");
const raw = fs.readFileSync(0);
const items = raw.length === 0 ? [] : raw.toString("utf8").split("\0").filter(Boolean);
process.stdout.write(JSON.stringify(items));
'
}

patch_openclaw_config() {
    local workspaces_json agents_json extra_dirs_json env_json api_key_json requested_skills_json default_workspace

    default_workspace="${WORKSPACES[0]:-${STATE_DIR}/workspace}"
    workspaces_json="$(build_json_array WORKSPACES)"
    agents_json="$(build_json_array AGENTS)"
    extra_dirs_json="$(build_json_array EXTRA_DIRS)"
    env_json="$(build_json_array ENV_ASSIGNMENTS)"
    api_key_json="$(build_json_array API_KEY_ENV_ASSIGNMENTS)"
    requested_skills_json="$(build_json_array REQUESTED_SKILLS)"

    run_cmd mkdir -p "$(dirname "$CONFIG_PATH")"

    if [[ -f "$CONFIG_PATH" ]]; then
        run_cmd cp -a "$CONFIG_PATH" "${CONFIG_PATH}.bak.$(date +%Y%m%d%H%M%S).$$"
    fi

    if [[ $DRY_RUN -eq 1 ]]; then
        log "+ patch OpenClaw config: $CONFIG_PATH"
        return 0
    fi

    CONFIG_PATH="$CONFIG_PATH" \
    DEFAULT_WORKSPACE="$default_workspace" \
    NODE_MANAGER="$NODE_MANAGER" \
    PREFER_BREW="$PREFER_BREW" \
    WATCH="$WATCH" \
    WATCH_DEBOUNCE_MS="$WATCH_DEBOUNCE_MS" \
    EXTRA_DIRS_JSON="$extra_dirs_json" \
    ENV_ASSIGNMENTS_JSON="$env_json" \
    API_KEY_ENV_ASSIGNMENTS_JSON="$api_key_json" \
    AGENTS_JSON="$agents_json" \
    REQUESTED_SKILLS_JSON="$requested_skills_json" \
    DEFAULT_AGENT_ID="$DEFAULT_AGENT_ID" \
    node <<'NODE'
const fs = require("node:fs");
const path = require("node:path");

const configPath = process.env.CONFIG_PATH;
const defaultWorkspace = process.env.DEFAULT_WORKSPACE;
const nodeManager = process.env.NODE_MANAGER;
const preferBrew = process.env.PREFER_BREW === "1";
const watch = process.env.WATCH === "1";
const watchDebounceMs = Number(process.env.WATCH_DEBOUNCE_MS || "250");
const extraDirs = JSON.parse(process.env.EXTRA_DIRS_JSON || "[]");
const envAssignments = JSON.parse(process.env.ENV_ASSIGNMENTS_JSON || "[]");
const apiKeyAssignments = JSON.parse(process.env.API_KEY_ENV_ASSIGNMENTS_JSON || "[]");
const agents = JSON.parse(process.env.AGENTS_JSON || "[]");
const requestedSkills = JSON.parse(process.env.REQUESTED_SKILLS_JSON || "[]");
const defaultAgentId = process.env.DEFAULT_AGENT_ID || "";

let config = {};
if (fs.existsSync(configPath)) {
  const raw = fs.readFileSync(configPath, "utf8").trim();
  if (raw) {
    config = Function(`"use strict"; return (${raw});`)();
  }
}

config.agents = config.agents && typeof config.agents === "object" ? config.agents : {};
config.agents.defaults = config.agents.defaults && typeof config.agents.defaults === "object" ? config.agents.defaults : {};
config.agents.defaults.workspace = config.agents.defaults.workspace || defaultWorkspace;

config.skills = config.skills && typeof config.skills === "object" ? config.skills : {};
config.skills.load = config.skills.load && typeof config.skills.load === "object" ? config.skills.load : {};
config.skills.install = config.skills.install && typeof config.skills.install === "object" ? config.skills.install : {};
config.skills.entries = config.skills.entries && typeof config.skills.entries === "object" ? config.skills.entries : {};

config.skills.load.watch = watch;
config.skills.load.watchDebounceMs = watchDebounceMs;
config.skills.load.extraDirs = Array.from(new Set([...(Array.isArray(config.skills.load.extraDirs) ? config.skills.load.extraDirs : []), ...extraDirs]));
config.skills.install.nodeManager = nodeManager;
config.skills.install.preferBrew = preferBrew;

for (const skill of requestedSkills) {
  config.skills.entries[skill] = config.skills.entries[skill] && typeof config.skills.entries[skill] === "object" ? config.skills.entries[skill] : {};
  if (typeof config.skills.entries[skill].enabled === "undefined") {
    config.skills.entries[skill].enabled = true;
  }
}

for (const item of envAssignments) {
  const match = /^([^:]+):([^=]+)=(.*)$/.exec(item);
  if (!match) continue;
  const [, skill, key, value] = match;
  config.skills.entries[skill] = config.skills.entries[skill] && typeof config.skills.entries[skill] === "object" ? config.skills.entries[skill] : {};
  config.skills.entries[skill].env = config.skills.entries[skill].env && typeof config.skills.entries[skill].env === "object" ? config.skills.entries[skill].env : {};
  config.skills.entries[skill].env[key] = value;
}

for (const item of apiKeyAssignments) {
  const match = /^([^:]+):([A-Z][A-Z0-9_]*)$/.exec(item);
  if (!match) continue;
  const [, skill, envVar] = match;
  config.skills.entries[skill] = config.skills.entries[skill] && typeof config.skills.entries[skill] === "object" ? config.skills.entries[skill] : {};
  config.skills.entries[skill].apiKey = { source: "env", provider: "default", id: envVar };
}

if (agents.length > 0) {
  const parsedAgents = agents
    .map((entry) => {
      const idx = entry.indexOf(":");
      if (idx === -1) return null;
      return { id: entry.slice(0, idx), workspace: entry.slice(idx + 1) };
    })
    .filter(Boolean);

  config.agents.list = Array.isArray(config.agents.list) ? config.agents.list : [];
  const existingById = new Map(config.agents.list.map((entry) => [entry.id, entry]));

  for (const agent of parsedAgents) {
    const current = existingById.get(agent.id) || { id: agent.id };
    current.workspace = agent.workspace;
    if (defaultAgentId) {
      current.default = agent.id === defaultAgentId;
    }
    existingById.set(agent.id, current);
  }

  config.agents.list = Array.from(existingById.values());
}

fs.mkdirSync(path.dirname(configPath), { recursive: true });
fs.writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`, "utf8");
NODE
}

install_openclaw_if_needed
install_clawhub_if_needed

if [[ $DRY_RUN -eq 0 && $CONFIRM_WRITE -eq 0 ]]; then
    die "Refusing global changes without --yes. Run once with --dry-run, review the plan, then rerun with --yes."
fi

case "$SCOPE" in
    managed|both)
        sync_selected_skills "$MANAGED_DIR"
        ;;
esac

case "$SCOPE" in
    workspace|both)
        if [[ ${#WORKSPACES[@]} -eq 0 ]]; then
            WORKSPACES+=("${STATE_DIR}/workspace")
        fi
        for workspace in "${WORKSPACES[@]}"; do
            sync_selected_skills "$workspace/skills"
        done
        ;;
esac

patch_openclaw_config

if [[ $DRY_RUN -eq 0 && $SKIP_DOCTOR -eq 0 ]] && command_exists openclaw; then
    run_cmd openclaw doctor
fi

log "OpenClaw skill auto-configuration complete"
