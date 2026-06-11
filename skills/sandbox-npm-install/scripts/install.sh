#!/usr/bin/env bash
set -euo pipefail

# Sandbox npm Install Script
# Installs node_modules on local ext4 filesystem and symlinks into the workspace.
# This avoids native binary crashes (esbuild, lightningcss, rollup) on virtiofs.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

# Local ext4 base directory where node_modules is installed to avoid virtiofs crashes.
# Change this path if your sandbox uses a different local filesystem location.
readonly DEPS_BASE="/home/agent/project-deps"
WORKSPACE_CLIENT=""
INSTALL_PLAYWRIGHT="false"

usage() {
  cat <<EOF
Usage: $(basename "$0") [options]

Options:
  --workspace <path>   Client workspace containing package.json
  --playwright         Install Playwright Chromium browser
  --help               Show this help message

Examples:
  bash scripts/install.sh
  bash scripts/install.sh --workspace app/client --playwright
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --workspace)
      if [[ -z "${2:-}" ]]; then
        echo "Error: --workspace requires a path argument"
        usage
        exit 1
      fi
      WORKSPACE_CLIENT="$2"
      shift 2
      ;;
    --playwright)
      INSTALL_PLAYWRIGHT="true"
      shift
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      usage
      exit 1
      ;;
  esac
done

if [[ -z "$WORKSPACE_CLIENT" ]]; then
  if [[ -f "$PWD/package.json" ]]; then
    WORKSPACE_CLIENT="$PWD"
  elif [[ -f "$REPO_ROOT/package.json" ]]; then
    WORKSPACE_CLIENT="$REPO_ROOT"
  fi
fi

if [[ -n "$WORKSPACE_CLIENT" ]]; then
  WORKSPACE_CLIENT="$(cd "$WORKSPACE_CLIENT" 2>/dev/null && pwd || true)"
fi

if [[ -z "$WORKSPACE_CLIENT" || ! -f "$WORKSPACE_CLIENT/package.json" ]]; then
  echo "Could not find a valid workspace client path containing package.json."
  echo "Use --workspace <path> to specify it explicitly."
  exit 1
fi

echo "=== Sandbox npm Install ==="
echo "Workspace: $WORKSPACE_CLIENT"

# Derive a unique subdirectory from the workspace path relative to the repo root.
# e.g. /repo/apps/web -> apps-web, /repo -> <repo-basename>
REL_PATH="${WORKSPACE_CLIENT#"$REPO_ROOT"}"
REL_PATH="${REL_PATH#/}"
if [[ -z "$REL_PATH" ]]; then
  REL_PATH="$(basename "$REPO_ROOT")"
fi
# Sanitize: replace path separators with hyphens
DEPS_SUBDIR="${REL_PATH//\//-}"
DEPS_DIR="${DEPS_BASE}/${DEPS_SUBDIR}"

echo "Deps dir:  $DEPS_DIR"

# Step 1: Prepare local deps directory
echo "→ Preparing $DEPS_DIR..."
if [[ -z "$DEPS_DIR" || "$DEPS_DIR" != "${DEPS_BASE}/"* ]]; then
  echo "ERROR: DEPS_DIR ('$DEPS_DIR') is not under DEPS_BASE ('$DEPS_BASE'). Aborting."
  exit 1
fi
rm -rf "$DEPS_DIR"
mkdir -p "$DEPS_DIR"
chmod 700 "$DEPS_DIR"
cp "$WORKSPACE_CLIENT/package.json" "$DEPS_DIR/"

# Copy .npmrc if present (needed for private registries / scoped packages)
# Permissions restricted to owner-only since .npmrc may contain auth tokens
if [[ -f "$WORKSPACE_CLIENT/.npmrc" ]]; then
  cp "$WORKSPACE_CLIENT/.npmrc" "$DEPS_DIR/"
  chmod 600 "$DEPS_DIR/.npmrc"
fi

if [[ -f "$WORKSPACE_CLIENT/package-lock.json" ]]; then
  cp "$WORKSPACE_CLIENT/package-lock.json" "$DEPS_DIR/"
  INSTALL_CMD=(npm ci)
else
  echo "! package-lock.json not found; falling back to npm install"
  INSTALL_CMD=(npm install)
fi

# Step 2: Install on local ext4
echo "→ Running ${INSTALL_CMD[*]} on local ext4..."
cd "$DEPS_DIR" && "${INSTALL_CMD[@]}"

# Step 3: Symlink into workspace
echo "→ Symlinking node_modules into workspace..."
cd "$WORKSPACE_CLIENT"
rm -rf node_modules
ln -s "$DEPS_DIR/node_modules" node_modules

has_dep() {
  local dep="$1"
  node -e "
    const pkg=require(process.argv[1]);
    const deps={...(pkg.dependencies||{}),...(pkg.devDependencies||{}),...(pkg.optionalDependencies||{})};
    process.exit(deps[process.argv[2]] ? 0 : 1);
  " "$WORKSPACE_CLIENT/package.json" "$dep"
}

verify_one() {
  local label="$1"
  shift
  if "$@" >/dev/null 2>&1; then
    echo "  ✓ $label OK"
    return 0
  fi

  echo "  ✗ $label FAIL"
  return 1
}

# Step 4: Verify native binaries when present in this project
echo "→ Verifying native binaries..."
FAIL=0

if has_dep esbuild; then
  verify_one "esbuild" node -e "require('esbuild').transform('const x: number = 1',{loader:'ts'}).catch(()=>process.exit(1))" || FAIL=1
fi

if has_dep rollup; then
  verify_one "rollup" node -e "import('rollup').catch(()=>process.exit(1))" || FAIL=1
fi

if has_dep lightningcss; then
  verify_one "lightningcss" node -e "try{require('lightningcss')}catch(_){process.exit(1)}" || FAIL=1
fi

if has_dep vite; then
  verify_one "vite" node -e "import('vite').catch(()=>process.exit(1))" || FAIL=1
fi

if [ "$FAIL" -ne 0 ]; then
  echo "✗ Binary verification failed. Try running the script again (crashes can be intermittent)."
  exit 1
fi

# Step 5: Optionally install Playwright
if [[ "$INSTALL_PLAYWRIGHT" == "true" ]]; then
  echo "→ Installing Playwright browsers..."
  if [[ "${EUID:-$(id -u)}" -eq 0 ]]; then
    npx playwright install --with-deps chromium
  elif command -v sudo &>/dev/null && sudo -n true 2>/dev/null; then
    # Non-root but passwordless sudo available — install browsers then system deps
    npx playwright install chromium
    sudo npx playwright install-deps chromium
  else
    npx playwright install chromium
    echo "⚠ System dependencies not installed (no root/sudo access)."
    echo "  Playwright tests may fail. Run: sudo npx playwright install-deps chromium"
  fi
fi

echo ""
echo "=== ✓ Sandbox npm install complete ==="
echo "Run 'npm run dev' to start the dev server."
