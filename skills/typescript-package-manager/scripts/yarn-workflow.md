# yarn TypeScript Workflow

A comprehensive guide for managing TypeScript projects with Yarn — from classic Yarn 1.x to modern Yarn Berry (v3+), covering initialization to advanced monorepo workflows.

**Reference:** https://yarnpkg.com/

---

## Yarn Versions Explained

### Yarn Classic (1.x)

- **Status:** Maintenance mode
- **Use:** Existing projects, maximum compatibility
- **Install:** `npm install -g yarn`

### Yarn Berry (2.x/3.x/4.x)

- **Status:** Active development (current)
- **Use:** New projects, modern features
- **Install:** `corepack enable` (Node.js 16.9+)
- **Key Feature:** Plug'n'Play (PnP) for zero-installs

**This guide covers both versions with clear annotations.**

---

## Installation

### Yarn Classic (1.x)

```bash
# Via npm
npm install -g yarn

# Verify
yarn --version
```

### Yarn Berry (3.x+) via Corepack

```bash
# Enable Corepack (Node.js 16.9+)
corepack enable

# Set version in project
cd my-project
yarn set version stable

# Or specific version
yarn set version 4.0.2

# Verify
yarn --version
```

---

## Initializing a TypeScript Project

### 1. Create the Project

```bash
mkdir my-ts-project && cd my-ts-project

# Yarn Classic
yarn init

# Yarn Berry (interactive)
yarn init -2
```

### 2. Install TypeScript

```bash
# Install TypeScript and type definitions
yarn add -D typescript @types/node

# Optional: ts-node for running TypeScript
yarn add -D ts-node

# Optional: tsx (recommended, faster)
yarn add -D tsx

# Optional: tsup for bundling
yarn add -D tsup
```

### 3. Initialize TypeScript Configuration

```bash
yarn tsc --init
```

---

## Essential package.json Configuration

### Yarn Classic

```json
{
  "name": "my-ts-project",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "build:bundle": "tsup src/index.ts --format esm,cjs --dts",
    "start": "node dist/index.js",
    "test": "vitest run",
    "test:watch": "vitest",
    "type-check": "tsc --noEmit",
    "lint": "eslint src --ext .ts",
    "format": "prettier --write src/**/*.ts"
  },
  "devDependencies": {
    "@types/node": "^20.11.0",
    "tsx": "^4.7.0",
    "typescript": "^5.3.3"
  }
}
```

### Yarn Berry

```json
{
  "name": "my-ts-project",
  "version": "1.0.0",
  "type": "module",
  "packageManager": "yarn@4.0.2",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "vitest run",
    "type-check": "tsc --noEmit"
  },
  "devDependencies": {
    "@types/node": "^20.11.0",
    "tsx": "^4.7.0",
    "typescript": "^5.3.3"
  }
}
```

---

## Yarn Commands Cheat Sheet

### Installation

```bash
# Install all dependencies
yarn
yarn install

# Yarn Classic: Install from fresh
yarn install --frozen-lockfile

# Yarn Berry: Install from fresh
yarn install --immutable

# Install without optional deps
yarn install --ignore-optional

# Force reinstall
yarn install --force
```

### Adding Dependencies

```bash
# Add production dependency
yarn add <package>
yarn add express zod

# Add dev dependency
yarn add -D <package>
yarn add --dev typescript

# Add peer dependency
yarn add -P <package>
yarn add --peer react

# Add optional dependency
yarn add -O <package>
yarn add --optional fsevents

# Add exact version
yarn add -E <package>
yarn add --exact react@18.2.0

# Add to specific workspace
yarn workspace <workspace> add <package>
```

### Removing Dependencies

```bash
# Remove package
yarn remove <package>

# Remove from workspace
yarn workspace <workspace> remove <package>

# Remove from all workspaces (Yarn Berry)
yarn workspaces foreach remove <package>
```

### Updating Dependencies

```bash
# Update all to latest within ranges
yarn upgrade

# Update specific package
yarn upgrade <package>

# Update to latest (ignore ranges)
yarn upgrade <package> --latest

# Interactive update (Yarn Berry)
yarn upgrade-interactive

# Update all workspaces (Yarn Berry)
yarn workspaces foreach upgrade
```

### Running Scripts

```bash
# Run package script
yarn <script-name>
yarn dev
yarn test

# Run in workspace (Classic)
yarn workspace <workspace> <script>

# Run in workspace (Berry)
yarn workspace <workspace> run <script>

# Run in all workspaces
yarn workspaces run <script>

# Run in all workspaces (Berry, parallel)
yarn workspaces foreach -p run <script>
```

### Listing and Inspecting

```bash
# List installed packages
yarn list

# List in all workspaces
yarn workspaces list

# Show package info
yarn info <package>

# Why is package installed?
yarn why <package>

# Show outdated packages (Berry)
yarn outdated
```

### Global Packages

**Yarn Classic:**
```bash
# Install global package
yarn global add <package>

# List global packages
yarn global list

# Remove global package
yarn global remove <package>
```

**Yarn Berry:**
```bash
# Use npm or dedicated tools for globals
npm install -g <package>
```

### Cache Management

```bash
# Show cache directory
yarn cache dir

# Clean cache
yarn cache clean

# Clean specific package (Berry)
yarn cache clean <package>
```

---

## Yarn Configuration

### .yarnrc.yml (Yarn Berry)

```yaml
# Set Node.js version
nodeLinker: node-modules  # or 'pnp', 'pnpm'

# Enable Plug'n'Play
pnpMode: loose  # or 'strict'

# Custom registry
npmRegistryServer: "https://registry.npmjs.org"

# Scope-specific registry
npmScopes:
  mycompany:
    npmRegistryServer: "https://npm.company.com"

# Enable telemetry (opt-in)
enableTelemetry: false

# Deferred version folder
deferredVersionFolder: .yarn/versions

# Plugin list
plugins:
  - path: .yarn/plugins/@yarnpkg/plugin-typescript.cjs
    spec: "@yarnpkg/plugin-typescript"
```

### .yarnrc (Yarn Classic)

```
# Custom registry
registry "https://registry.npmjs.org"

# Save exact versions
save-exact true

# Flat node_modules
flat true
```

---

## Plug'n'Play (PnP) - Yarn Berry Feature

### What is PnP?

Plug'n'Play eliminates `node_modules` by generating a `.pnp.cjs` file that tells Node.js where packages are located.

**Benefits:**
- ✅ Instant installs (zero-installs with committed cache)
- ✅ Smaller repository size
- ✅ Guaranteed dependency strictness
- ✅ Faster module resolution

**Challenges:**
- ⚠️ IDE setup required
- ⚠️ Some tools incompatible
- ⚠️ Learning curve

### Enable PnP

```yaml
# .yarnrc.yml
nodeLinker: pnp
pnpMode: strict
```

### Disable PnP (use node_modules)

```yaml
# .yarnrc.yml
nodeLinker: node-modules
```

### VS Code PnP Setup

Install the official extension:
```bash
yarn dlx @yarnpkg/sdks vscode
```

Add to `.vscode/settings.json`:
```json
{
  "typescript.tsdk": ".yarn/sdks/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true
}
```

---

## Monorepo Workflow

### Structure

```
my-monorepo/
├── .yarnrc.yml (Berry) or .yarnrc (Classic)
├── package.json
├── yarn.lock
├── packages/
│   ├── shared/
│   │   └── package.json
│   ├── ui/
│   │   └── package.json
│   └── utils/
│       └── package.json
└── apps/
    ├── web/
    │   └── package.json
    └── api/
        └── package.json
```

### Root package.json

```json
{
  "name": "my-monorepo",
  "private": true,
  "packageManager": "yarn@4.0.2",
  "workspaces": [
    "packages/*",
    "apps/*"
  ],
  "scripts": {
    "dev": "yarn workspaces foreach -pi run dev",
    "build": "yarn workspaces foreach -t run build",
    "test": "yarn workspaces foreach run test",
    "lint": "yarn workspaces foreach run lint"
  },
  "devDependencies": {
    "typescript": "^5.3.3"
  }
}
```

### Workspace Dependencies

```json
{
  "name": "@monorepo/web",
  "dependencies": {
    "@monorepo/shared": "workspace:*",
    "@monorepo/ui": "workspace:^",
    "express": "^4.18.0"
  }
}
```

**Workspace Protocol (Berry):**
- `workspace:*` - Use workspace version
- `workspace:^` - Use compatible workspace version
- `workspace:~` - Use patch-compatible workspace version

### Workspace Commands

**Yarn Classic:**
```bash
# Run in specific workspace
yarn workspace <name> <command>
yarn workspace @monorepo/web build

# Run in all workspaces
yarn workspaces run <command>
yarn workspaces run test
```

**Yarn Berry:**
```bash
# Run in specific workspace
yarn workspace <name> <command>

# Run in all workspaces (sequential)
yarn workspaces foreach run <command>

# Run in parallel
yarn workspaces foreach -p run <command>

# Run topologically (dependencies first)
yarn workspaces foreach -t run build

# Interactive mode
yarn workspaces foreach -i run test

# Include dependencies
yarn workspaces foreach --from <workspace> run build
```

---

## Zero-Installs (Yarn Berry)

### Setup

```yaml
# .yarnrc.yml
enableGlobalCache: false
```

```bash
# Add to version control
git add .yarn/cache
git add .yarn/releases
git add .yarn/plugins
git add .yarnrc.yml
git add yarn.lock
```

### .gitignore

```
# Keep PnP files
!.yarn/cache
!.yarn/releases
!.yarn/plugins

# Ignore build output
.pnp.*
node_modules/
dist/
```

**Benefits:**
- ✅ No install step in CI/CD
- ✅ Guaranteed reproducibility
- ✅ Offline development

**Trade-offs:**
- ⚠️ Larger repository size
- ⚠️ Binary files in git

---

## Integration with Build Tools

### With Vite

```bash
yarn add -D vite
```

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  }
}
```

### With Next.js

```bash
yarn create next-app my-app
```

Or add to existing:
```bash
yarn add next react react-dom
yarn add -D @types/react @types/react-dom
```

### With Turborepo

```bash
yarn add -D turbo
```

```json
{
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    }
  }
}
```

---

## CI/CD Configuration

### GitHub Actions (Yarn Classic)

```yaml
name: CI

on: [push, pull_request]

jobs:
  build:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - uses: actions/setup-node@v3
        with:
          node-version: 20
          cache: 'yarn'
      
      - name: Install dependencies
        run: yarn install --frozen-lockfile
      
      - name: Type check
        run: yarn type-check
      
      - name: Build
        run: yarn build
      
      - name: Test
        run: yarn test
```

### GitHub Actions (Yarn Berry with PnP)

```yaml
name: CI

on: [push, pull_request]

jobs:
  build:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - uses: actions/setup-node@v3
        with:
          node-version: 20
      
      - name: Enable Corepack
        run: corepack enable
      
      - name: Install dependencies
        run: yarn install --immutable
      
      - name: Build
        run: yarn build
```

### GitHub Actions (Zero-Installs)

```yaml
- uses: actions/checkout@v3

- uses: actions/setup-node@v3
  with:
    node-version: 20

- name: Build (no install needed!)
  run: yarn build
```

---

## Troubleshooting

### PnP Compatibility Issues

**Problem:** Tool doesn't work with PnP.

**Solution:**
```yaml
# Switch to node_modules
nodeLinker: node-modules
```

Or install compatibility plugin:
```bash
yarn plugin import @yarnpkg/plugin-compat
```

### Workspace Not Found

**Problem:** Cannot find workspace package.

**Solution:**
```bash
# Verify workspaces configuration
yarn workspaces list

# Reinstall
yarn install
```

### Cache Corruption (Berry)

**Problem:** Install failures or weird behavior.

**Solution:**
```bash
# Clean cache
yarn cache clean

# Remove and reinstall
rm -rf .yarn/cache node_modules
yarn install
```

### TypeScript Module Resolution

**Problem:** TS can't find modules with PnP.

**Solution:**
```bash
# Generate SDK files
yarn dlx @yarnpkg/sdks vscode

# Update VS Code TypeScript
# Select workspace TypeScript version in VS Code
```

---

## Best Practices

1. **Commit yarn.lock**: Essential for reproducibility
2. **Use Workspaces**: For monorepos and multi-package projects
3. **Try PnP**: For new projects (massive speed boost)
4. **Version Consistency**: Use `packageManager` field
5. **Immutable Installs**: Use `--immutable` in CI
6. **Zero-Installs**: Consider for teams (Berry)
7. **Plugins**: Extend Yarn Berry with official plugins
8. **Regular Updates**: Keep Yarn and dependencies up to date
9. **IDE Setup**: Generate SDKs for PnP compatibility
10. **Documentation**: Document Yarn version and PnP choice

---

## Migration Guide

### From npm to Yarn

```bash
# Install Yarn Classic
npm install -g yarn

# Or use Yarn Berry with Corepack
corepack enable
yarn set version stable

# Import from package-lock.json (Classic)
yarn import

# Install
yarn install
```

### From Yarn Classic to Yarn Berry

```bash
# Enable Corepack
corepack enable

# Set Yarn version
yarn set version stable

# Update scripts if needed
# Most scripts work as-is

# Optional: Enable PnP
echo "nodeLinker: pnp" > .yarnrc.yml

# Install with new version
yarn install
```

---

## Advanced Features

### Constraints (Berry)

Define dependency rules:

```javascript
// .yarn/constraints.pro
gen_enforced_dependency(WorkspaceCwd, DependencyIdent, 'workspace:^', DependencyType) :-
  workspace_has_dependency(WorkspaceCwd, DependencyIdent, _, DependencyType),
  workspace_ident(_, DependencyIdent).
```

### Plugins (Berry)

```bash
# Install plugin
yarn plugin import <plugin-name>

# Official plugins
yarn plugin import typescript
yarn plugin import workspace-tools
yarn plugin import interactive-tools
```

### Resolutions

Force dependency versions:

```json
{
  "resolutions": {
    "lodash": "^4.17.21",
    "**/lodash": "^4.17.21"
  }
}
```

---

## Useful Links

- [Yarn Documentation](https://yarnpkg.com/)
- [Yarn Berry Migration Guide](https://yarnpkg.com/getting-started/migration)
- [Yarn GitHub](https://github.com/yarnpkg/berry)
- [PnP Guide](https://yarnpkg.com/features/pnp)
- [Workspaces Documentation](https://yarnpkg.com/features/workspaces)
