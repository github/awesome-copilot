# Running After Effects from the Command Line

## Run a script in the running instance

Windows:

```bat
"C:\Program Files\Adobe\Adobe After Effects <year>\Support Files\AfterFX.exe" -r "C:\Users\<user>\Documents\acme\build-demo.jsx"
"C:\Program Files\Adobe\Adobe After Effects <year>\Support Files\AfterFX.exe" -s "writeLn('Hello, World');"
```

- `-r <file>` runs a script file. It "does not open a new instance of the
  After Effects application; it runs the script in the existing instance".
- `-s "<code>"` runs a string. Use single quotes for strings inside it; the
  guide's own example nests double quotes and is wrong.
- `writeLn` prints to the Info panel. `alert` opens a modal dialog, which
  blocks every later script, so keep it to interactive checks.
- If After Effects exits at once with `-r`, try the path without quotes, as
  the guide suggests.
- Instances started with `-m` are reported not to receive `-r` scripts. That
  report comes from third-party tools, not from Adobe.
- `-noui` is not documented by Adobe. Do not rely on it.

macOS, through AppleScript:

```bash
osascript -e 'tell application "Adobe After Effects <year>" to DoScriptFile "/Users/<user>/Documents/acme/build-demo.jsx"'
osascript -e 'tell application "Adobe After Effects <year>" to DoScript "writeLn(\"Hello, World\");"'
```

The guide's AppleScript examples name "Adobe After Effects CS6"; use the name
of the installed application.

## Pass values in, get results out

A script takes no command-line arguments and writes nothing to the caller's
standard output.

- **In:** all scripts share one global namespace for the session, so set a
  global in a `-s` string and then run the file from the same string:

  ```bat
  AfterFX.exe -s "var acmeJob = { compName: 'Demo Comp', length: 10 }; $.evalFile('C:/Users/<user>/Documents/acme/build-demo.jsx');"
  ```

  The script reads `acmeJob`, and should check `typeof acmeJob` first.
- **Out:** write a result file the caller reads, for example JSON built with
  `json2.js` into `Folder.temp`. Write it under a temporary name and rename it
  when done, so the caller never reads half a file. File writes need **Allow
  Scripts To Write Files And Access Network**.
- **Status:** `app.exitCode` is returned on the command line on Windows, and
  as the `DoScript` result on macOS. The SDK guide notes that on Windows
  `AfterFX.com` is the way to get feedback to the console.
- **Dialogs:** a modal dialog blocks every later script, so an unattended run
  never opens one.

## Render with aerender

`aerender` sits beside `AfterFX.exe` in `Support Files` on Windows, and in the
application folder on macOS. `aerender -help` prints the flags for the
installed version. These are the flags version 26.0 prints:

| Flag | Meaning |
| --- | --- |
| `-project <path>` | Project file or URI to open. Without it, the open project is used. |
| `-teamproject <name>` | A team project to open. |
| `-comp <name>` | Render this comp: its first queueable render queue item, or a new one. Without `-comp`, the whole render queue renders as is, and only `-project`, `-log`, `-v`, `-mem_usage` and `-close` apply. |
| `-rqindex <index>` | Render this render queue item. |
| `-RStemplate <name>` | Render settings template to apply. An unknown name is an error. |
| `-renderSettings "<key: value; ...>"` | Override individual render settings, for example `"Resolution: Half; Quality: Draft"`. |
| `-OMtemplate <name>` | Output module template to apply. An unknown name is an error. |
| `-outputSettings "<key: value; ...>"` | Override individual output module settings, for example `"Crop: true; Crop Top: 4"`. |
| `-output <path>` | Destination file or URI. Frame sequences use `[####]`. |
| `-log <path>` | Log file. Defaults to standard output. |
| `-s <frame>`, `-e <frame>` | First and last frame; the end frame is inclusive. |
| `-i <increment>` | Render every Nth frame, repeating each. Defaults to 1. |
| `-mem_usage <image_cache_percent> <max_mem_percent>` | Memory limits. |
| `-mfr <ON\|OFF> <max_cpu_percent>` | Multi-Frame Rendering and a CPU cap. |
| `-v <ERRORS\|ERRORS_AND_PROGRESS>` | Messages to report. Defaults to `ERRORS_AND_PROGRESS`. |
| `-close <DO_NOT_SAVE_CHANGES\|SAVE_CHANGES\|DO_NOT_CLOSE>` | What to do with the project afterwards. Defaults to `DO_NOT_SAVE_CHANGES`. |
| `-sound <ON\|OFF>` | Play a sound when done. |
| `-reuse` | Ask an already running After Effects to render. Without it, `aerender` always starts a new instance and quits it when done. |
| `-continueOnMissingFootage` | Render missing footage as colour bars instead of stopping. |
| `-version` | Print the version and exit. |

Examples, with placeholder paths:

```bat
aerender -project "C:\Users\<user>\Documents\acme\demo-project.aep" -comp "Demo Comp" -output "C:\Users\<user>\Documents\acme\out\demo-comp.mov"
aerender -project "C:\Users\<user>\Documents\acme\demo-project.aep" -comp "Demo Comp" -RStemplate "Best Settings" -OMtemplate "High Quality" -output "C:\Users\<user>\Documents\acme\out\demo-comp.mov"
```

Template names must exist in the installation. List them from a script:
`RenderQueueItem.templates` for render settings (`-RStemplate`) and
`OutputModule.templates` for output modules (`-OMtemplate`).

## Adobe Media Encoder

From After Effects, `app.project.renderQueue.queueInAME(false)` sends queued
items to Media Encoder, which applies its most recently used preset.

Media Encoder has its own scripting API (<https://ame-scripting.docsforadobe.dev/>).
Its top-level `app` offers `getFrontend()`, `getEncoderHost()`,
`getExporter()` and `getWatchFolder()`, and a script runs from the command
line with:

```text
<path to Adobe Media Encoder executable> --console es.processFile <path to script>
```
