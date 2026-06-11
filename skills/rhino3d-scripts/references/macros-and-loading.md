# Macros, Loading, and Running Scripts

## Command Macros (no script needed)

A macro is a string of command-line input. Anywhere Rhino accepts a command (alias, toolbar button, `_ReadCommandFile`), you can place a macro.

### Syntax rules

| Token | Meaning |
|---|---|
| `!` | **Cancel** any currently running command before this one starts. Always start macros with `!`. |
| `_` | Use the **English** (invariant) command name, so the macro works in any locale. |
| `-` | Run the command in **script mode** — suppress dialogs, accept input from the macro string. |
| `_Enter` | Press Enter at the current prompt. |
| `Pause` | Stop and wait for the user to supply this input interactively. |
| `;` | Comment to end of line. |
| Newline | Same as a space — a separator between tokens, not a command terminator. |

### Example macros

```text
! _-Line 0,0,0 10,0,0
! _-Circle 0,0,0 5 _Enter
! _SelAll _Delete
! _-Properties _Object _Name "MyObject" _EnterEnd _Enter
! _-RunPythonScript "MyScript.py"
```

## Running Saved Scripts

### Python (`.py`)

```text
_-RunPythonScript "C:\Users\example\Scripts\MyScript.py"
```

Or, with the script folder on the search path:

```text
_-RunPythonScript "MyScript.py"
```

`_EditPythonScript` opens the legacy editor; `_ScriptEditor` (Rhino 8) opens the unified editor with Python 3, VB, and C#.

### RhinoScript (`.rvb`, `.vbs`)

Two steps: **load** the file (registers its subs/functions), then **run** a named sub.

```text
_-LoadScript "MyScript.rvb"
_-RunScript MyMainSub
```

A single `.rvb` can hold many subs; `_RunScript` chooses which to invoke.

### Search Paths

`Options → Files → Search paths` — folders listed here are scanned when you reference a script by bare filename. Without this, you must give a full path.

### Startup Scripts

`Options → RhinoScript → Startup` (and `Options → Python → Startup`) — files in these lists run once when Rhino opens. Useful for registering custom commands or aliases.

**Guard against missing document** in startup code:

```python
import scriptcontext as sc

def startup():
    if sc.doc is None:
        return

startup()
```

## Toolbar Buttons & Aliases

A toolbar button’s **Command** field is just a macro. To make a button that runs your script:

```text
! _-RunPythonScript "MyScript.py"
```

Set the **Tooltip** to a short description; set the icon via the button editor.

To create an alias: `Options → Aliases → New`. The alias name becomes a typed command; its value is the macro.

## Invoking Macros From a Script

```python
import rhinoscriptsyntax as rs
rs.Command("! _-Line 0,0,0 10,0,0", echo=False)
```

`echo=False` suppresses command-history output but does **not** suppress prompts — always use `-` and complete every prompt within the macro string.

## rhinocode CLI (Rhino 8)

`rhinocode` is the Rhino 8 command-line tool for running scripts and commands against a running Rhino instance from an external terminal.

### Basic commands

```text
rhinocode script "C:\path\to\MyScript.py"            # run a Python script
rhinocode command "_Circle 0,0,0 5 _Enter"           # run a Rhino command
rhinocode --rhino <instance-id> script "MyScript.py" # target a specific instance
```

`<instance-id>` looks like `rhinocode_remotepipe_75029`. Find the ID in Rhino's title bar or
by running `StartScriptServer` in Rhino, which prints the pipe name to the command line.

### Architecture — pipe server

rhinocode does **not** spawn a new Rhino process. It connects to a persistent server that Rhino
exposes (`StartScriptServer`). Scripts execute inside that server process, which means:

- **Environment variables are isolated.** Variables set in the calling shell (`set FOO=bar`)
  are NOT visible inside the script via `os.environ`. The server was started before your shell.
- **`os.getcwd()` is the server's working directory**, not the directory you called rhinocode
  from. Do not rely on it for output paths; pass the path explicitly.
- **`print()` output IS piped back** to the calling terminal — use it freely for status messages.

### Passing data into a script

rhinocode does not support positional arguments after the script path — any extra tokens are
concatenated onto the file URI, causing a "file does not exist" error. Workarounds:

|Channel|How|Notes|
|---|---|---|
|Temp file|Caller writes a file to a known location; script reads and deletes it.|Use a path derived from `__file__` (see below), not `%TEMP%` — the server may resolve a different temp dir.|
|Rhino dialog|Script calls `rhinoscriptsyntax.ListBox` / `GetString`|Always works; user sees a prompt in Rhino.|

### `__file__` is a URI

When running via rhinocode, `__file__` is set as a `file:///` URI with URL-encoded characters
(spaces become `%20`). Decode it before using it as a filesystem path:

```python
import os, sys, urllib.parse

def _script_dir():
    raw = __file__
    if raw.startswith("file:///"):
        raw = urllib.parse.unquote(raw[len("file:///"):])
        if sys.platform == "win32":
            raw = raw.replace("/", os.sep)
    return os.path.dirname(os.path.abspath(raw))
```
