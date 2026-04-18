---
name: sandbox-npm-install
description: 'Install npm packages in a Docker sandbox environment. Use this skill whenever you need to install, reinstall, or update node_modules inside a container where the workspace is mounted via virtiofs. Native binaries (esbuild, lightningcss, rollup) crash on virtiofs, so packages must be installed on the local ext4 filesystem and symlinked back.'
---

# Sandbox npm Install

## When to Use This Skill

Use this skill whenever:
- You need to install npm packages for the first time in a new sandbox session
- `package.json` or `package-lock.json` has changed and you need to reinstall
- You encounter native binary crashes with errors like `SIGILL`, `SIGSEGV`, `mmap`, or `unaligned sysNoHugePageOS`
- The `node_modules` directory is missing or corrupted

## Prerequisites

- A Docker sandbox environment with a virtiofs-mounted workspace
- Node.js and npm available in the container
- A `package.json` file in the target workspace

## Background

Docker sandbox workspaces are typically mounted via **virtiofs** (file sync between the host and Linux VM). Native Go and Rust binaries (esbuild, lightningcss, rollup, etc.) crash with mmap alignment failures when executed from virtiofs on aarch64. The fix is to install on the container's local ext4 filesystem and symlink back into the workspace.

## Step-by-Step Installation

Run the bundled install script from the workspace root:

```bash
bash scripts/install.sh
```

### Common Options

| Option | Description |
|---|---|
| `--workspace <path>` | Path to directory containing `package.json` (auto-detected if omitted) |
| `--playwright` | Also install Playwright Chromium browser for E2E testing |

### What the Script Does

1. Copies `package.json`, `package-lock.json`, and `.npmrc` (if present) to a local ext4 directory
2. Runs `npm ci` (or `npm install` if no lockfile) on the local filesystem
3. Symlinks `node_modules` back into the workspace
4. Verifies known native binaries (esbuild, rollup, lightningcss, vite) if present
5. Optionally installs Playwright browsers and system dependencies (uses `sudo` when available)

If verification fails, run the script again — crashes can be intermittent during initial setup.

## Post-Install Verification

After the script completes, verify your toolchain works. For example:

```bash
npm test             # Run project tests
npm run build        # Build the project
npm run dev          # Start dev server
```

## Important Notes

- The local install directory (e.g., `/home/agent/project-deps`) is **container-local** and is NOT synced back to the host
- The `node_modules` symlink appears as a broken link on the host — this is harmless since `node_modules` is typically gitignored
- Running `npm ci` or `npm install` on the host naturally replaces the symlink with a real directory
- After any `package.json` or `package-lock.json` change, re-run the install script
- Do NOT run `npm ci` or `npm install` directly in the mounted workspace — native binaries will crash

## Troubleshooting

| Problem | Solution |
|---|---|
| `SIGILL` or `SIGSEGV` when running dev server | Re-run the install script; ensure you're not running `npm install` directly in the workspace |
| `node_modules` not found after install | Check that the symlink exists: `ls -la node_modules` |
| Permission errors during install | Ensure the local deps directory is writable by the current user |
| Verification fails intermittently | Run the script again — native binary crashes can be non-deterministic on first load |

## Vite Compatibility

If your project uses Vite, you may need to allow the symlinked path in `server.fs.allow`. Add the symlink target's parent directory (e.g., `/home/agent/project-deps/`) to your Vite config so that Vite can serve files through the symlink.
