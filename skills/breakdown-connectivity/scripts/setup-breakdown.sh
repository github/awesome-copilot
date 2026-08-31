#!/bin/sh
set -eu

DOWNLOAD_URL="${BREAKDOWN_DOWNLOAD_URL:-https://breakdown.live/download/mac}"
APP_PATH="${BREAKDOWN_APP_PATH:-/Applications/Breakdown/Breakdown.app}"
BRIDGE_PATH="$APP_PATH/Contents/MacOS/BreakdownMCPBridge"
EXPECTED_INSTALLER_SIGNER="Developer ID Installer: Joel Mulkey (J7JF4A4BQ3)"
EXPECTED_TEAM_ID="J7JF4A4BQ3"
EXPECTED_BUNDLE_ID="com.breakdown.menu"
DISCOVERY_FILE="${BREAKDOWN_MCP_DISCOVERY_FILE:-$HOME/Library/Application Support/Breakdown/local-mcp-server.json}"
APP_PROCESS_NAME="${BREAKDOWN_PROCESS_NAME:-BreakdownMenuBarApp}"

usage() {
    cat <<'EOF'
Usage: setup-breakdown.sh <command> [argument]

Commands:
  status                  Show platform, app, bridge, Codex, and Claude Code availability
  download [path]         Download and verify the stable Breakdown installer
  install [path]          Verify or download a package, then open macOS Installer
  open-app                Open the installed Breakdown app
  configure-codex         Add the installed bridge to Codex MCP configuration
  configure-claude-code   Add the bridge to Claude Code [local|project|user]
  print-config            Print a Claude-style MCP configuration fragment
EOF
}

is_macos() {
    [ "$(uname -s)" = "Darwin" ]
}

macos_major_version() {
    sw_vers -productVersion 2>/dev/null | cut -d. -f1
}

is_supported_macos() {
    if ! is_macos; then
        return 1
    fi
    major_version="$(macos_major_version)"
    case "$major_version" in
        ''|*[!0-9]*) return 1 ;;
        *) [ "$major_version" -ge 13 ] ;;
    esac
}

require_supported_macos() {
    if ! is_macos; then
        echo "Breakdown requires macOS 13 or later." >&2
        exit 1
    fi
    if ! is_supported_macos; then
        echo "Breakdown requires macOS 13 or later; this Mac is running $(sw_vers -productVersion 2>/dev/null || printf 'an unknown version')." >&2
        exit 1
    fi
}

bool_for_path() {
    if [ -e "$1" ]; then
        printf 'true'
    else
        printf 'false'
    fi
}

command_status() {
    if command -v "$1" >/dev/null 2>&1; then
        printf 'true'
    else
        printf 'false'
    fi
}

process_status() {
    if pgrep -U "$(id -u)" -x "$1" >/dev/null 2>&1; then
        printf 'true'
    else
        printf 'false'
    fi
}

codex_configuration_status() {
    if command -v codex >/dev/null 2>&1 && codex mcp get breakdown >/dev/null 2>&1; then
        printf 'true'
    else
        printf 'false'
    fi
}

claude_configuration_status() {
    if command -v claude >/dev/null 2>&1 && claude mcp get breakdown >/dev/null 2>&1; then
        printf 'true'
    else
        printf 'false'
    fi
}

discovery_status() {
    if [ ! -e "$DISCOVERY_FILE" ]; then
        printf 'missing'
        return
    fi

    osascript -l JavaScript - "$DISCOVERY_FILE" 2>/dev/null <<'JXA' || printf 'invalid'
function run(argv) {
  try {
    const app = Application.currentApplication();
    app.includeStandardAdditions = true;
    const value = JSON.parse(app.read(Path(argv[0])));
    if (value === null || Array.isArray(value) || typeof value !== "object") {
      return "invalid";
    }
    if (value.disabled === true) {
      return "disabled";
    }
    const match = typeof value.url === "string"
      ? /^http:\/\/127[.]0[.]0[.]1:([0-9]+)\/mcp$/.exec(value.url)
      : null;
    const port = match ? Number(match[1]) : 0;
    const authorization = value.headers && typeof value.headers.Authorization === "string"
      ? value.headers.Authorization
      : value.headers && typeof value.headers.authorization === "string"
        ? value.headers.authorization
        : "";
    return match && port >= 1 && port <= 65535 && /^Bearer \S+$/.test(authorization)
      ? "configured"
      : "invalid";
  } catch (_) {
    return "invalid";
  }
}
JXA
}

show_status() {
    if is_macos; then
        platform="macos"
        version="$(sw_vers -productVersion 2>/dev/null || printf 'unknown')"
    else
        platform="$(uname -s | tr '[:upper:]' '[:lower:]')"
        version="unknown"
    fi

    printf 'platform=%s\n' "$platform"
    printf 'platform_version=%s\n' "$version"
    printf 'platform_supported=%s\n' "$(if is_supported_macos; then printf 'true'; else printf 'false'; fi)"
    printf 'app_path=%s\n' "$APP_PATH"
    printf 'app_installed=%s\n' "$(bool_for_path "$APP_PATH")"
    printf 'app_running=%s\n' "$(process_status "$APP_PROCESS_NAME")"
    printf 'bridge_path=%s\n' "$BRIDGE_PATH"
    printf 'bridge_installed=%s\n' "$(bool_for_path "$BRIDGE_PATH")"
    printf 'mcp_discovery_file=%s\n' "$DISCOVERY_FILE"
    printf 'mcp_discovery_status=%s\n' "$(discovery_status)"
    printf 'codex_available=%s\n' "$(command_status codex)"
    printf 'codex_configured=%s\n' "$(codex_configuration_status)"
    printf 'claude_code_available=%s\n' "$(command_status claude)"
    printf 'claude_code_configured=%s\n' "$(claude_configuration_status)"
}

verify_package() {
    package_path="$1"
    signature="$(pkgutil --check-signature "$package_path" 2>&1)" || {
        printf '%s\n' "$signature" >&2
        echo "Breakdown installer signature verification failed." >&2
        return 1
    }

    leaf_signer="$(printf '%s\n' "$signature" | sed -n 's/^[[:space:]]*1[.][[:space:]]*//p' | head -n 1)"
    if [ "$leaf_signer" != "$EXPECTED_INSTALLER_SIGNER" ]; then
        printf '%s\n' "$signature" >&2
        echo "Breakdown installer signer did not match: $EXPECTED_INSTALLER_SIGNER" >&2
        return 1
    fi
}

verify_app() {
    if ! codesign --verify --deep --strict "$APP_PATH" >/dev/null 2>&1; then
        echo "Breakdown app signature verification failed at $APP_PATH" >&2
        return 1
    fi

    details="$(codesign -dv --verbose=4 "$APP_PATH" 2>&1)" || {
        echo "Breakdown app identity could not be read at $APP_PATH" >&2
        return 1
    }
    team_id="$(printf '%s\n' "$details" | sed -n 's/^TeamIdentifier=//p' | head -n 1)"
    bundle_id="$(printf '%s\n' "$details" | sed -n 's/^Identifier=//p' | head -n 1)"
    if [ "$team_id" != "$EXPECTED_TEAM_ID" ] || [ "$bundle_id" != "$EXPECTED_BUNDLE_ID" ]; then
        echo "Breakdown app identity did not match the expected publisher and bundle." >&2
        return 1
    fi

    if ! spctl --assess --type execute "$APP_PATH" >/dev/null 2>&1; then
        echo "Breakdown app did not pass macOS security assessment." >&2
        return 1
    fi
}

download_package() {
    require_supported_macos
    output_path="${1:-$PWD/Breakdown-Installer.pkg}"
    output_dir="$(dirname "$output_path")"
    mkdir -p "$output_dir"
    temporary_path="$(mktemp "$output_dir/.Breakdown-Installer.pkg.XXXXXX")"

    cleanup_download() {
        rm -f "$temporary_path"
    }
    trap cleanup_download EXIT HUP INT TERM

    curl --fail --location --silent --show-error --proto '=https' --tlsv1.2 \
        --output "$temporary_path" "$DOWNLOAD_URL"
    verify_package "$temporary_path"
    mv "$temporary_path" "$output_path"
    trap - EXIT HUP INT TERM
    printf '%s\n' "$output_path"
}

open_installer() {
    require_supported_macos
    if [ "$#" -gt 0 ]; then
        package_path="$1"
        verify_package "$package_path"
    else
        package_path="$(download_package "${HOME}/Downloads/Breakdown-Installer.pkg")"
    fi
    open "$package_path"
    printf '%s\n' "$package_path"
}

open_app() {
    require_supported_macos
    if [ ! -d "$APP_PATH" ]; then
        echo "Breakdown is not installed at $APP_PATH" >&2
        exit 1
    fi
    verify_app
    open "$APP_PATH"
}

configure_codex() {
    require_supported_macos
    if [ ! -x "$BRIDGE_PATH" ]; then
        echo "Breakdown MCP bridge is not executable at $BRIDGE_PATH" >&2
        exit 1
    fi
    verify_app
    if ! command -v codex >/dev/null 2>&1; then
        echo "Codex CLI is not available." >&2
        exit 1
    fi
    codex mcp add breakdown -- "$BRIDGE_PATH"
}

configure_claude_code() {
    require_supported_macos
    if [ ! -x "$BRIDGE_PATH" ]; then
        echo "Breakdown MCP bridge is not executable at $BRIDGE_PATH" >&2
        exit 1
    fi
    verify_app
    if ! command -v claude >/dev/null 2>&1; then
        echo "Claude Code CLI is not available." >&2
        exit 1
    fi

    if [ "$#" -eq 0 ]; then
        claude mcp add breakdown -- "$BRIDGE_PATH"
        return
    fi
    if [ "$#" -ne 1 ]; then
        echo "Usage: setup-breakdown.sh configure-claude-code [local|project|user]" >&2
        exit 2
    fi
    case "$1" in
        local|project|user)
            claude mcp add --scope "$1" breakdown -- "$BRIDGE_PATH"
            ;;
        *)
            echo "Claude Code MCP scope must be local, project, or user." >&2
            exit 2
            ;;
    esac
}

print_config() {
    newline_count="$(printf '%s' "$BRIDGE_PATH" | wc -l | tr -d ' ')"
    if [ "$newline_count" -ne 0 ] || printf '%s' "$BRIDGE_PATH" | LC_ALL=C grep '[[:cntrl:]]' >/dev/null; then
        echo "Breakdown MCP bridge path contains unsupported control characters." >&2
        return 1
    fi
    escaped_bridge_path="$(printf '%s' "$BRIDGE_PATH" | sed 's/\\/\\\\/g; s/"/\\"/g')"
    cat <<EOF
{
  "mcpServers": {
    "breakdown": {
      "command": "$escaped_bridge_path"
    }
  }
}
EOF
}

command="${1:-}"
case "$command" in
    status)
        show_status
        ;;
    download)
        shift
        download_package "$@"
        ;;
    install)
        shift
        open_installer "$@"
        ;;
    open-app)
        open_app
        ;;
    configure-codex)
        configure_codex
        ;;
    configure-claude-code)
        shift
        configure_claude_code "$@"
        ;;
    print-config)
        print_config
        ;;
    help|-h|--help)
        usage
        ;;
    *)
        usage >&2
        exit 2
        ;;
esac
