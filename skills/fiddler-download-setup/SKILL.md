---
name: fiddler-download-setup
description: 'Download, install, and launch Fiddler Everywhere from scratch, then configure MCP for AI agent tools. Use this skill when the user does not have Fiddler installed, says "download Fiddler", "install Fiddler Everywhere", "get started with Fiddler", "first time Fiddler setup", "set up Fiddler from scratch", or needs a complete onboarding from zero to a working Fiddler MCP connection.'
---

# Fiddler Download & Setup

Guide the user through downloading, installing, and launching Fiddler Everywhere.

## Operating rules

1. This skill is shell-first. Fiddler is not installed yet, so no MCP tools are available.
2. Resolve the current version from the manifest before constructing any download URL.
   Never hardcode a version number.
3. On Windows - detect opened terminal. Only if it is not powershell - wrap and run the scripts with: powershell.exe -Command 'script'. Use single quotes to wrap the script!

---

## Phase 1 — Check if Fiddler is already installed

Before downloading, check whether Fiddler Everywhere is already installed.
If it is installed, also read the installed version and compare it against the latest
available release. Only proceed to Phase 2 if the app is not installed or an update
is available and the user wants to upgrade.

### macOS — detect and version-check
```bash
if [ -d "/Applications/Fiddler Everywhere.app" ]; then
  INSTALLED_VERSION=$(/usr/libexec/PlistBuddy -c "Print CFBundleShortVersionString" \
    "/Applications/Fiddler Everywhere.app/Contents/Info.plist" 2>/dev/null)
  echo "INSTALLED: $INSTALLED_VERSION"
else
  echo "NOT_INSTALLED"
fi
```

If `INSTALLED`, fetch the latest version for the detected architecture and compare:
```bash
ARCH=$(uname -m)
if [ "$ARCH" = "arm64" ]; then
  MANIFEST_URL="https://downloads.getfiddler.com/mac-arm64/latest-mac.yml"
else
  MANIFEST_URL="https://downloads.getfiddler.com/mac/latest-mac.yml"
fi
LATEST_VERSION=$(curl -s "$MANIFEST_URL" | grep '^version:' | awk '{print $2}')
echo "Installed: $INSTALLED_VERSION  |  Latest: $LATEST_VERSION"
if [ "$INSTALLED_VERSION" = "$LATEST_VERSION" ]; then
  echo "UP_TO_DATE"
else
  echo "UPDATE_AVAILABLE"
fi
```

### Linux — detect and version-check
```bash
APPIMAGE=$(ls ~/Downloads/fiddler-everywhere-*.AppImage 2>/dev/null | sort -V | tail -1)
if command -v fiddler-everywhere &>/dev/null || [ -n "$APPIMAGE" ]; then
  # Extract version from AppImage filename as the most reliable source
  INSTALLED_VERSION=$(echo "$APPIMAGE" | grep -oP '[\d]+\.[\d]+\.[\d]+')
  echo "INSTALLED: $INSTALLED_VERSION"
  LATEST_VERSION=$(curl -s "https://downloads.getfiddler.com/linux/latest-linux.yml" \
    | grep '^version:' | awk '{print $2}')
  echo "Installed: $INSTALLED_VERSION  |  Latest: $LATEST_VERSION"
  if [ "$INSTALLED_VERSION" = "$LATEST_VERSION" ]; then
    echo "UP_TO_DATE"
  else
    echo "UPDATE_AVAILABLE"
  fi
else
  echo "NOT_INSTALLED"
fi
```

### Windows (PowerShell) — detect and version-check
```powershell
$installed = Get-ItemProperty `
  "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*",
  "HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*",
  "HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*" `
  -ErrorAction SilentlyContinue |
  Where-Object { $_.DisplayName -like "*Fiddler Everywhere*" }

if ($installed) {
  $installedVersion = $installed.DisplayVersion
  Write-Host "INSTALLED: $installedVersion"

  $manifest = Invoke-WebRequest "https://downloads.getfiddler.com/win/latest.yml" -UseBasicParsing
  $text = [System.Text.Encoding]::UTF8.GetString($manifest.RawContentStream.ToArray())
  $latestVersion = ($text | Select-String '(?m)^version:\s*(.+)').Matches.Groups[1].Value.Trim()
  Write-Host "Installed: $installedVersion  |  Latest: $latestVersion"

  if ($installedVersion -eq $latestVersion) { "UP_TO_DATE" } else { "UPDATE_AVAILABLE" }
} else {
  "NOT_INSTALLED"
}
```

**Interpreting the result:**

- `NOT_INSTALLED` — continue to Phase 2 to download and install.
- `UP_TO_DATE` — inform the user their Fiddler Everywhere is already on the latest version
  and stop further execution of the skill.
- `UPDATE_AVAILABLE` — tell the user the installed version and the latest version, then ask
  whether they want to upgrade. If yes, continue to Phase 2 (the new installer will replace
  the existing one). If no, stop.
---

## Phase 2 — Detect OS and resolve version

Run both commands together. The manifest probe also confirms network access.

```bash
uname -s && uname -m
VERSION=$(curl -s "https://downloads.getfiddler.com/mac-arm64/latest-mac.yml" \
  | grep '^version:' | awk '{print $2}')
echo "Latest Fiddler Everywhere: $VERSION"
```

On Windows (PowerShell):
```powershell
$env:PROCESSOR_ARCHITECTURE   # AMD64 or ARM64
$manifest = Invoke-WebRequest "https://downloads.getfiddler.com/win/latest.yml" -UseBasicParsing
$text = [System.Text.Encoding]::UTF8.GetString($manifest.RawContentStream.ToArray())
$VERSION = ($text | Select-String '(?m)^version:\s*(.+)').Matches.Groups[1].Value.Trim()
Write-Host "Latest Fiddler Everywhere: $VERSION"
```

| `uname -s` | `uname -m` | Platform |
|-------------|------------|----------|
| `Darwin` | `arm64` | macOS Apple Silicon |
| `Darwin` | `x86_64` | macOS Intel |
| `Linux` | anything | Linux |
| — | — | Windows — use PowerShell path above |

---

## Phase 3 — Download

Use `$VERSION` resolved in Phase 2 to construct a direct, versioned URL.
The `.pkg` format is preferred on macOS.

### macOS

```bash
# Apple Silicon (arm64)
curl -L \
  "https://agent-downloads.getfiddler.com/mac-arm64/Fiddler%20Everywhere%20${VERSION}.pkg" \
  -o ~/Downloads/FiddlerEverywhere.pkg

# Intel (x86_64)
curl -L \
  "https://agent-downloads.getfiddler.com/mac/Fiddler%20Everywhere%20${VERSION}.pkg" \
  -o ~/Downloads/FiddlerEverywhere.pkg
```

### Linux

```bash
VERSION=$(curl -s "https://downloads.getfiddler.com/linux/latest-linux.yml" \
  | grep '^version:' | awk '{print $2}')
curl -L \
  "https://agent-downloads.getfiddler.com/linux/fiddler-everywhere-${VERSION}.AppImage" \
  -o ~/Downloads/FiddlerEverywhere.AppImage
```

### Windows (PowerShell)

```powershell
Invoke-WebRequest `
  "https://agent-downloads.getfiddler.com/win/Fiddler%20Everywhere%20$VERSION.exe" `
  -OutFile "$env:USERPROFILE\Downloads\FiddlerEverywhere.exe"
```

---

## Phase 4 — Install

### macOS — PKG (headless, no wizard)

Do **not** use `sudo installer` directly — `sudo` blocks on a password prompt inside
the agent's hidden shell where the user cannot type. Use `osascript` instead, which
raises the native macOS authentication dialog that the user can see on screen.

`do shell script with administrator privileges` runs as root and cannot access
`~/Downloads` due to macOS sandbox restrictions. Copy the package to `/tmp` first
(world-readable), then install from there.

Run both commands via bash tool calls:

```bash
cp ~/Downloads/FiddlerEverywhere.pkg /tmp/FiddlerEverywhere.pkg
```

Then announce before the next command:
> "A macOS password dialog will appear on your screen. Enter your login password there
> to authorize the installation, then I'll continue automatically."

```bash
osascript -e 'do shell script "installer -pkg /tmp/FiddlerEverywhere.pkg -target /" with administrator privileges'
```

`osascript` blocks until the user approves the dialog and the install completes. Once it
exits with code 0, clean up.

```bash
rm /tmp/FiddlerEverywhere.pkg
```


### Linux

```bash
chmod +x ~/Downloads/FiddlerEverywhere.AppImage
~/Downloads/FiddlerEverywhere.AppImage &
```

### Windows — silent install

```powershell
Start-Process "$env:USERPROFILE\Downloads\FiddlerEverywhere.exe" -ArgumentList "/S" -Wait
```

**Launch Fiddler:**

macOS:
```bash
open -a "Fiddler Everywhere" && sleep 15
```

Linux:
```bash
(nohup "$HOME/Downloads/FiddlerEverywhere.AppImage" &>/dev/null &); sleep 15
```

Windows:
**Important** On windows if the current terminal used is bash, use the specific **GitBash** script.

**PowerShell**
```powershell
$candidates = @(
  "$env:LOCALAPPDATA\Programs\Fiddler Everywhere\Fiddler Everywhere.exe",
  "C:\Program Files\Fiddler Everywhere\Fiddler Everywhere.exe",
  "C:\Program Files (x86)\Fiddler Everywhere\Fiddler Everywhere.exe"
)
$fiddlerExe = $candidates | Where-Object { Test-Path $_ } | Select-Object -First 1
if ($fiddlerExe) {
  $cmdLine = '"' + $fiddlerExe + '"'
  Invoke-CimMethod -ClassName Win32_Process -MethodName Create -Arguments @{ CommandLine = $cmdLine } | Out-Null
  Start-Sleep 15
}
```

**Git Bash**
```bash
FIDDLER_EXE=""
for dir in "$LOCALAPPDATA/Programs/Fiddler Everywhere" \
           "/c/Program Files/Fiddler Everywhere" \
           "/c/Program Files (x86)/Fiddler Everywhere"; do
  if [ -f "$dir/Fiddler Everywhere.exe" ]; then
    FIDDLER_EXE="$dir/Fiddler Everywhere.exe"
    break
  fi
done
if [ -n "$FIDDLER_EXE" ]; then
  "$FIDDLER_EXE" &
  sleep 15
fi
```

---

## Phase 5 — Suggest MCP setup

After Fiddler Everywhere is installed and launched, inform the user that there is
an automatic MCP setup skill that can configure the Fiddler MCP server connection.

Present the following message:

> Fiddler Everywhere is installed and running.
>
> There is an **automatic MCP setup** skill that can configure the Fiddler MCP
> server connection for your AI agent. This will allow agent tools
> to interact with Fiddler directly — capturing traffic,
> inspecting sessions, creating rules, and more — all from within your editor.
>
> Would you like me to auto-configure MCP now?

Ask the user to choose:
- **Yes, auto-configure MCP** (recommended)
- **No, I'll set it up manually later**

### If the user accepts

Install the `fiddler-mcp-setup` skill from its remote location and invoke it:

**Remote skill URL:** `https://github.com/telerik/fiddler-agent-tools/tree/master/skills/fiddler-mcp-setup`

Follow the `fiddler-mcp-setup` skill instructions to complete MCP configuration end-to-end.

### If the user declines

Acknowledge and let them know they can download the MCP setup skill later at any time.

## Troubleshooting

| Issue | Solution |
|-------|----------|
| macOS password dialog canceled / install aborted | Rerun the `osascript` command — the pkg in `/tmp` is still there |
| `hdiutil: attach failed` | File may not be fully downloaded — rerun the `curl` command |
| Windows EXE blocked by SmartScreen | Right-click → Run as Administrator |
| App won't open on macOS | Run `xattr -cr "/Applications/Fiddler Everywhere.app"` to clear quarantine |
