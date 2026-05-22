# Binary Setup

Full installation and update procedure for the `42c-ast` binary.

---

## Caller Verbosity

This procedure is used in two contexts:
- **`42crunch-setup` skill** — verbose: announce each major step to the user.
- **`pre-flight.md`** (all other skills) — silent: suppress all output except:
  - `"42c-ast updated from vX to vY."` if an update was applied.
  - Any error that prevents the binary from functioning.

The caller specifies which mode applies. Default is silent.

---

## Step 0 — Check for an existing binary

Resolve the canonical path for the current OS:
- macOS/Linux: `$HOME/.42crunch/bin/42c-ast`
- Windows: `%APPDATA%\42Crunch\bin\42c-ast.exe`

Initialize `BIN_DIR` and `BINARY_PATH` before any version checks:

```bash
# macOS / Linux
BIN_DIR="$HOME/.42crunch/bin"
BINARY_PATH="$BIN_DIR/42c-ast"
mkdir -p "$BIN_DIR"
```

```powershell
# Windows
$BIN_DIR = "$env:APPDATA\42Crunch\bin"
$BINARY_PATH = "$BIN_DIR\42c-ast.exe"
New-Item -ItemType Directory -Force -Path $BIN_DIR | Out-Null
```

- Binary **missing or broken** (`--version` exits non-zero or file absent) →
  continue to **Step 1** (detect OS/arch).
- Binary **present** and `--version` exits 0 → capture the installed version:

  ```bash
  INSTALLED_VERSION=$("$BINARY_PATH" --version 2>/dev/null | grep -oE '[0-9]+\.[0-9]+\.[0-9]+')
  ```

  Then continue to **Step 2** (fetch manifest and compare versions). Do **not**
  exit — always verify that the installed version is current before declaring
  setup complete.

---

## Step 1 — Detect OS and architecture

Determine the current platform and resolve `BIN_DIR` and `BINARY_PATH`:

| OS | Architecture | Platform key | BIN_DIR | BINARY_PATH |
|----|-------------|--------------|---------|-------------|
| macOS | arm64 | `darwin-arm64` | `$HOME/.42crunch/bin` | `$BIN_DIR/42c-ast` |
| macOS | x86_64 | `darwin-amd64` | `$HOME/.42crunch/bin` | `$BIN_DIR/42c-ast` |
| Linux | x86_64 | `linux-amd64` | `$HOME/.42crunch/bin` | `$BIN_DIR/42c-ast` |
| Linux | arm64 | `linux-arm64` | `$HOME/.42crunch/bin` | `$BIN_DIR/42c-ast` |
| Windows | x86_64 | `windows-amd64` | `%APPDATA%\42Crunch\bin` | `%BIN_DIR%\42c-ast.exe` |

```bash
# macOS / Linux
ARCH=$(uname -m)
OS=$(uname -s | tr '[:upper:]' '[:lower:]')
case "$ARCH" in
  arm64|aarch64) ARCH_KEY="arm64" ;;
  x86_64|amd64)  ARCH_KEY="amd64" ;;
  *) echo "Unsupported architecture: $ARCH"; exit 1 ;;
esac
PLATFORM_KEY="${OS}-${ARCH_KEY}"
BIN_DIR="$HOME/.42crunch/bin"
BINARY_PATH="$BIN_DIR/42c-ast"
mkdir -p "$BIN_DIR"
```

```powershell
# Windows
$PLATFORM_KEY = "windows-amd64"
$BIN_DIR = "$env:APPDATA\42Crunch\bin"
$BINARY_PATH = "$BIN_DIR\42c-ast.exe"
New-Item -ItemType Directory -Force -Path $BIN_DIR | Out-Null
```

---

## Step 2 — Fetch the manifest and resolve download details

```bash
# macOS / Linux
curl -fsSL https://repo.42crunch.com/downloads/42c-ast-manifest.json \
  -o /tmp/42c-ast-manifest.json
```

```powershell
# Windows
$ManifestPath = Join-Path $env:TEMP "42c-ast-manifest.json"
Invoke-WebRequest -Uri "https://repo.42crunch.com/downloads/42c-ast-manifest.json" -OutFile $ManifestPath
```

The manifest is a JSON array. Filter entries by the `architecture` field
matching `PLATFORM_KEY`. From the matching entry, extract:

| Field | Variable |
|-------|----------|
| `version` | `LATEST_VERSION` |
| `downloadUrl` | `DOWNLOAD_URL` |
| `sha256` | `EXPECTED_SHA256` |

```bash
# macOS / Linux
if command -v python3 &>/dev/null; then
  MANIFEST_OUTPUT=$(python3 - "$PLATFORM_KEY" << 'EOF'
import json, sys
with open("/tmp/42c-ast-manifest.json") as f:
    entries = json.load(f)
platform = sys.argv[1]
match = next((e for e in entries if e.get("architecture") == platform), None)
if not match:
    print(f"ERROR: no manifest entry for {platform}", file=sys.stderr)
    sys.exit(1)
print(match["version"])
print(match["downloadUrl"])
print(match["sha256"])
EOF
)
elif command -v jq &>/dev/null; then
  MANIFEST_OUTPUT=$(printf '%s\n%s\n%s\n' \
    "$(jq -r --arg p "$PLATFORM_KEY" '.[] | select(.architecture==$p) | .version' /tmp/42c-ast-manifest.json)" \
    "$(jq -r --arg p "$PLATFORM_KEY" '.[] | select(.architecture==$p) | .downloadUrl' /tmp/42c-ast-manifest.json)" \
    "$(jq -r --arg p "$PLATFORM_KEY" '.[] | select(.architecture==$p) | .sha256'  /tmp/42c-ast-manifest.json)")
else
  echo "ERROR: python3 or jq is required to parse the manifest"; exit 1
fi

LATEST_VERSION=$(echo "$MANIFEST_OUTPUT" | sed -n '1p')
DOWNLOAD_URL=$(echo "$MANIFEST_OUTPUT"   | sed -n '2p')
EXPECTED_SHA256=$(echo "$MANIFEST_OUTPUT" | sed -n '3p')
```

```powershell
# Windows
$ManifestEntries = Get-Content $ManifestPath -Raw | ConvertFrom-Json
$Match = $ManifestEntries | Where-Object { $_.architecture -eq $PLATFORM_KEY } | Select-Object -First 1
if (-not $Match) {
  Write-Error "ERROR: no manifest entry for $PLATFORM_KEY"
  exit 1
}

$LATEST_VERSION = $Match.version
$DOWNLOAD_URL = $Match.downloadUrl
$EXPECTED_SHA256 = $Match.sha256
```

If `INSTALLED_VERSION` (from Step 0) equals `LATEST_VERSION` → binary is
up to date. Skip Step 3 and return to the caller.

If the installed version is older (or the binary was absent) → continue to
Step 3.

---

## Step 3 — Download, verify, install

```bash
# macOS / Linux
TMP_BIN="/tmp/42c-ast-download"
curl -fsSL "$DOWNLOAD_URL" -o "$TMP_BIN"

# Verify SHA-256
ACTUAL_SHA=$(shasum -a 256 "$TMP_BIN" | awk '{print $1}')
if [ "$ACTUAL_SHA" != "$EXPECTED_SHA256" ]; then
  echo "SHA-256 mismatch — aborting install."
  rm -f "$TMP_BIN"
  exit 1
fi

mv "$TMP_BIN" "$BINARY_PATH"
chmod +x "$BINARY_PATH"
"$BINARY_PATH" --version
```

```powershell
# Windows
$TmpBin = "$env:TEMP\42c-ast-download.exe"
Invoke-WebRequest -Uri $DOWNLOAD_URL -OutFile $TmpBin

$ActualSha = (Get-FileHash -Algorithm SHA256 $TmpBin).Hash.ToLower()
if ($ActualSha -ne $EXPECTED_SHA256) {
    Write-Error "SHA-256 mismatch — aborting install."
    Remove-Item $TmpBin
    exit 1
}

Move-Item -Force $TmpBin $BINARY_PATH
& $BINARY_PATH --version
```

Confirm that `--version` exits 0. If it does not, report the failure and
stop — do not proceed to credential setup.
