#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
python3 - <<'PY' >/dev/null 2>&1 || {
import pyflp, numpy, soundfile, psutil
PY
  echo "Installing DAW Bridge GOD MODE 4.2 dependencies (internet required on first run)…"
  python3 -m pip install -r requirements.txt
}
exec python3 launch_daw_bridge.py "$@"
