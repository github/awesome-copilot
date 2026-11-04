# Automation, MCP Servers, and Computer Use

Every route from outside Illustrator ends in the same place: ExtendScript running inside Illustrator. This file covers starting that script from an OS script or another language, passing it parameters, reading its result, wrapping it as an MCP server for AI tools, and the rules for computer-use sessions when no scripting route exists.

## Starting a Script From Outside

### Windows: COM

Illustrator registers the COM class `Illustrator.Application` (version-specific `Illustrator.Application.<major>`). Its scripting methods, from the type library Illustrator installs:

| Method | Parameters |
| --- | --- |
| `DoJavaScriptFile` | `JavaScriptFile`, optional `Arguments` (array), optional `ExecutionMode` |
| `DoJavaScript` | `JavaScriptCode` (a string of ExtendScript), optional `Arguments`, optional `ExecutionMode` |
| `DoScript` | `Action`, `From` (action set), optional `Dialogs`: plays a recorded action |

`ExecutionMode` values: 1 `aiNeverShowDebugger`, 2 `aiDebuggerOnError`, 3 `aiBeforeRunning`. Use 1 for unattended runs. The call returns when the script finishes, with the value of the script's last expression as a string.

PowerShell:

```powershell
$ai = New-Object -ComObject Illustrator.Application   # starts Illustrator if it is not running
$result = $ai.DoJavaScriptFile('C:\Users\<user>\Documents\AcmeTools\export-artboards.jsx', @(), 1)
Write-Output $result
```

Python (pywin32):

```python
import win32com.client

app = win32com.client.Dispatch("Illustrator.Application")
result = app.DoJavaScriptFile(r"C:\Users\<user>\Documents\AcmeTools\export-artboards.jsx", [], 1)
print(result)
```

If the call fails with "JavaScript code was missing", the `.jsx` path does not exist or cannot be read.

### macOS: AppleScript

```bash
osascript - "/Users/<user>/Documents/AcmeTools/export-artboards.jsx" <<'APPLESCRIPT'
on run argv
  tell application "Adobe Illustrator"
    do javascript "$.evalFile(new File(arguments[0]))" with arguments {item 1 of argv}
  end tell
end run
APPLESCRIPT
```

The script path travels as an `osascript` argument and reaches ExtendScript through `with arguments`, so it never becomes part of either script's source: a path with quotes cannot break the call or inject code. `do javascript` also accepts a file reference, but some versions have rejected file arguments; evaluating the file with `$.evalFile` from a fixed code string works across versions. Check the application name for your install if `tell application` cannot find it.

### Debugging and Legacy Routes

- **VS Code ExtendScript Debugger** (Adobe, Marketplace ID `Adobe.extendscript-debug`): run and debug `.jsx` against a running Illustrator. This is Adobe's replacement for ExtendScript Toolkit.
- **ExtendScript Toolkit** (`-run script.jsx`): 32-bit, will not run on macOS 10.15 or later, and needs a workaround for debugger error #1116. Keep it only for old pipelines that already depend on it.

## Parameters and Results

`arguments` handling differs between launchers (ExtendScript Toolkit `-run` and BridgeTalk do not pass them through), so use `arguments` only to hand over the script path, as in the AppleScript launcher above, and pass the job's parameters in a sidecar file that the script reads, with the result written to another file. `Folder.temp` in ExtendScript is the OS temp folder, which both sides can find. For the script side of external runs (`arguments[]`, `$.getenv`, `$.fileName`, logging), see the adobe-illustrator-scripting skill's External Invocation & Argument Passing section.

Parameter file written by the caller as `key=value` lines, `%TEMP%\acme-export-params.txt` on Windows or `$TMPDIR/acme-export-params.txt` on macOS:

```text
outputFolder=C:\Users\<user>\Documents\AcmeExports
scale=200
```

ExtendScript has no JSON parser, and a `key=value` file needs none, so nothing in the file is ever run as code. For nested data, bundle json2.js and use its `JSON.parse`, never `eval`.

`export-artboards.jsx` (ES3):

```javascript
(function () {
  var paramsFile = new File(Folder.temp + '/acme-export-params.txt');
  var resultFile = new File(Folder.temp + '/acme-export-result.json');

  // key=value lines; values stay plain text, so nothing in the file is evaluated.
  function readParams(file) {
    var params = {};
    file.encoding = 'UTF-8';
    if (!file.open('r')) { return null; }
    while (!file.eof) {
      var line = file.readln().replace(/\r$/, '');
      var at = line.indexOf('=');
      if (at > 0) { params[line.substring(0, at)] = line.substring(at + 1); }
    }
    file.close();
    return params;
  }

  // JSON string literal: escapes backslash, quote, and every control character,
  // so multi-line error messages still parse.
  function quote(value) {
    return '"' + String(value).replace(/[\\"\u0000-\u001f]/g, function (ch) {
      if (ch === '\\' || ch === '"') { return '\\' + ch; }
      return '\\u' + ('000' + ch.charCodeAt(0).toString(16)).slice(-4);
    }) + '"';
  }

  function writeResult(ok, message) {
    resultFile.encoding = 'UTF-8';
    resultFile.open('w');
    resultFile.write('{"ok":' + (ok ? 'true' : 'false') + ',"message":' + quote(message) + '}');
    resultFile.close();
  }

  var previous = app.userInteractionLevel;
  app.userInteractionLevel = UserInteractionLevel.DONTDISPLAYALERTS;
  try {
    if (!paramsFile.exists) { writeResult(false, 'Parameter file not found.'); return; }
    var params = readParams(paramsFile);
    if (!params) { writeResult(false, 'Cannot read the parameter file.'); return; }
    var scale = Number(params.scale);
    if (!params.outputFolder || !isFinite(scale) || scale <= 0) {
      writeResult(false, 'Parameters need outputFolder and a positive scale.');
      return;
    }
    if (!app.documents.length) { writeResult(false, 'No document is open.'); return; }
    // Export work goes here (see the adobe-illustrator-scripting skill).
    writeResult(true, 'Exported at ' + scale + '% to ' + params.outputFolder);
  } catch (e) {
    writeResult(false, 'Line ' + e.line + ': ' + e.message);
  } finally {
    app.userInteractionLevel = previous;
  }
}());
```

Batch caller (Windows):

```bat
@echo off
setlocal
set "_script=%~dp0export-artboards.jsx"
set "_params=%TEMP%\acme-export-params.txt"
set "_result=%TEMP%\acme-export-result.json"

if exist "%_result%" del /Q "%_result%"
> "%_params%" echo outputFolder=%USERPROFILE%\Documents\AcmeExports
>> "%_params%" echo scale=200

powershell -NoProfile -Command "$ai = New-Object -ComObject Illustrator.Application; [void]$ai.DoJavaScriptFile($env:_script, @(), 1)"

if not exist "%_result%" (
  echo Illustrator did not write a result file.
  exit /b 1
)
type "%_result%"
findstr /c:"\"ok\":true" "%_result%" >nul || exit /b 1
exit /b 0
```

bash caller (macOS):

```bash
#!/usr/bin/env bash
set -euo pipefail
script="$(cd "$(dirname "$0")" && pwd)/export-artboards.jsx"
params="${TMPDIR%/}/acme-export-params.txt"
result="${TMPDIR%/}/acme-export-result.json"

rm -f "$result"
printf 'outputFolder=%s\nscale=200\n' "$HOME/Documents/AcmeExports" > "$params"

# The path is an osascript argument, passed on with "with arguments", so it is never part of any script source.
osascript - "$script" <<'APPLESCRIPT'
on run argv
  tell application "Adobe Illustrator"
    do javascript "$.evalFile(new File(arguments[0]))" with arguments {item 1 of argv}
  end tell
end run
APPLESCRIPT

[[ -f "$result" ]] || { echo "Illustrator did not write a result file." >&2; exit 1; }
cat "$result"
grep -q '"ok":true' "$result"
```

Pipeline tips:

- Illustrator runs one script at a time. Queue calls; never start two at once.
- Save outputs with `saveAs` or export calls into an output folder; never save over the source document.
- Log per user, for example `C:\Users\<user>\AppData\Local\AcmeTools\logs\` or `~/Library/Logs/AcmeTools/`.
- If a run hangs, a modal dialog is usually open in Illustrator; set `userInteractionLevel` as above.

## MCP Servers for Illustrator

An Illustrator MCP server is a process an AI tool starts (usually over stdio) that exposes tools; each tool runs ExtendScript in Illustrator through COM or AppleScript and returns the result.

```text
AI tool  <->  MCP server (stdio)  <->  COM / AppleScript  <->  Illustrator (ExtendScript)
```

### Tool Design

Keep the tool set small and specific:

| Tool | Input | Output |
| --- | --- | --- |
| `document_info` | none | Open documents, active document, artboards, color mode, units |
| `list_layers` | document index | Layer names, visibility, lock state, item counts |
| `run_script` | script name from an allowlisted folder, JSON parameters | The script's JSON result |
| `export_artboard_png` | artboard index, scale | Path to the PNG (or the image itself) so the model can see the result |
| `save_copy_as` | output path inside the output folder, format | Saved path |

- Prefer named scripts from an allowlisted folder over a tool that evaluates arbitrary code. If an arbitrary-code tool exists at all, keep it off by default and require confirmation per call.
- Return PNG previews after visual changes, so the agent can check its work.
- Serialize calls; return a clear error on timeout instead of waiting forever.
- Never save over the user's open file; write to an output folder and ask before overwriting.
- Wrap every script in `try`/`catch` and return `{ ok, message }`.

Registering a local server in VS Code (`.vscode/mcp.json`):

```json
{
  "servers": {
    "illustrator": {
      "type": "stdio",
      "command": "node",
      "args": ["${workspaceFolder}/tools/illustrator-mcp/server.js"],
      "env": { "ACME_SCRIPTS_DIR": "${workspaceFolder}/tools/illustrator-mcp/scripts" }
    }
  }
}
```

### Vetting a Community Illustrator MCP Server

Before installing one, read its source and check:

- What code it runs inside Illustrator, and whether a tool accepts arbitrary ExtendScript
- Which folders it can read and write, and whether it can save over files
- Network calls it makes, and what it sends
- Which OS and Illustrator versions it supports, and how it starts Illustrator
- That you pin a version or commit rather than tracking a moving branch

## Computer Use in Illustrator

Use a computer-use tool only for what has no scripting route: some panels and dialogs, generative features, and visual checks a script cannot make.

- Keep the Illustrator window at a fixed size and position for the whole session.
- Prefer menu paths and keyboard shortcuts over clicking coordinates.
- Take a screenshot after each step and stop when the screen does not match the expected state.
- Confirm results with a script readback where possible (for example item counts or layer names).
- Work on a copy of the document.
- Never type credentials, never click sign-in, licensing, purchase, or account dialogs, never accept terms for the user, and never upload or share files.
- Stop and hand back to the user on any unexpected dialog.
