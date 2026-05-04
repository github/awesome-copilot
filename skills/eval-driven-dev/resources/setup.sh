#!/usr/bin/env bash
# Setup script for eval-driven-dev skill.
# Updates the skill, installs/upgrades pixie-qa[all], initializes the
# pixie working directory, and starts the web UI server in the background.
#
# Error handling:
#   - Skill update failure → non-fatal (continue with existing version)
#   - pixie-qa upgrade failure when already installed → non-fatal
#   - pixie-qa NOT installed and install fails → FATAL (exit 1)
#   - pixie init failure → FATAL (exit 1)
#   - pixie start failure → FATAL (exit 1)
set -u

echo "=== Updating skill ==="
npx skills update github/awesome-copilot --skill eval-driven-dev -g -y && npx skills update github/awesome-copilot --skill eval-driven-dev -p -y || {
  echo "(skill update failed — proceeding with existing version)"
}

echo ""
echo "=== Installing / upgrading pixie-qa[all] ==="

# Helper: check if pixie CLI is importable
_pixie_available() {
  if [ -f uv.lock ]; then
    uv run python -c "import pixie" 2>/dev/null
  elif [ -f poetry.lock ]; then
    poetry run python -c "import pixie" 2>/dev/null
  else
    python -c "import pixie" 2>/dev/null
  fi
}

# Check if pixie is already installed before attempting upgrade
PIXIE_WAS_INSTALLED=false
if _pixie_available; then
  PIXIE_WAS_INSTALLED=true
fi

INSTALL_OK=false
if [ -f uv.lock ]; then
  # uv add does universal resolution across all Python versions in
  # requires-python.  If the host project supports a Python version
  # where pixie-qa is unavailable (e.g. <3.10), uv add fails.
  # Fall back to uv pip install which only targets the active interpreter.
  if uv add "pixie-qa[all]>=0.8.4,<0.9.0" --upgrade 2>&1; then
    INSTALL_OK=true
  else
    echo "(uv add failed — falling back to uv pip install)"
    if uv pip install "pixie-qa[all]>=0.8.4,<0.9.0" 2>&1; then
      INSTALL_OK=true
    fi
  fi
elif [ -f poetry.lock ]; then
  if poetry add "pixie-qa[all]>=0.8.4,<0.9.0"; then
    INSTALL_OK=true
  fi
else
  if pip install --upgrade "pixie-qa[all]>=0.8.4,<0.9.0"; then
    INSTALL_OK=true
  fi
fi

if [ "$INSTALL_OK" = false ]; then
  if [ "$PIXIE_WAS_INSTALLED" = true ]; then
    echo "(pixie-qa upgrade failed — proceeding with existing version)"
  else
    echo ""
    echo "ERROR: pixie-qa is not installed and installation failed."
    echo "The eval-driven-dev workflow requires the pixie-qa package."
    echo "Please install it manually and re-run this script."
    exit 1
  fi
fi

echo ""
echo "=== Initializing pixie working directory ==="
if [ -f uv.lock ]; then
  uv run pixie init
elif [ -f poetry.lock ]; then
  poetry run pixie init
else
  pixie init
fi

if [ $? -ne 0 ]; then
  echo ""
  echo "ERROR: Failed to initialize pixie working directory."
  echo "Please check the error above and fix it before continuing."
  exit 1
fi

echo ""
echo "=== Starting web UI server (background) ==="
if [ -f uv.lock ]; then
  uv run pixie start
elif [ -f poetry.lock ]; then
  poetry run pixie start
else
  pixie start
fi

if [ $? -ne 0 ]; then
  echo ""
  echo "ERROR: Failed to start the web UI server."
  echo "Please check the error above and fix it before continuing."
  exit 1
fi

echo ""
echo "=== Setup complete ==="
