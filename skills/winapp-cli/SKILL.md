---
name: winapp-cli
description: 'Windows App Development CLI (winapp) for building, packaging, and deploying Windows applications. Use when asked to initialize Windows app projects, create MSIX packages, generate AppxManifest.xml, manage development certificates, add package identity for debugging, sign packages, or access Windows SDK build tools. Supports .NET, C++, Electron, Rust, Tauri, and cross-platform frameworks targeting Windows.'
---

# Windows App Development CLI

The Windows App Development CLI (`winapp`) is a command-line interface for managing Windows SDKs, MSIX packaging, generating app identity, manifests, certificates, and using build tools with any app framework. It bridges the gap between cross-platform development and Windows-native capabilities.

## When to Use This Skill

Use this skill when you need to:

- Initialize a Windows app project with SDK setup, manifests, and certificates
- Create MSIX packages from application directories
- Generate or manage AppxManifest.xml files
- Create and install development certificates for signing
- Add package identity for debugging Windows APIs
- Sign MSIX packages or executables
- Access Windows SDK build tools from any framework
- Build Windows apps using cross-platform frameworks (Electron, Rust, Tauri, Qt)
- Set up CI/CD pipelines for Windows app deployment
- Access Windows APIs that require package identity (notifications, Windows AI, shell integration)

## Prerequisites

- Windows 10 or later
- winapp CLI installed via one of these methods:
  - **WinGet**: `winget install Microsoft.WinAppCli --source winget`
  - **NPM** (for Electron): `npm install @microsoft/winappcli --save-dev`
  - **GitHub Actions/Azure DevOps**: Use [setup-WinAppCli](https://github.com/microsoft/setup-WinAppCli) action
  - **Manual**: Download from [GitHub Releases](https://github.com/microsoft/WinAppCli/releases/latest)

## Core Capabilities

### 1. Project Initialization (`winapp init`)

Initialize a directory with required assets (manifest, certificates, libraries) for building a modern Windows app. Supports SDK installation modes: `stable`, `preview`, `experimental`, or `none`.

### 2. MSIX Packaging (`winapp pack`)

Create MSIX packages from prepared directories with optional signing, certificate generation, and self-contained deployment bundling.

### 3. Package Identity for Debugging (`winapp create-debug-identity`)

Add temporary package identity to executables for debugging Windows APIs that require identity (notifications, Windows AI, shell integration) without full packaging.

### 4. Manifest Management (`winapp manifest`)

Generate AppxManifest.xml files and update image assets from source images, automatically creating all required sizes and aspect ratios.

### 5. Certificate Management (`winapp cert`)

Generate development certificates and install them to the local machine store for signing packages.

### 6. Package Signing (`winapp sign`)

Sign MSIX packages and executables with PFX certificates, with optional timestamp server support.

### 7. SDK Build Tools Access (`winapp tool`)

Run Windows SDK build tools with properly configured paths from any framework or build system.

## Usage Examples

### Example 1: Initialize and Package a Windows App

```bash
# Initialize workspace with defaults
winapp init

# Build your application (framework-specific)
# ...

# Create signed MSIX package
winapp pack ./build-output --generate-cert --output MyApp.msix
```

### Example 2: Debug with Package Identity

```bash
# Add debug identity to executable for testing Windows APIs
winapp create-debug-identity ./bin/MyApp.exe

# Run your app - it now has package identity
./bin/MyApp.exe
```

### Example 3: CI/CD Pipeline Setup

```yaml
# GitHub Actions example
- name: Setup winapp CLI
  uses: microsoft/setup-WinAppCli@v1

- name: Initialize and Package
  run: |
    winapp init --no-prompt
    winapp pack ./build-output --output MyApp.msix
```

### Example 4: Electron App Integration

```bash
# Install via npm
npm install @microsoft/winappcli --save-dev

# Initialize and add debug identity for Electron
npx winapp init
npx winapp node add-electron-debug-identity

# Package for distribution
npx winapp pack ./out --output MyElectronApp.msix
```

## Guidelines

1. **Run `winapp init` first** - Always initialize your project before using other commands to ensure SDK setup, manifest, and certificates are configured.
2. **Re-run `create-debug-identity` after manifest changes** - Package identity must be recreated whenever AppxManifest.xml is modified.
3. **Use `--no-prompt` for CI/CD** - Prevents interactive prompts in automated pipelines by using default values.
4. **Use `winapp restore` for shared projects** - Recreates the exact environment state defined in `winapp.yaml` across machines.
5. **Generate assets from a single image** - Use `winapp manifest update-assets` with one logo to generate all required icon sizes.

## Common Patterns

### Pattern: Initialize New Project

```bash
cd my-project
winapp init
# Creates: AppxManifest.xml, development certificate, SDK configuration, winapp.yaml
```

### Pattern: Package with Existing Certificate

```bash
winapp pack ./build-output --cert ./mycert.pfx --cert-password secret --output MyApp.msix
```

### Pattern: Self-Contained Deployment

```bash
# Bundle Windows App SDK runtime with the package
winapp pack ./my-app --self-contained --generate-cert
```

### Pattern: Update Package Versions

```bash
# Update to latest stable SDKs
winapp update

# Or update to preview SDKs
winapp update --setup-sdks preview
```

## Limitations

- Windows 10 or later required (Windows-only CLI)
- Package identity debugging requires re-running `create-debug-identity` after any manifest changes
- Self-contained deployment increases package size by bundling the Windows App SDK runtime
- Development certificates are for testing only; production requires trusted certificates
- Some Windows APIs require specific capability declarations in the manifest
- winapp CLI is in public preview and subject to change

## Windows APIs Enabled by Package Identity

Package identity unlocks access to powerful Windows APIs:

| API Category | Examples |
| ------------ | -------- |
| **Notifications** | Interactive native notifications, notification management |
| **Windows AI** | On-device LLM, text/image AI APIs (Phi Silica, Windows ML) |
| **Shell Integration** | Explorer, Taskbar, Share sheet integration |
| **Protocol Handlers** | Custom URI schemes (`yourapp://`) |
| **Device Access** | Camera, microphone, location (with consent) |
| **Background Tasks** | Run when app is closed |
| **File Associations** | Open file types with your app |

## Troubleshooting

| Issue | Solution |
| ----- | -------- |
| Certificate not trusted | Run `winapp cert install <cert-path>` to install to local machine store |
| Package identity not working | Run `winapp create-debug-identity` after any manifest changes |
| SDK not found | Run `winapp restore` or `winapp update` to ensure SDKs are installed |
| Signing fails | Verify certificate password and ensure cert is not expired |

## References

- [GitHub Repository](https://github.com/microsoft/WinAppCli)
- [Full CLI Documentation](https://github.com/microsoft/WinAppCli/blob/main/docs/usage.md)
- [Sample Applications](https://github.com/microsoft/WinAppCli/tree/main/samples)
- [Windows App SDK](https://learn.microsoft.com/windows/apps/windows-app-sdk/)
- [MSIX Packaging Overview](https://learn.microsoft.com/windows/msix/overview)
- [Package Identity Overview](https://learn.microsoft.com/windows/apps/desktop/modernize/package-identity-overview)
