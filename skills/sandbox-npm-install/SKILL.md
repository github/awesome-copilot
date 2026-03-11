---
name: sandbox-npm-install
description: 'Install npm packages in the Docker Sandbox (Copilot) environment. Use this skill whenever you need to run npm install, npm ci, or npm i in the container, or as a recovery when native binaries (esbuild, rollup, lightningcss, vite) crash with SIGILL, SIGSEGV, mmap, or unaligned errors on virtiofs. Packages must be installed on local ext4 and symlinked into the workspace.'
---

# Install npm packages in Docker Sandbox

> **Environment:** This skill is specifically for the Docker Sandbox (Copilot coding agent) environment. It is not needed for native macOS/Linux/Windows development.

## When to Use

Use this skill whenever you are working inside a Docker Sandbox and:
- You need to run `npm install`, `npm ci`, or `npm i`
- `package.json` or `package-lock.json` has changed and you need to reinstall
- You encounter native binary crashes (esbuild, lightningcss, rollup) with errors like `SIGILL`, `SIGSEGV`, `mmap`, or `unaligned sysNoHugePageOS`
- The `node_modules` directory is missing or corrupted

**Do NOT run `npm ci` or `npm install` directly in the workspace** — it will install on virtiofs and native binaries will crash.

## Background

The Docker Sandbox workspace is mounted via **virtiofs** (file sync between macOS host and Linux VM). Native Go and Rust binaries (esbuild, lightningcss, rollup) crash with mmap alignment failures when executed from virtiofs on aarch64. The fix is to install on the sandbox's local ext4 filesystem and symlink back.

## Installation

Run the bundled install script from the workspace root:

```bash
bash .github/skills/sandbox-npm-install/install.sh
```

To also install Playwright browsers for E2E testing:

```bash
bash .github/skills/sandbox-npm-install/install.sh --playwright
```

The script performs these steps automatically:
1. Copies `package.json` and `package-lock.json` to `/home/agent/project-deps/`
2. Runs `npm ci` on the local ext4 filesystem
3. Symlinks `node_modules` back into the workspace
4. Verifies all native binaries (esbuild, rollup, lightningcss, vite)
5. Optionally installs Playwright browsers

If verification fails, run the script again — crashes can be intermittent.

## Post-Install Verification

After the script completes, verify that your project's toolchain works:

```bash
npm run build        # or your project's build command
npm test             # or your project's test command
npm run dev          # Dev server
```

## How It Works

- The script installs dependencies on the sandbox's local ext4 filesystem (`/home/agent/project-deps/`)
- It symlinks `node_modules` back into your workspace directory
- If your project uses Vite, add a `getSymlinkAllowPaths()` helper to `vite.config.ts` that detects the symlink and adds its target to `server.fs.allow`
- On native development environments (no symlink), this has zero impact

## Important Notes

- `/home/agent/` is **sandbox-local** and NOT synced to the macOS host
- The symlink appears as a broken link on macOS — this is harmless since `node_modules` is gitignored
- Running `npm ci` or `npm install` on macOS naturally replaces the symlink with a real directory
- After any `package.json` or `package-lock.json` change, re-run the install script
- Do NOT run `npm ci` or `npm install` directly in the workspace — it will install on virtiofs and binaries will crash
