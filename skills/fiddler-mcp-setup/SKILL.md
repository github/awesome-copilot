---
name: fiddler-mcp-setup
description: 'Set up the Fiddler Everywhere MCP server connection for AI agent tools (Claude Code, GitHub Copilot CLI, GitHub Copilot in VS Code, Cursor, OpenAI Codex CLI). ALWAYS use this skill when Fiddler MCP tools are not available, you cannot see Fiddler tools, get an authentication error connecting to Fiddler, need to configure Fiddler MCP for the first time, or hear "tool not found" errors when trying to use other Fiddler skills. Calls Fiddler''s local autoconfigure API to detect existing config and write the correct settings automatically. The only prerequisite is that Fiddler Everywhere is running.'
---

# Fiddler MCP Setup

Configure the Fiddler Everywhere MCP server so that agent tools can call Fiddler's traffic
inspection, status, and session APIs.

---

## Operating rules

- **Shell-first.** MCP is not yet configured, so you cannot use MCP tools.
- **Sequential execution only.** Follow steps strictly in order — do not run steps or scripts in parallel. Each step may depend on values produced by the previous one.
- **On Windows** — detect opened terminal. Only if it is not PowerShell, wrap scripts with: `powershell.exe -Command 'script'`. Use single quotes to wrap the script.

---

## Step 1 — Verify Fiddler is installed

**macOS:**
```bash
if [ -d "/Applications/Fiddler Everywhere.app" ]; then echo "INSTALLED"; else echo "NOT_INSTALLED"; fi
```

**Linux:**
```bash
if command -v fiddler-everywhere &>/dev/null || [ -x "$HOME/Downloads/FiddlerEverywhere.AppImage" ]; then echo "INSTALLED"; else echo "NOT_INSTALLED"; fi
```

**Windows (PowerShell):**
```powershell
$installed = Get-ItemProperty `
  "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*",
  "HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*",
  "HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*" `
  -ErrorAction SilentlyContinue |
  Where-Object { $_.DisplayName -like "*Fiddler Everywhere*" }
if ($installed) { "INSTALLED" } else { "NOT_INSTALLED" }
```

If `NOT_INSTALLED`: stop and tell the user:
> "Fiddler Everywhere is not installed. Please install it first."

---

## Step 2 — Detect the provider

Identify which agent is being configured and set `PROVIDER`.

### Parent process name

Inspect the parent process:

macOS / Linux:
```bash
ps -p $PPID -o comm= 2>/dev/null
```

Windows (PowerShell):
```powershell
(Get-Process -Id (Get-CimInstance Win32_Process -Filter "ProcessId=$PID").ParentProcessId).Name
```

Match the output against known process names:

| Process name contains | Provider value |
|-----------------------|---------------|
| `code`, `code-helper` | `vscode` |
| `cursor` | `cursor` |
| `claude` | `claude_code` |
| `copilot` | `copilot_cli` |
| `codex` | `codex_cli` |


If matched unambiguously, set `PROVIDER` to Provider value from the table and proceed to Step 3.

If still unrecognised, ask the user:
> "Which agent are you setting Fiddler MCP up for? (VS Code / GitHub Copilot, Cursor, Claude Code CLI, GitHub Copilot CLI, or OpenAI Codex CLI)"

Use the user's answer to set `PROVIDER` from the table above.

---

## Step 3 — Discover the port

Fiddler Everywhere listens on port `8868` by default. Confirm it is reachable and set `PORT` for all subsequent steps.

macOS / Linux:
```bash
curl -s -o /dev/null -w "%{http_code}" "http://localhost:8868/api/McpManagement/Detect?provider=PROVIDER"
```

Windows (PowerShell):
```powershell
curl.exe -s -o NUL -w "%{http_code}" "http://localhost:8868/api/McpManagement/Detect?provider=PROVIDER"
```

| Result | Action |
|--------|--------|
| Expected Fiddler Detect response, including documented authentication or plan errors | Port `8868` is serving Fiddler. Set `PORT=8868` and proceed to Step 4. |
| `000` (connection refused) or an unrecognized response | Port `8868` is not serving Fiddler. Run the port discovery script below. |

**Port discovery script:**

macOS / Linux:
```bash
python3 -c "
import json, glob, os
ports = set()
for f in glob.glob(os.path.expanduser('~/.fiddler/*/Settings/appsettings.json')):
    try:
        p = json.load(open(f)).get('MCPServerSettings', {}).get('Port')
        if p and p != 8868:
            ports.add(p)
    except: pass
print(' '.join(str(p) for p in ports) if ports else 'none')
"
```

Windows (PowerShell):
```powershell
$ports = Get-ChildItem "$env:USERPROFILE\.fiddler\*\Settings\appsettings.json" -ErrorAction SilentlyContinue |
  ForEach-Object { (Get-Content $_ | ConvertFrom-Json).MCPServerSettings.Port } |
  Where-Object { $_ -and $_ -ne 8868 } | Select-Object -Unique
Write-Output $(if ($ports) { $ports -join ' ' } else { 'none' })
```

For each port returned, probe it:

macOS / Linux:
```bash
curl -s -o /dev/null -w "%{http_code}" "http://localhost:PORT/api/McpManagement/Detect?provider=PROVIDER"
```

Windows (PowerShell):
```powershell
curl.exe -s -o NUL -w "%{http_code}" "http://localhost:PORT/api/McpManagement/Detect?provider=PROVIDER"
```

Set `PORT` to the first port that returns any HTTP response. If no port responds, Fiddler is not running — launch it and retry from the top of Step 3.

**Launch Fiddler:**

macOS:
```bash
open -a "Fiddler Everywhere" && sleep 15
```

Linux:
```bash
if command -v fiddler-everywhere >/dev/null 2>&1; then
  (nohup fiddler-everywhere >/dev/null 2>&1 &)
elif [ -x "$HOME/Downloads/FiddlerEverywhere.AppImage" ]; then
  (nohup "$HOME/Downloads/FiddlerEverywhere.AppImage" >/dev/null 2>&1 &)
fi
sleep 15
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

**Important:** Wait 15 seconds for Fiddler to launch, before continuing with the next steps!

If still unreachable after relaunch:
> "Fiddler Everywhere is not reachable. Please verify it is running and try again."

> `PORT` is used in all subsequent steps.

---

## Step 4 — Check for existing configuration

Call the Detect endpoint to see if Fiddler MCP is already configured for this provider:

macOS / Linux:
```bash
curl -sS -w '\nHTTP_STATUS:%{http_code}\n' "http://localhost:$PORT/api/McpManagement/Detect?provider=PROVIDER"
```

Windows (PowerShell):
```powershell
curl.exe -sS -w "\nHTTP_STATUS:%{http_code}\n" "http://localhost:$PORT/api/McpManagement/Detect?provider=PROVIDER"
```

Replace `PROVIDER` with the value from Step 2.

| Response | Action |
|----------|--------|
| Indicates config exists / already configured | Inform the user: "Fiddler MCP is already configured for `PROVIDER`." Ask if they want to re-run setup to refresh the configuration. Only continue if confirmed. |
| Indicates not configured | Proceed to Step 5. |
| `403` | Stop: "Your Fiddler plan does not include MCP access. Please upgrade your subscription." |
| User not logged in | Follow the **Login** procedure below, then retry Step 4. |

---

### Login (if Fiddler reports the user is not logged in)

Use the MCP protocol to trigger the login flow. Follow these sub-steps in order.

**1. Open an MCP session and get the session ID:**

macOS / Linux:
```bash
SESSION_ID=$(curl -si -X POST "http://localhost:$PORT/mcp" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"mcp-setup","version":"1.0"}}}' \
  | grep -i "^mcp-session-id:" | awk '{print $2}' | tr -d '\r')
echo "Session ID: $SESSION_ID"
```

Windows (PowerShell):
```powershell
$initResp = curl.exe -si -X POST "http://localhost:$PORT/mcp" `
  -H "Content-Type: application/json" `
  -H "Accept: application/json, text/event-stream" `
  -d '{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"initialize\",\"params\":{\"protocolVersion\":\"2024-11-05\",\"capabilities\":{},\"clientInfo\":{\"name\":\"mcp-setup\",\"version\":\"1.0\"}}}'
$SESSION_ID = ($initResp | Select-String "(?i)mcp-session-id:\s*(\S+)").Matches.Groups[1].Value.Trim()
Write-Host "Session ID: $SESSION_ID"
```

If `SESSION_ID` is empty, Fiddler may not be fully started — wait a few seconds and retry.

**2. Fetch the tools list to confirm `initiate_login` is available:**

macOS / Linux:
```bash
curl -s -X POST "http://localhost:$PORT/mcp" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Mcp-Session-Id: $SESSION_ID" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}'
```

Windows (PowerShell):
```powershell
curl.exe -s -X POST "http://localhost:$PORT/mcp" `
  -H "Content-Type: application/json" `
  -H "Accept: application/json, text/event-stream" `
  -H "Mcp-Session-Id: $SESSION_ID" `
  -d '{\"jsonrpc\":\"2.0\",\"id\":2,\"method\":\"tools/list\",\"params\":{}}'
```

Confirm `initiate_login` appears in the response before continuing.

**3. Call `initiate_login`:**

macOS / Linux:
```bash
curl -s -X POST "http://localhost:$PORT/mcp" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Mcp-Session-Id: $SESSION_ID" \
  -d '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"initiate_login","arguments":{}}}'
```

Windows (PowerShell):
```powershell
curl.exe -s -X POST "http://localhost:$PORT/mcp" `
  -H "Content-Type: application/json" `
  -H "Accept: application/json, text/event-stream" `
  -H "Mcp-Session-Id: $SESSION_ID" `
  -d '{\"jsonrpc\":\"2.0\",\"id\":3,\"method\":\"tools/call\",\"params\":{\"name\":\"initiate_login\",\"arguments\":{}}}'
```

Tell the user:
> "A login window has been opened in your browser. Please complete sign-in, then let me know when done."

Wait for the user to confirm sign-in is complete, then retry the step that triggered this login flow.

---

## Step 5 — Autoconfigure

Call the Configure endpoint. Fiddler will automatically generate or reuse the API key and write the correct config file for the provider:

macOS / Linux:
```bash
curl -sS -w '\nHTTP_STATUS:%{http_code}\n' -X POST "http://localhost:$PORT/api/McpManagement/Configure" \
  -H "Content-Type: application/json" \
  -d '{"provider":"PROVIDER"}'
```

Windows (PowerShell):
```powershell
curl.exe -sS -w "\nHTTP_STATUS:%{http_code}\n" -X POST "http://localhost:$PORT/api/McpManagement/Configure" `
  -H "Content-Type: application/json" `
  -d '{\"provider\":\"PROVIDER\"}'`
```

Replace `PROVIDER` with the value from Step 2.

| Response | Action |
|----------|--------|
| Success / 2xx | Configuration written. Proceed to Step 6. |
| `403` | Stop: "Your Fiddler plan does not include MCP access. Please upgrade your subscription." |
| User not logged in | Follow the **Login** procedure in Step 4, then retry Step 5. |
| Any other failure | Note the response and ask the user to check Fiddler is running correctly. |

---

## Step 6 — Confirm success

Tell the user:
> "Fiddler MCP has been configured for `PROVIDER`. Restart your agent (reload the VS Code window, restart Cursor, etc.) to pick up the new configuration, then try using a Fiddler tool."
