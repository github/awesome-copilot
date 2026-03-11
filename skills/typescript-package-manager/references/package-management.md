# Package Management

A comprehensive guide to understanding package managers in the JavaScript/TypeScript ecosystem and beyond.

## Overview

Package managers are essential tools for modern software development, handling dependency installation, version management, and project configuration. This reference covers the landscape of package management with focus on TypeScript/JavaScript tools.

## JavaScript/TypeScript Package Managers

### npm (Node Package Manager)

[npm](https://en.wikipedia.org/wiki/Npm) is the default package manager for Node.js, serving as the largest software registry in the world.

**Key Features:**
- Default Node.js package manager
- Massive public registry (npmjs.com)
- Semantic versioning support
- Scripts and lifecycle hooks
- Workspaces support (v7+)

**Best For:**
- Standard Node.js projects
- Wide compatibility requirements
- Projects requiring maximum ecosystem support

### yarn

Yarn was created by Facebook to address npm's early performance and consistency issues.

**Key Features:**
- Fast parallel installation
- Offline mode support
- Deterministic dependency resolution
- Plug'n'Play mode (v2+)
- Workspaces (monorepo support)

**Best For:**
- Large-scale applications
- Teams requiring reproducible builds
- Monorepo projects

### pnpm

[pnpm](https://pnpm.io/) uses a content-addressable filesystem to save disk space and boost installation speed.

**Key Features:**
- Disk space efficient (hard links)
- Strict dependency isolation
- Fast installation
- Built-in monorepo support
- Drop-in npm replacement

**Best For:**
- Teams with many projects
- CI/CD optimization
- Strict dependency management
- Monorepos

### bun

[bun](https://github.com/oven-sh/bun) is an all-in-one JavaScript runtime, package manager, bundler, and test runner.

**Key Features:**
- Blazing fast (written in Zig)
- Compatible with npm packages
- Built-in bundler and test runner
- Native TypeScript support
- Drop-in Node.js replacement

**Best For:**
- New projects prioritizing speed
- Full-stack TypeScript applications
- Projects wanting unified tooling

### deno

[deno](https://github.com/denoland/deno) is a secure runtime that uses URLs for modules instead of a centralized registry.

**Key Features:**
- Secure by default (permissions required)
- Native TypeScript support
- No package.json or node_modules
- URL-based imports
- Built-in tooling (formatter, linter, test runner)

**Best For:**
- Security-critical applications
- Projects avoiding centralized registries
- Modern TypeScript-first development

## Package Management Concepts

### Semantic Versioning

Package versioning follows the [Semantic Versioning](https://semver.org/) specification:

**Format:** MAJOR.MINOR.PATCH

- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes

**Version Constraints:**
- `^1.2.3` - Compatible with 1.2.3 (allows MINOR and PATCH updates)
- `~1.2.3` - Approximately 1.2.3 (allows PATCH updates only)
- `1.2.3` - Exact version
- `>=1.2.3 <2.0.0` - Range specification

### Dependency Types

**dependencies**: Required for production runtime
```json
"dependencies": {
  "express": "^4.18.0"
}
```

**devDependencies**: Only needed for development
```json
"devDependencies": {
  "typescript": "^5.0.0",
  "@types/node": "^20.0.0"
}
```

**peerDependencies**: Required from consuming project
```json
"peerDependencies": {
  "react": "^18.0.0"
}
```

**optionalDependencies**: Optional enhancements
```json
"optionalDependencies": {
  "fsevents": "^2.3.0"
}
```

### Lock Files

Lock files ensure reproducible installations across environments:

- **package-lock.json** (npm) - Exact dependency tree
- **yarn.lock** (yarn) - Deterministic resolution
- **pnpm-lock.yaml** (pnpm) - Content-addressable storage
- **bun.lockb** (bun) - Binary lock file

**Best Practices:**
- Always commit lock files to version control
- Keep lock files in sync with package.json
- Regenerate if corrupted
- Resolve conflicts carefully during merges

### Workspaces and Monorepos

Workspaces allow managing multiple packages in a single repository:

**npm/yarn/pnpm workspaces structure:**
```json
{
  "workspaces": [
    "packages/*"
  ]
}
```

**Benefits:**
- Shared dependencies
- Cross-package development
- Unified versioning
- Simplified dependency management

**Tools for Monorepos:**
- Lerna - Multi-package repository management
- Nx - Smart monorepo tools
- Turborepo - High-performance build system

## Version Management Tools

### Node Version Managers

Tools for managing multiple Node.js versions:

- **[n](https://github.com/tj/n)** - Simple Node.js version management
- **[fnm](https://github.com/Schniz/fnm)** - Fast Node Manager (Rust-based)
- **[volta](https://github.com/volta-cli/volta)** - Hassle-free JavaScript tooling

**Why Use Version Managers:**
- Switch between Node.js versions per project
- Ensure team consistency
- Test across multiple Node.js versions
- Isolate global packages

## Registry Management

### Public Registries

- **npmjs.com** - Default npm registry
- **GitHub Packages** - Package hosting on GitHub
- **jsDelivr** - CDN for npm packages

### Private Registries

- **npm Enterprise** - Self-hosted npm registry
- **Verdaccio** - Lightweight private registry
- **JFrog Artifactory** - Enterprise artifact management
- **Azure Artifacts** - Microsoft's package hosting

**Configuration:**
```bash
# Set registry
npm config set registry https://registry.company.com

# Scope-specific registry
npm config set @mycompany:registry https://npm.company.com
```

## Security and Auditing

### Vulnerability Scanning

```bash
# npm
npm audit
npm audit fix

# yarn
yarn audit

# pnpm
pnpm audit

# bun
bun audit
```

### Security Best Practices

1. **Regular Audits**: Run security checks regularly
2. **Update Dependencies**: Keep packages up-to-date
3. **Review Lock Files**: Check for unexpected changes
4. **Use .npmrc**: Configure secure defaults
5. **Enable 2FA**: Protect publishing accounts
6. **Verify Packages**: Check package integrity

## Performance Optimization

### Installation Speed

**Comparison:**
- bun: Fastest (native implementation)
- pnpm: Very fast (content-addressable)
- yarn: Fast (parallel downloads)
- npm: Baseline (improved in v7+)

### Disk Space

**pnpm Advantage:**
- Single global store
- Hard links to packages
- Saves 50-70% disk space

### CI/CD Optimization

```yaml
# Cache dependencies
- uses: actions/cache@v3
  with:
    path: ~/.npm
    key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}
```

**Strategies:**
- Use lock file caching
- Leverage frozen lockfiles
- Parallelize tests
- Use workspace features

## Related Package Managers

### System Package Managers

- **[apt](https://en.wikipedia.org/wiki/APT_(software))** - Debian/Ubuntu package manager
- **[dnf](https://en.wikipedia.org/wiki/DNF_(software))** - Fedora package manager
- **[Zypp](https://en.wikipedia.org/wiki/Zypp)** - openSUSE package manager
- **[Homebrew](https://en.wikipedia.org/wiki/Homebrew_(package_manager))** - macOS package manager

### Language-Specific

- **[pip](https://en.wikipedia.org/wiki/Pip_(package_manager))** - Python package installer
- **[Cargo](https://en.wikipedia.org/wiki/Rust_(programming_language)#Cargo)** - Rust package manager
- **[Maven](https://en.wikipedia.org/wiki/Apache_Maven)** - Java project management
- **[Conda](https://en.wikipedia.org/wiki/Conda_(package_manager))** - Cross-language package manager

### Modern Alternatives

- **[uv](https://github.com/astral-sh/uv)** - Ultra-fast Python package installer
- **[poetry](https://github.com/python-poetry/poetry)** - Python dependency management
- **[PDM](https://pdm-project.org/en/latest/)** - Modern Python package manager
- **[pip-tools](https://pypi.org/project/pip-tools/)** - Python requirements management

## Container and Universal Packaging

- **[OCI containers](https://en.wikipedia.org/wiki/Open_Container_Initiative)** - Standard container format
- **[Flatpak](https://en.wikipedia.org/wiki/Flatpak)** - Universal Linux applications
- **[Snap](https://en.wikipedia.org/wiki/Snap_(software))** - Ubuntu universal packages
- **[AppImage](https://en.wikipedia.org/wiki/AppImage)** - Portable Linux apps

## Further Reading

- [Package Managers and Package Management: A Guide for the Perplexed](https://flox.dev/blog/package-managers-and-package-management-a-guide-for-the-perplexed/)
- [Nixpkgs](https://github.com/NixOS/nixpkgs) - Nix package collection
- [Flox Catalog](https://hub.flox.dev/packages) - Declarative development environments
- [Docker Best Practices](https://docs.docker.com/build/building/best-practices/) - Container package pinning
