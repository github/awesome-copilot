#!/usr/bin/env bash
set -euo pipefail

# Sandbox npm Install Script
# Installs node_modules on local ext4 filesystem and symlinks into the workspace.
# This avoids native binary crashes (esbuild, lightningcss, rollup) on virtiofs.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(git -C "$SCRIPT_DIR" rev-parse --show-toplevel 2>/dev/null || echo "$PWD")"

# Preflight: ensure node and npm are available
for cmd in node npm; do
  command -v "$cmd" >/dev/null 2>&1 || { echo "ERROR: $cmd is required but not found."; exit 1; }
done

DEPS_DIR="/home/agent/project-deps"
WORKSPACE_CLIENT=""
INSTALL_PLAYWRIGHT="false"
VERIFY_BINARIES="true"

usage() {
  cat <<EOF
Usage: $(basename "$0") [options]

Options:
  --workspace <path>   Client workspace containing package.json
  --deps-dir <path>    Local ext4 install directory (default: /home/agent/project-deps)
  --playwright         Install Playwright Chromium browser
  --no-verify          Skip native binary verification
  --help               Show this help message

Examples:
  bash skills/sandbox-npm-install/install.sh
  bash skills/sandbox-npm-install/install.sh --workspace app/client --playwright
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --workspace)
      [[ -n "${2:-}" ]] || { echo "ERROR: --workspace requires a path argument."; exit 1; }
      WORKSPACE_CLIENT="$2"
      shift 2
      ;;
    --deps-dir)
      [[ -n "${2:-}" ]] || { echo "ERROR: --deps-dir requires a path argument."; exit 1; }
      DEPS_DIR="$2"
      shift 2
      ;;
    --playwright)
      INSTALL_PLAYWRIGHT="true"
      shift
      ;;
    --no-verify)
      VERIFY_BINARIES="false"
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

# Sandbox environment detection
if [[ ! -f /.dockerenv ]] && ! grep -q 'docker\|container' /proc/1/cgroup 2>/dev/null; then
  echo "WARNING: This does not appear to be a Docker Sandbox environment."
  echo "Running this script outside the sandbox will replace node_modules with a symlink"
  echo "pointing to a sandbox-local path that does not exist on your machine."
  echo "Set FORCE_SANDBOX_INSTALL=1 to override."
  [[ "${FORCE_SANDBOX_INSTALL:-}" == "1" ]] || exit 1
fi

# Validate DEPS_DIR is absolute and safe before any normalization
if [[ "${DEPS_DIR#/}" == "$DEPS_DIR" ]]; then
  echo "ERROR: --deps-dir must be an absolute path (got '$DEPS_DIR')."
  exit 1
fi
DEPS_DIR="$(cd "$(dirname "$DEPS_DIR")" 2>/dev/null && echo "$(pwd)/$(basename "$DEPS_DIR")" || echo "$DEPS_DIR")"
case "$DEPS_DIR" in
  /|/bin|/boot|/dev|/etc|/home|/home/agent|/lib*|/opt|/proc|/root|/run|/sbin|/srv|/sys|/tmp|/usr|/var)
    echo "ERROR: --deps-dir '$DEPS_DIR' is a protected system path. Refusing to continue."
    exit 1 ;;
esac

if [[ -z "$WORKSPACE_CLIENT" ]]; then
  if [[ -f "$PWD/package.json" ]]; then
    WORKSPACE_CLIENT="$PWD"
  elif [[ -f "$REPO_ROOT/package.json" ]]; then
    WORKSPACE_CLIENT="$REPO_ROOT"
  fi
fi

WORKSPACE_CLIENT="$(cd "$WORKSPACE_CLIENT" 2>/dev/null && pwd || true)"

if [[ -z "$WORKSPACE_CLIENT" || ! -f "$WORKSPACE_CLIENT/package.json" ]]; then
  echo "Could not find a valid workspace client path containing package.json."
  echo "Use --workspace <path> to specify it explicitly."
  exit 1
fi

echo "=== Sandbox npm Install ==="
echo "Workspace: $WORKSPACE_CLIENT"
echo "Deps dir:  $DEPS_DIR"

# Step 1: Prepare local deps directory
echo "→ Preparing $DEPS_DIR..."
rm -rf "$DEPS_DIR"
mkdir -p "$DEPS_DIR"
cp "$WORKSPACE_CLIENT/package.json" "$DEPS_DIR/"

if [[ -f "$WORKSPACE_CLIENT/package-lock.json" ]]; then
  cp "$WORKSPACE_CLIENT/package-lock.json" "$DEPS_DIR/"
  INSTALL_CMD=(npm ci)
else
  echo "! package-lock.json not found; falling back to npm install"
  INSTALL_CMD=(npm install)
fi

# Copy .npmrc if present (custom registries, scoped package configs)
if [[ -f "$WORKSPACE_CLIENT/.npmrc" ]]; then
  cp "$WORKSPACE_CLIENT/.npmrc" "$DEPS_DIR/"
  echo "  Copied .npmrc from workspace"
elif [[ -f "$HOME/.npmrc" ]]; then
  cp "$HOME/.npmrc" "$DEPS_DIR/"
  echo "  Copied .npmrc from \$HOME"
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
    const deps={...(pkg.dependencies||{}),...(pkg.devDependencies||{}),...(pkg.optionalDependencies||{}),...(pkg.peerDependencies||{})};
    process.exit(deps[process.argv[2]] ? 0 : 1);
  " "$WORKSPACE_CLIENT/package.json" "$dep"
}

verify_one() {
  local label="$1"
  shift
  if "$@" 2>/dev/null; then
    echo "  ✓ $label OK"
    return 0
  fi

  echo "  ✗ $label FAIL"
  return 1
}

if [[ "$VERIFY_BINARIES" == "true" ]]; then
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
fi

# Step 5: Optionally install Playwright
if [[ "$INSTALL_PLAYWRIGHT" == "true" ]]; then
  echo "→ Installing Playwright browsers..."
  npx playwright install --with-deps chromium
fi

echo ""
echo "=== ✓ Sandbox npm install complete ==="
echo "Run 'npm run dev' to start the dev server."
