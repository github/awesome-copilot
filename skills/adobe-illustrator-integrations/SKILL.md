---
name: adobe-illustrator-integrations
description: 'Build, debug, package, and document Adobe Illustrator integrations: CEP extension panels, C++ SDK plug-ins (.aip), the coming UXP plugins, MCP servers that drive Illustrator, computer-use automation, and OS scripts (batch, PowerShell, bash, AppleScript) that run ExtendScript in Illustrator. Use when creating or fixing an Illustrator extension or plug-in, choosing between a script, extension, or plug-in, connecting an AI tool to Illustrator, automating Illustrator from the command line, or writing install and usage docs for an Illustrator tool someone will publish. Pairs with adobe-illustrator-scripting for the ExtendScript DOM.'
---

# Adobe Illustrator Integrations

Guidance for everything that sits around an Illustrator script: the panel a user clicks, the native plug-in that adds a tool, the command line or AI agent that starts Illustrator work from outside, and the documentation that ships with it. For the Illustrator DOM itself (documents, layers, paths, colors, exports), use the **adobe-illustrator-scripting** skill.

## When to Use This Skill

- Choosing how to deliver an Illustrator feature: a script, a CEP extension, a C++ plug-in, a UXP plugin, an MCP server, or an OS automation script
- Building or fixing a CEP extension panel (HTML, JavaScript, and an ExtendScript host)
- Building or fixing a C++ plug-in (`.aip`) with the Illustrator SDK
- Running `.jsx` scripts from batch, PowerShell, bash, Python, or AppleScript, including passing parameters and reading results
- Building or reviewing an MCP server that lets an AI tool drive Illustrator
- Working in Illustrator through a computer-use tool when no scripting route exists
- Writing step-by-step instructions people follow by hand, or install and usage docs for an asset, script, extension, or plug-in someone will publish
- Organizing the files of an Illustrator project (sources, linked assets, exports, docs) so automation can find them

## Script, Extension, or Plug-in

Adobe's own terms:

- A **script** is ExtendScript (`.jsx`), AppleScript, or VBScript run against Illustrator's scripting object model. It has no persistent UI beyond ScriptUI dialogs.
- An **extension** is a CEP panel: an HTML and JavaScript UI hosted in Illustrator that calls ExtendScript through `CSInterface.evalScript`.
- A **plug-in** is native code built with the Illustrator C++ SDK (`.aip`). In apps that already run UXP (Photoshop, InDesign, Premiere Pro), "plugin" also means a UXP plugin; Illustrator UXP plugins are not public yet.

| Option | What it is | UI | Installs to | Ships as | Pick it when |
| --- | --- | --- | --- | --- | --- |
| Manual instructions | Steps a person follows | Illustrator's own | Nothing | A document | The task is rare, or needs judgment at every step |
| ExtendScript script | `.jsx` run in Illustrator | Optional ScriptUI dialog | `Presets/<locale>/Scripts` or anywhere (File > Scripts > Other Script) | `.jsx` file | One action, batch work, or a step another tool calls |
| CEP extension | HTML panel plus ExtendScript host | Dockable panel | CEP `extensions` folder | Signed `.zxp` | Users need a persistent panel with controls and previews |
| C++ plug-in | Native `.aip` from the Illustrator SDK | Tools, menus, notifiers, native dialogs | Plug-ins folder or the Additional Plug-ins Folder | `.aip` per OS and major version | You need a custom tool, live effects, speed, or events scripts cannot reach |
| UXP plugin | Modern JavaScript plugin model | Panels and dialogs | Through Creative Cloud | `.ccx` | Plan for it; Illustrator's public beta is due by Spring 2027 |
| MCP server | A process an AI tool calls, which runs scripts in Illustrator | The AI tool's chat | The AI tool's MCP config | A package or repo | An agent should create or inspect artwork through tools |
| OS automation | Batch, PowerShell, bash, or AppleScript that starts scripts | None | Anywhere | Script files | Illustrator work is one step of a larger pipeline |

Start with the lowest tier that meets the need. A script that works is the core of every higher tier: a CEP panel, an MCP tool, and an OS script all end up calling ExtendScript.

## Extensibility Timeline

From Adobe's announcement "Investing in the future of Creative Cloud extensibility" (blog.developer.adobe.com, September 2026):

- Illustrator UXP plugins: public beta by Spring 2027.
- CEP in Illustrator, After Effects, and Media Encoder: the Adobe Marketplace stops accepting new CEP submissions in December 2028, and CEP is disabled by default from December 2028.
- CEP leaves these apps from December 2029, with at least two years between each app's UXP public beta and CEP's removal from new versions.
- ExtendScript is not affected by the transition.

So a CEP extension built today has a working life of a few years. Keep its logic in plain ExtendScript files the panel calls, which carry over to a UXP plugin or an MCP server unchanged.

## Workflow

1. **Scope**: what the user does, which Illustrator versions and OSes it must run on, and who installs it.
2. **Pick the tier** from the table above.
3. **Write the ExtendScript core first** with the adobe-illustrator-scripting skill, as functions that take a plain settings object and return a result string, so any front end can call them.
4. **Add the front end**:
   - CEP panel: [references/cep-extensions.md](references/cep-extensions.md) (folder layout, manifest, `CSInterface`, debug mode, signing, install)
   - C++ plug-in: [references/cpp-plugins.md](references/cpp-plugins.md) (SDK, build, PiPL, suites, notifiers, debugging)
   - Command line, MCP server, or computer use: [references/automation-and-mcp.md](references/automation-and-mcp.md) (COM, AppleScript, parameters, results, MCP design, safety)
5. **Test inside Illustrator** on a copy of a real document: run every option, export a PNG of the result, and compare it with the expected output.
6. **Package**: a signed ZXP for CEP, a per-OS `.aip` for plug-ins, a versioned folder or package for scripts and servers.
7. **Document** with [references/publishing-docs.md](references/publishing-docs.md): requirements, compatibility, install steps per OS, a walkthrough with screenshots, a GIF, troubleshooting, and a changelog.

## Running a Script From Outside Illustrator

| Platform | Route | Notes |
| --- | --- | --- |
| Windows | COM `Illustrator.Application` | `DoJavaScriptFile(JavaScriptFile, [Arguments], [ExecutionMode])` and `DoJavaScript(JavaScriptCode, [Arguments], [ExecutionMode])`; ExecutionMode 1 never shows the debugger |
| macOS | AppleScript `do javascript` | `do javascript "$.evalFile(new File(arguments[0]))" with arguments {scriptPath}`, with the path passed to `osascript` as an argument so it never enters script source; check the exact app name for your version |
| Both | VS Code ExtendScript Debugger | Adobe's extension for running and debugging `.jsx` against a running app |
| Windows (legacy) | ExtendScript Toolkit `-run` | 32-bit, does not run on macOS 10.15 or later; keep only for old pipelines |

Pass parameters through a sidecar `key=value` file (no JSON parser or `eval` needed in ES3) and have the script write its result to a file, because `arguments` handling differs between launchers. The patterns are in [references/automation-and-mcp.md](references/automation-and-mcp.md).

## Instructions People Follow by Hand

When the deliverable is a set of steps rather than code (for a complex graphic, or for an asset someone downloads):

- Name the Illustrator version the steps were checked on, and give menu paths exactly as they appear (`Object > Path > Offset Path`).
- One action per step, with the panel and the value to set (`Stroke panel: Weight 2 pt, Align Stroke to Inside`).
- Show the expected result after each group of steps, with a screenshot or a small PNG.
- Mark the steps that differ on Windows and macOS (shortcuts, file dialogs, font paths).
- Offer the scripted route next to the manual one when a script exists.

## Guardrails

- Work on copies of user documents; never overwrite an original without a backup.
- Ask before writing into Adobe's install folders, the system CEP folder, or the registry.
- Development mode (`PlayerDebugMode`) belongs on development machines only. Ship signed ZXPs to users.
- Never commit signing certificates, certificate passwords, API keys, or tokens. Read secrets from environment variables.
- Prefer scripting, COM, or AppleScript over clicking through the UI; use computer use only for what has no scripting route.
- Never automate around sign-in, licensing, or account dialogs.
- Fonts from Adobe Fonts cannot be bundled in a plug-in or extension; document them as a requirement instead.
- Version-specific details (CEP version, SDK version, menu names) change; say which version you checked and point to Adobe's docs.

## References

- [references/cep-extensions.md](references/cep-extensions.md): CEP panels from folder layout to signed ZXP
- [references/cpp-plugins.md](references/cpp-plugins.md): C++ plug-ins with the Illustrator SDK
- [references/automation-and-mcp.md](references/automation-and-mcp.md): command-line runs, MCP servers, and computer use
- [references/publishing-docs.md](references/publishing-docs.md): install and usage docs for a published Illustrator tool
- Adobe CEP Resources (CEP 12 cookbook, `CSInterface.js`, ZXPSignCMD): [Adobe-CEP/CEP-Resources](https://github.com/Adobe-CEP/CEP-Resources)
- Adobe CEP getting-started guides (packaging, signing, distribution): [Adobe-CEP/Getting-Started-guides](https://github.com/Adobe-CEP/Getting-Started-guides)
- UXP and CEP timeline: [Investing in the future of Creative Cloud extensibility](https://blog.developer.adobe.com/en/publish/2026/09/investing-in-the-future-of-creative-cloud-extensibility-uxp-comes-to-our-flagship-applications)
