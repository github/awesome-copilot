# pnpm TypeScript Workflow

A comprehensive guide for managing TypeScript projects with pnpm — the fast, disk space efficient package manager with strict dependency isolation.

**Reference:** https://pnpm.io/

---

## Why pnpm?

### Key Advantages

- **60-70% Disk Space Savings**: Content-addressable store with hard links
- **2-3x Faster**: Optimized installation and caching
- **Strict Dependencies**: Prevents accessing undeclared dependencies
- **Native Monorepo Support**: Excellent workspace features
- **Drop-in Replacement**: Compatible with npm commands

### When to Use pnpm

✅ **Perfect for:**
- Monorepos and multi-package projects
- Teams with many Node.js projects
- CI/CD optimization
- Strict dependency management
- Disk space constrained environments

⚠️ **Consider alternatives if:**
- Maximum ecosystem compatibility is critical
- Team unfamiliar with pnpm
- Legacy tooling incompatibilities

---

## Installation

### Installing pnpm

```bash
# Using npm
npm install -g pnpm

# Using Corepack (Node.js 16.9+, recommended)
corepack enable
corepack prepare pnpm@latest --activate

# Using standalone script (Windows)
iwr https://get.pnpm.io/install.ps1 -useb | iex

# Using standalone script (macOS/Linux)
curl -fsSL https://get.pnpm.io/install.sh | sh -
```

### Verify Installation

```bash
pnpm --version
pnpm -v
```

---

## Initializing a TypeScript Project

### 1. Create the Project

```bash
mkdir my-ts-project && cd my-ts-project
pnpm init
```

### 2. Install TypeScript

```bash
# Install TypeScript and type definitions
pnpm add -D typescript @types/node

# Optional: ts-node for running TypeScript
pnpm add -D ts-node

# Optional: tsx (recommended, faster)
pnpm add -D tsx

# Optional: tsup for bundling
pnpm add -D tsup
```

### 3. Initialize TypeScript Configuration

```bash
pnpm exec tsc --init
```

---

## Essential package.json Configuration

```json
{
  "name": "my-ts-project",
  "version": "1.0.0",
  "type": "module",
  "packageManager": "pnpm@8.15.0",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "build:bundle": "tsup src/index.ts --format esm,cjs --dts",
    "start": "node dist/index.js",
    "test": "vitest run",
    "test:watch": "vitest",
    "type-check": "tsc --noEmit",
    "lint": "eslint src --ext .ts",
    "format": "prettier --write src/**/*.ts",
    "clean": "rimraf dist node_modules"
  },
  "devDependencies": {
    "@types/node": "^20.11.0",
    "tsx": "^4.7.0",
    "typescript": "^5.3.3"
  }
}
```

---

## pnpm Commands Cheat Sheet

### Installation

```bash
# Install all dependencies
pnpm install
pnpm i

# Install from fresh (like npm ci)
pnpm install --frozen-lockfile

# Install without optional deps
pnpm install --no-optional

# Force reinstall
pnpm install --force
```

### Adding Dependencies

```bash
# Add production dependency
pnpm add <package>
pnpm add express zod

# Add dev dependency
pnpm add -D <package>
pnpm add --save-dev typescript

# Add peer dependency
pnpm add -P <package>
pnpm add --save-peer react

# Add optional dependency
pnpm add -O <package>
pnpm add --save-optional fsevents

# Add exact version
pnpm add -E <package>
pnpm add --save-exact react@18.2.0

# Add to specific workspace
pnpm add <package> --filter <workspace>
```

### Removing Dependencies

```bash
# Remove package
pnpm remove <package>
pnpm rm express

# Remove from all workspaces
pnpm -r remove <package>
```

### Updating Dependencies

```bash
# Update all to latest within ranges
pnpm update
pnpm up

# Update specific package
pnpm update <package>

# Update to latest (ignore ranges)
pnpm update --latest
pnpm up -L

# Interactive update
pnpm update --interactive
pnpm up -i

# Update all workspaces
pnpm -r update
```

### Running Scripts

```bash
# Run package script
pnpm <script-name>
pnpm dev
pnpm test

# Explicit run command
pnpm run <script-name>

# Run in all workspaces
pnpm -r <script-name>
pnpm --recursive test

# Run in specific workspace
pnpm --filter <workspace> <script>
```

### Listing and Inspecting

```bash
# List installed packages
pnpm list
pnpm ls

# List in all workspaces
pnpm -r list

# Show package details
pnpm view <package>

# Why is package installed?
pnpm why <package>

# Show outdated packages
pnpm outdated
```

### Global Packages

```bash
# Install global package
pnpm add -g <package>
pnpm add --global typescript

# List global packages
pnpm list -g

# Remove global package
pnpm remove -g <package>

# Update global packages
pnpm update -g
```

### Store Management

```bash
# Show store path
pnpm store path

# Check store status
pnpm store status

# Prune unreferenced packages from store
pnpm store prune

# Verify store integrity
pnpm store verify
```

---

## pnpm Configuration

### .npmrc Configuration

Create `.npmrc` in project root:

```ini
# Use specific pnpm version
use-node-version=20.11.0

# Strict peer dependencies
strict-peer-dependencies=true

# Shamefully flatten for compatibility
shamefully-hoist=false

# Auto install peers
auto-install-peers=true

# Shared workspace lockfile
shared-workspace-lockfile=true

# Save exact versions
save-exact=true

# Custom registry
registry=https://registry.npmjs.org/

# Scope-specific registry
@mycompany:registry=https://npm.company.com/
```

### pnpm-workspace.yaml (Monorepos)

```yaml
packages:
  - 'packages/*'
  - 'apps/*'
  - '!**/test/**'
```

---

## Monorepo Workflow

### Structure

```
my-monorepo/
├── pnpm-workspace.yaml
├── package.json
├── pnpm-lock.yaml
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
  "packageManager": "pnpm@8.15.0",
  "scripts": {
    "dev": "pnpm -r --parallel dev",
    "build": "pnpm -r build",
    "test": "pnpm -r test",
    "lint": "pnpm -r lint",
    "clean": "pnpm -r clean"
  },
  "devDependencies": {
    "typescript": "^5.3.3",
    "turbo": "^1.12.0"
  }
}
```

### Workspace Dependencies

```json
{
  "name": "@monorepo/web",
  "dependencies": {
    "@monorepo/shared": "workspace:*",
    "@monorepo/ui": "workspace:^1.0.0",
    "express": "^4.18.0"
  }
}
```

**Workspace Protocol:**
- `workspace:*` - Any version in workspace
- `workspace:^` - Compatible version
- `workspace:~` - Patch-level compatible

### Workspace Commands

```bash
# Run command in all workspaces
pnpm -r <command>
pnpm --recursive build

# Run in parallel
pnpm -r --parallel dev

# Filter by name
pnpm --filter <workspace> <command>
pnpm --filter @monorepo/web build

# Filter by pattern
pnpm --filter "./packages/*" build

# Filter changed since git ref
pnpm --filter "...[origin/main]" test

# Run in workspace and dependents
pnpm --filter ...@monorepo/shared build

# Run in workspace and dependencies
pnpm --filter @monorepo/web... build
```

---

## Integration with Build Tools

### With Vite

```bash
pnpm add -D vite
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
pnpm create next-app my-app
```

Or add to existing:
```bash
pnpm add next react react-dom
pnpm add -D @types/react @types/react-dom
```

### With Turborepo

```bash
pnpm add -D -w turbo
```

```json
{
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**"]
    },
    "dev": {
      "cache": false
    }
  }
}
```

---

## CI/CD Configuration

### GitHub Actions

```yaml
name: CI

on: [push, pull_request]

jobs:
  build:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      
      - uses: actions/setup-node@v3
        with:
          node-version: 20
          cache: 'pnpm'
      
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
      
      - name: Type check
        run: pnpm type-check
      
      - name: Lint
        run: pnpm lint
      
      - name: Test
        run: pnpm test
      
      - name: Build
        run: pnpm build
```

### Cache Configuration

```yaml
- name: Get pnpm store directory
  id: pnpm-cache
  shell: bash
  run: |
    echo "STORE_PATH=$(pnpm store path)" >> $GITHUB_OUTPUT

- uses: actions/cache@v3
  with:
    path: ${{ steps.pnpm-cache.outputs.STORE_PATH }}
    key: ${{ runner.os }}-pnpm-store-${{ hashFiles('**/pnpm-lock.yaml') }}
    restore-keys: |
      ${{ runner.os }}-pnpm-store-
```

---

## Troubleshooting

### Phantom Dependencies

**Problem:** Code works locally but breaks in production.

**Cause:** Accessing packages not declared in dependencies.

**Solution:**
```bash
# pnpm strictly enforces dependencies
# Add missing dependencies explicitly
pnpm add <missing-package>
```

### Peer Dependency Warnings

**Problem:** Peer dependency warnings during install.

**Solution:**
```bash
# Auto-install peers (in .npmrc)
auto-install-peers=true

# Or install manually
pnpm add <peer-dependency> --save-peer
```

### Workspace Dependency Issues

**Problem:** Workspace package not found.

**Solution:**
```bash
# Ensure pnpm-workspace.yaml includes the packages
# Reinstall from fresh
pnpm install

# Check workspace list
pnpm ls -r
```

### Store Corruption

**Problem:** Installation failures or inconsistent behavior.

**Solution:**
```bash
# Prune and verify store
pnpm store prune
pnpm store verify

# Force reinstall
rm -rf node_modules pnpm-lock.yaml
pnpm install --force
```

### Hoisting Issues

**Problem:** Some tools need flat node_modules.

**Solution:**
```ini
# In .npmrc
shamefully-hoist=true
public-hoist-pattern[]=*eslint*
public-hoist-pattern[]=*prettier*
```

---

## Best Practices

1. **Commit pnpm-lock.yaml**: Ensures reproducible installs
2. **Use .npmrc**: Configure pnpm behavior per project
3. **Leverage Store**: Don't delete global store unnecessarily
4. **Workspace Protocol**: Use `workspace:*` for monorepo deps
5. **Frozen Lockfile in CI**: Use `--frozen-lockfile` for determinism
6. **Filter Wisely**: Use `--filter` to speed up monorepo tasks
7. **Auto-install Peers**: Set `auto-install-peers=true` for convenience
8. **Regular Updates**: Keep pnpm and dependencies up to date
9. **Store Prune**: Periodically prune unused packages
10. **Document packageManager**: Specify in package.json for Corepack

---

## Migration from npm/yarn

### Quick Migration

```bash
# Install pnpm
npm install -g pnpm

# Import from package-lock.json or yarn.lock
pnpm import

# Install dependencies
pnpm install

# Update scripts (if needed)
# Most npm/yarn scripts work as-is
```

### Differences to Watch

| npm/yarn | pnpm | Notes |
|----------|------|-------|
| `npm run script` | `pnpm script` | Shorter syntax |
| No isolation | Strict isolation | May reveal phantom deps |
| Flat modules | Nested modules | More correct but strict |
| `npm ci` | `pnpm install --frozen-lockfile` | Longer command |

---

## Advanced Features

### Patches

Patch packages directly:

```bash
# Create patch
pnpm patch <package>@<version>

# Edit files, then save patch
pnpm patch-commit <temp-dir>
```

### Catalog (pnpm 8+)

Centralize dependency versions:

```yaml
# pnpm-workspace.yaml
catalog:
  react: ^18.2.0
  typescript: ^5.3.3
```

```json
{
  "dependencies": {
    "react": "catalog:"
  }
}
```

### Overrides

Force specific versions:

```json
{
  "pnpm": {
    "overrides": {
      "lodash": "^4.17.21"
    }
  }
}
```

---

## Useful Links

- [pnpm Documentation](https://pnpm.io/)
- [pnpm CLI Commands](https://pnpm.io/cli/add)
- [Workspaces Guide](https://pnpm.io/workspaces)
- [pnpm GitHub](https://github.com/pnpm/pnpm)
- [Benchmarks](https://pnpm.io/benchmarks)
