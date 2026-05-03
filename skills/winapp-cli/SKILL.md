---
name: winapp-cli
description: 'Windows App Development CLI (winapp) for building, packaging, signing, debugging, and UI-automating Windows applications. Use when asked to initialize Windows app projects, create MSIX packages, manage AppxManifest.xml or development certificates, run an app as packaged for debugging, automate Windows UI via Microsoft UI Automation, publish to the Microsoft Store, or access Windows SDK build tools. Covers commands like init, pack, run, unregister, manifest, cert, sign, store, ui, and tool. Supports .NET (csproj), C++, Electron, Rust, Tauri, Flutter, and other Windows frameworks.'
---

# Windows App Development CLI

`winapp` manages Windows SDKs, MSIX packaging, app identity, manifests, certificates, signing, store publishing, and UI automation for any framework targeting Windows (.NET/csproj, C++, Electron, Rust, Tauri, Flutter, etc.). Public preview — subject to change.

## Prerequisites

- Windows 10 or later
- Install via one of:
  - WinGet: `winget install Microsoft.WinAppCli --source winget`
  - npm (Electron/Node): `npm install @microsoft/winappcli --save-dev`
  - CI: [`setup-WinAppCli`](https://github.com/microsoft/setup-WinAppCli) GitHub Action
  - Manual: [GitHub Releases](https://github.com/microsoft/WinAppCli/releases/latest)

## Commands

| Command | Purpose |
| ------- | ------- |
| `init` | Initialize project: SDKs (`stable`/`preview`/`experimental`/`none`), manifest, `winapp.yaml`. **`.csproj` projects skip `winapp.yaml`** and use NuGet directly. **Does not auto-generate a cert** (v0.2.0+). |
| `restore` / `update` | Restore or update SDK package versions (`--setup-sdks preview` for preview SDKs). |
| `pack <dir>` | Build MSIX. Flags: `--generate-cert`, `--cert <pfx> --cert-password`, `--self-contained` (bundles WinAppSDK runtime), `--output`. Auto-discovers third-party WinRT components from `.winmd` (v0.2.1+). |
| `run <dir> [-- <app args>]` | Pack as loose layout and launch as packaged app — ideal for IDE F5 debugging without producing an MSIX. Supports `--` arg passthrough (v0.3.1+). (v0.3.0+) |
| `create-debug-identity <exe>` | Add sparse package identity to an exe so it can call identity-gated APIs (notifications, Windows AI, shell integration) without full packaging. |
| `unregister` | Remove sideloaded dev packages registered by `run` / `create-debug-identity`. |
| `manifest` | Generate `AppxManifest.xml`; supports placeholders and qualified names. `manifest update-assets <image>` generates all required icon sizes from one source (PNG **or SVG**, v0.2.1+). |
| `cert generate` / `install` / `info` | Manage dev certs. `cert info <pfx> --password <pwd>` shows subject/issuer/validity. `--export-cer` exports the public key. `--json` available on `generate` and `info`. (v0.2.1+) |
| `sign <target> --cert <pfx>` | Sign MSIX or exe; optional timestamp server. |
| `tool` | Run Windows SDK build tools with paths configured. |
| `store` | Run Microsoft Store Developer CLI for store submission/validation/publishing. |
| `create-external-catalog` | Generate `CodeIntegrityExternal.cat` for TrustedLaunch sparse packages. |
| `ui list-windows` / `inspect` / `click` / `search` / `wait-for` / `get-focused` | UI automation via Microsoft UI Automation. All support `--json`. **Envelope changed in v0.3.1** — see [`references/ui-json-envelope.md`](./references/ui-json-envelope.md). (v0.3.0+) |
| `node create-addon` / `add-electron-debug-identity` / `clear-electron-debug-identity` | Electron/Node helpers. All commands also exposed as typed JS/TS functions from `@microsoft/winappcli` (v0.2.1+). |

CI tip: pass `--no-prompt` to skip interactive prompts.

## Quick start

```bash
# .NET / generic: init, generate dev cert, build, package
winapp init
winapp cert generate
winapp pack ./build-output --generate-cert --output MyApp.msix

# Debug a built exe with package identity (no MSIX)
winapp create-debug-identity ./bin/MyApp.exe
./bin/MyApp.exe

# Run as packaged app for F5 debugging, with app args after `--`
winapp run ./bin/Debug/net10.0-windows10.0.26100.0/win-x64 \
  --manifest ./appxmanifest.xml -- --my-flag value

# Electron
npx winapp init
npx winapp node add-electron-debug-identity
npx winapp pack ./out --output MyElectronApp.msix
```

## Gotchas

- **`winapp ui --json` envelope reshaped in v0.3.1** — `ui inspect`, `ui get-focused`, `ui search`, and `ui wait-for` use new shapes; per-element `id` / `parentSelector` / `windowHandle` are removed (use `selector`). Full schemas in [`references/ui-json-envelope.md`](./references/ui-json-envelope.md).
- **`winapp init` no longer auto-generates a certificate** (v0.2.0+) — run `winapp cert generate` explicitly. The old `--no-cert` flag was removed.
- **`.csproj` projects skip `winapp.yaml`** — SDK packages live in the project file. Hybrid setups need adjustment.
- **NuGet global cache, not `%userprofile%/.winapp/packages`** (v0.2.0+) — scripts depending on the old folder will break.
- **Re-run `create-debug-identity` after any manifest change** — identity is bound at registration time.

## Troubleshooting

| Issue | Fix |
| ----- | --- |
| Certificate not trusted | `winapp cert install <pfx>` to add to local machine store |
| Identity-gated API fails | Re-run `create-debug-identity` after manifest changes |
| SDK not found | `winapp restore` or `winapp update` |
| `register`/`unregister` errors | v0.3.1 maps `0x800704EC`→Developer Mode and `0x80073CFB`→package conflict (with actionable hint) |

## References

- [winapp CLI repo](https://github.com/microsoft/WinAppCli) · [Full usage docs](https://github.com/microsoft/WinAppCli/blob/main/docs/usage.md) · [.NET guide](https://github.com/microsoft/WinAppCli/blob/main/docs/guides/dotnet.md) · [Samples](https://github.com/microsoft/WinAppCli/tree/main/samples)
- [Windows App SDK](https://learn.microsoft.com/windows/apps/windows-app-sdk/) · [MSIX overview](https://learn.microsoft.com/windows/msix/overview) · [Package identity overview](https://learn.microsoft.com/windows/apps/desktop/modernize/package-identity-overview)
