---
name: adobe-after-effects-integrations
description: 'Build, package, install and debug components that run beside or inside Adobe After Effects, and choose between them. Covers CEP extension panels (CSXS/manifest.xml, CSInterface.evalScript, Node.js in a panel, .debug files, PlayerDebugMode, ZXP signing and UPIA installs, and CEP''s retirement schedule), UXP plugins (After Effects beta from 27.0), C++ effect, AEGP and AEIO plugins on the After Effects SDK (PiPL, entry points, Multi-Frame Rendering, SmartFX, GPU, AEGP_ExecuteScript, idle hooks), and MCP servers or other bridges that let an AI agent, a pipeline or another application drive After Effects (command-line scripts, file mailboxes polled with app.scheduleTask, loopback servers in a CEP panel, AEGP sockets). Use when deciding how an outside program reaches After Effects, or when building, installing or fixing one of these components. For the ExtendScript or expressions such a component runs inside After Effects, use adobe-after-effects-scripting.'
---

# Adobe After Effects Integrations

Build the things that run beside or inside After Effects: panels, native
plugins, and the bridges an outside program uses to drive it.

## Scope

| This skill | adobe-after-effects-scripting |
| --- | --- |
| CEP and UXP panels: manifests, packaging, debugging, installing | The ExtendScript a panel sends with `evalScript` |
| C++ effect, AEGP and AEIO plugins on the After Effects SDK | Scripts run by hand, from the Scripts folders, or with `AfterFX.exe -r` |
| MCP servers and other bridges, and how they reach After Effects | The object model those bridges' scripts use |
| Choosing which kind of component a job needs | Expressions, ScriptUI panels, `aerender` |

A bridge's process, protocol and security belong here. Every line of
ExtendScript it runs inside After Effects belongs to the scripting skill.

## Choose the component

| The job | Build |
| --- | --- |
| Run one automation from a terminal, scheduler or CI | No integration: a script with `AfterFX.exe -r`, or `aerender` to render. See the scripting skill. |
| A panel of buttons and fields, ExtendScript only | A ScriptUI panel. See the scripting skill. |
| A panel with HTML, CSS and Node.js | A CEP extension today; a UXP plugin once After Effects' UXP support leaves beta. See [CEP and UXP](#cep-and-uxp). |
| A new effect that processes pixels or audio | A C++ effect plugin. See [The C++ SDK](#the-c-sdk). |
| Menu commands, idle-time work, deep hooks, or running scripts from native code | An AEGP. |
| Import or export a file format After Effects lacks | An AEIO. |
| An AI agent, pipeline or web application driving After Effects | A bridge, often behind an MCP server. See [Bridges and MCP servers](#bridges-and-mcp-servers). |

## Versions

After Effects 2025 is 25.x, 2026 is 26.x, and 2027 is 27.0. Read the version
from the installed `Support Files\AfterFX.exe` on Windows, or `app.version`
from a script, before choosing an API: CEP 12 arrived in 25.0, and UXP support
starts at 27.0.

## CEP and UXP

### CEP

A CEP extension is an HTML page in a Chromium panel that calls After Effects
through ExtendScript.

- **Layout:** a folder holding `CSXS/manifest.xml`, the panel's HTML and
  JavaScript, Adobe's `CSInterface.js` for the matching CEP version, and the
  ExtendScript file the manifest names.
- **Host:** After Effects' host ID is `AEFT`. After Effects 25.0 ships CEP 12,
  and 26.0 still does: its `Support Files\CEPHtmlEngine\CEPHtmlEngine.exe` is
  version 12.0.1, though no Adobe document lists 26.x. Read that file's
  version to check an installation.
- **Calling After Effects:** `csInterface.evalScript(script, callback)` runs
  ExtendScript on After Effects' main thread and hands the callback a string,
  or `"EvalScript error."` when it fails. Serialize results yourself,
  because ExtendScript has no `JSON`. Keep every call short: the main thread
  is the user interface.
- **Node.js:** `--enable-nodejs` and `--mixed-context` in the manifest's
  `<CEFCommandLine>`. CEP 12 bundles Node.js 17.7.1 and Chromium 99, so native
  modules must be built for that Node.js.
- **Development:** unsigned extensions load only with **PlayerDebugMode** set
  for the CEP version (`CSXS.12` for CEP 12). A `.debug` file in the
  extension root maps the extension to a port for Chrome DevTools, and must
  name `AEFT` itself.
- **Distribution:** sign with `ZXPSignCmd` into a `.zxp`, with a timestamp,
  on the platform it will run on, and install with Adobe's Unified Plugin
  Installer Agent (UPIA). `ExManCmd` no longer works with Creative Cloud 2022
  apps and later.
- **Limits:** After Effects does not support resizing a panel from code.
- **Scaffolding:** Hyper Brew's Bolt CEP builds CEP extensions with Vite,
  TypeScript and React, Svelte or Vue, compiles modern ExtendScript down to
  ES3, and packages ZXPs.

Manifest, folders, debug settings and signing commands are in
[references/cep.md](references/cep.md).

### CEP's retirement

Adobe's announcement, published September 2026: After Effects, Illustrator
and Media Encoder **stop accepting new CEP submissions and turn CEP off by
default in December 2028**, users can turn it back on, and **CEP is removed
from these apps at the end of 2029**. Every flagship app gets at least two
years from its UXP public beta before CEP goes. **ExtendScript scripts are not
affected.** A new panel meant to last past 2028 needs a UXP plan.

### UXP

- After Effects added UXP plugin support in the **27.0 beta**, first as a
  private beta that used a special build of the UXP Developer Tool, with a
  public beta announced for November 2026. Check the current status before
  building on it.
- Documentation: <https://developer.adobe.com/after-effects/uxp/>, where every
  API lists 27.0 as its minimum version. The host module is
  `require("aftereffects")`.
- The manifest's `host.app` value for After Effects is not yet in the general
  UXP manifest documentation; take it from the After Effects UXP pages.
- Bolt UXP lists After Effects only for private-beta participants, and its
  hybrid C++ plugins do not support After Effects.

## The C++ SDK

- **Get it** from the Adobe Developer Console, linked as "Get the SDKs" from
  <https://developer.adobe.com/after-effects/>. Releases follow After Effects
  (25.2, 25.6, 26.5, then a 27.0 update for the beta). The guide is at
  <https://ae-plugins.docsforadobe.dev/>.
- **Plugin types:** effects, AEGPs (After Effects General Plugins), AEIOs
  (input and output), Artisans (3D renderers) and BlitHooks.
- **Entry points:** the samples use `EffectMain()` for effects, a
  `PF_Cmd`-dispatching function, and `EntryPointFunc()` for AEGPs. The real
  name is whatever the PiPL resource declares.
- **PiPL:** every plugin carries a PiPL resource. On Windows the sample
  projects' custom build steps turn the cross-platform `.r` file into an `.rc`
  file; on macOS, Rez compiles it. The out flags in the PiPL must match those
  set in `GlobalSetup`.
- **Files:** a DLL with the `.aex` extension on Windows, a `.plugin` bundle on
  macOS.
- **Install:** installers read
  `HKLM\SOFTWARE\Adobe\After Effects\<version>\CommonPluginInstallPath` on
  Windows; on macOS the shared folder is
  `/Library/Application Support/Adobe/Common/Plug-ins/7.0/MediaCore/` (7.0 for
  every Creative Cloud version). After Effects ignores folders whose names
  end in a closing parenthesis or start with `~` (Windows) or `¬` (macOS).
- **Multi-Frame Rendering:** set `PF_OutFlag2_SUPPORTS_THREADED_RENDERING`
  only once the effect is thread-safe.
- **SmartFX and GPU:** `PF_OutFlag2_SUPPORTS_SMART_RENDER` brings
  `PF_Cmd_SMART_PRE_RENDER` and `PF_Cmd_SMART_RENDER`;
  `PF_OutFlag2_SUPPORTS_GPU_RENDER_F32` (16.0 and later) with
  `PF_Cmd_GPU_DEVICE_SETUP` and `PF_Cmd_SMART_RENDER_GPU` for GPU rendering.
- **Running ExtendScript from C++:** `AEGP_ExecuteScript` in
  `AEGP_UtilitySuite6` returns the value of the script's last line.
- **AEGP threading:** none. Every AEGP call happens on the main thread, in a
  callback or the idle hook (`AEGP_RegisterIdleHook`).
- **macOS 15 and later** refuse to load unsigned plugins.

Signatures, the thread-safety rules and build requirements are in
[references/cpp-sdk.md](references/cpp-sdk.md).

## Bridges and MCP servers

After Effects has no network API. An outside program reaches it in one of four
ways:

| Bridge | How it works | Strengths | Costs |
| --- | --- | --- | --- |
| Command line | `AfterFX.exe -r` or `-s` on Windows, AppleScript `DoScriptFile` on macOS, runs a script in the running instance | Nothing to install inside After Effects | No return channel; results go through a file. macOS needs Automation permission. |
| File mailbox | A ScriptUI panel or `Startup` script polls a folder with `app.scheduleTask` and writes results beside the commands | Pure ExtendScript, no ports | Latency of the polling interval; needs the file-access preference |
| CEP panel server | Node.js in a CEP panel listens on loopback and calls `evalScript` per request | Immediate replies, rich panel | A listening socket to secure; tied to CEP's retirement |
| AEGP | A native plugin accepts connections and runs work from its idle hook with `AEGP_ExecuteScript` | Fast, no panel needed | C++, per-platform builds, main-thread-only rules |

An MCP server sits in front of one of these. The rules that keep it safe and
reliable:

- **Use stdio** unless something requires HTTP. A stdio server has no
  listener at all, and writes nothing to stdout except protocol messages; log
  to stderr. Over HTTP, bind to `127.0.0.1`, validate the `Origin` header,
  and require a token.
- **Use the official SDK** and read the specification revision it targets.
  The 2026-07-28 revision changed sessions and transports, so examples
  written for older revisions may no longer apply.
- **Expose specific tools** (create a composition, add a layer, set a
  property, queue a render, describe the project) rather than one tool that
  runs any script. A run-anything tool is arbitrary code execution inside an
  application allowed to write files and reach the network. If one exists,
  keep it off by default and say so in its description.
- **Never build ExtendScript by pasting strings together.** Send arguments as
  data, serialized once and parsed inside After Effects, or escape every
  string with a single, tested function.
- **Run one command at a time.** All of it lands on After Effects' main
  thread. Queue requests, time them out, and report "After Effects is busy"
  when a render or a modal dialog holds it, rather than hanging.
- **Wrap each tool call in an undo group**, so the person at the keyboard can
  undo what an agent did, and return structured results with the error
  message and line when a script fails.

Patterns, open-source examples and the security detail are in
[references/bridges-and-mcp.md](references/bridges-and-mcp.md).

## Sources

- CEP resources and cookbook: <https://github.com/Adobe-CEP/CEP-Resources>
- CEP retirement and UXP announcement:
  <https://blog.developer.adobe.com/en/publish/2026/09/investing-in-the-future-of-creative-cloud-extensibility-uxp-comes-to-our-flagship-applications>
- After Effects UXP: <https://developer.adobe.com/after-effects/uxp/>
- After Effects C++ SDK Guide: <https://ae-plugins.docsforadobe.dev/>
- Model Context Protocol: <https://modelcontextprotocol.io/>
- UPIA: <https://blog.developer.adobe.com/en/publish/2021/06/new-command-line-tool-for-plugin-installation-replaces-exmancmd>
