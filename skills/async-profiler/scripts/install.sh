#!/usr/bin/env bash
# install.sh — Download and install async-profiler for the current platform.
#
# Usage:
#   ./install.sh                  # installs to ~/async-profiler-4.3
#   ./install.sh /opt/profilers   # installs to /opt/profilers/async-profiler-4.3
#   ./install.sh --path-only      # just prints the install path (for scripting)
#
# After install, the script prints the path to the asprof binary.

set -euo pipefail

VERSION="4.3"
BASE_URL="https://github.com/async-profiler/async-profiler/releases/download/v${VERSION}"
INSTALL_PARENT="${1:-$HOME}"

# --path-only: don't install, just print where asprof would end up
if [[ "${1:-}" == "--path-only" ]]; then
  echo "$HOME/async-profiler-${VERSION}/bin/asprof"
  exit 0
fi

# ── Detect platform ──────────────────────────────────────────────────────────
OS="$(uname -s)"
ARCH="$(uname -m)"

case "$OS" in
  Darwin)
    PLATFORM="macos"
    ;;
  Linux)
    PLATFORM="linux"
    ;;
  *)
    echo "❌ Unsupported OS: $OS (async-profiler supports Linux and macOS)"
    exit 1
    ;;
esac

case "$ARCH" in
  x86_64|amd64)  ARCH_LABEL="x64" ;;
  aarch64|arm64) ARCH_LABEL="arm64" ;;
  *)
    echo "❌ Unsupported architecture: $ARCH"
    exit 1
    ;;
esac

# macOS ships as a single universal binary (covers both x64 and arm64)
if [[ "$PLATFORM" == "macos" ]]; then
  ARCHIVE="async-profiler-${VERSION}-macos.zip"
  EXTRACTED_DIR="async-profiler-${VERSION}-macos"
else
  ARCHIVE="async-profiler-${VERSION}-linux-${ARCH_LABEL}.tar.gz"
  EXTRACTED_DIR="async-profiler-${VERSION}-linux-${ARCH_LABEL}"
fi

INSTALL_DIR="${INSTALL_PARENT}/async-profiler-${VERSION}"
DOWNLOAD_URL="${BASE_URL}/${ARCHIVE}"

# ── Already installed? ───────────────────────────────────────────────────────
if [[ -x "${INSTALL_DIR}/bin/asprof" ]]; then
  echo "✅ async-profiler ${VERSION} is already installed at: ${INSTALL_DIR}"
  echo "   Binary: ${INSTALL_DIR}/bin/asprof"
  exit 0
fi

# Destination exists but is not a valid installation — refuse to clobber.
if [[ -e "${INSTALL_DIR}" ]]; then
  echo "❌ Install destination already exists but does not appear to be a valid async-profiler installation:"
  echo "   ${INSTALL_DIR}"
  echo "   Expected executable: ${INSTALL_DIR}/bin/asprof"
  echo "   Remove it manually and re-run, or choose a different parent directory:"
  echo "   bash scripts/install.sh /path/to/dir"
  exit 1
fi

# ── Download ─────────────────────────────────────────────────────────────────
echo "📦 Installing async-profiler ${VERSION} for ${PLATFORM}-${ARCH_LABEL}..."
echo "   Downloading: ${DOWNLOAD_URL}"

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

cd "$TMP_DIR"

if command -v curl &>/dev/null; then
  curl -fsSL -o "$ARCHIVE" "$DOWNLOAD_URL"
elif command -v wget &>/dev/null; then
  wget -q -O "$ARCHIVE" "$DOWNLOAD_URL"
else
  echo "❌ Neither curl nor wget found. Install one and retry."
  exit 1
fi

# ── Extract ──────────────────────────────────────────────────────────────────
echo "   Extracting..."
if [[ "$ARCHIVE" == *.zip ]]; then
  if ! command -v unzip &>/dev/null; then
    echo "❌ 'unzip' is required to extract the macOS archive but was not found."
    echo "   Install it with: brew install unzip"
    exit 1
  fi
  unzip -q "$ARCHIVE"
else
  tar xf "$ARCHIVE"
fi

# Move into place
mkdir -p "$INSTALL_PARENT"
mv "$EXTRACTED_DIR" "$INSTALL_DIR"
chmod +x "${INSTALL_DIR}/bin/asprof"

# macOS: remove quarantine flag so Gatekeeper doesn't block it
if [[ "$PLATFORM" == "macos" ]]; then
  xattr -dr com.apple.quarantine "${INSTALL_DIR}" 2>/dev/null || true
fi

# ── Verify ───────────────────────────────────────────────────────────────────
ASPROF="${INSTALL_DIR}/bin/asprof"
if ! "$ASPROF" --version &>/dev/null; then
  echo "❌ Installed but 'asprof --version' failed. Check $INSTALL_DIR"
  exit 1
fi

INSTALLED_VERSION="$("$ASPROF" --version 2>&1 | head -1)"

echo ""
echo "✅ async-profiler installed successfully!"
echo "   Version : $INSTALLED_VERSION"
echo "   Location: ${INSTALL_DIR}"
echo "   Binary  : ${ASPROF}"
echo ""
echo "To add asprof to your PATH, add this to ~/.zshrc or ~/.bashrc:"
echo "   export PATH=\"${INSTALL_DIR}/bin:\$PATH\""
echo ""

# ── macOS: print limitation note ─────────────────────────────────────────────
if [[ "$PLATFORM" == "macos" ]]; then
  echo "ℹ️  macOS note: async-profiler uses the itimer CPU engine on macOS."
  echo "   Kernel stack frames are not available (platform limitation)."
  echo "   CPU and allocation profiles are still highly useful."
  echo ""
fi

echo "Quick test (requires a running JVM — find PID with: jps -l):"
echo "   asprof -d 5 <PID>"
