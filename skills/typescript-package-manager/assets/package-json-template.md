# Package.json Template for TypeScript Projects

A comprehensive, production-ready `package.json` template with best practices for TypeScript projects.

## Complete Template

```json
{
  "name": "@scope/my-typescript-project",
  "version": "1.0.0",
  "description": "A production-ready TypeScript project",
  "keywords": ["typescript", "nodejs", "library"],
  "homepage": "https://github.com/username/project#readme",
  "bugs": {
    "url": "https://github.com/username/project/issues"
  },
  "repository": {
    "type": "git",
    "url": "git+https://github.com/username/project.git"
  },
  "license": "MIT",
  "author": {
    "name": "Your Name",
    "email": "you@example.com",
    "url": "https://yourwebsite.com"
  },
  "contributors": [],
  "type": "module",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "require": "./dist/index.cjs"
    },
    "./utils": {
      "types": "./dist/utils.d.ts",
      "import": "./dist/utils.js"
    },
    "./package.json": "./package.json"
  },
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "bin": {
    "my-cli": "./dist/cli.js"
  },
  "files": [
    "dist",
    "README.md",
    "LICENSE"
  ],
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "npm run build:clean && npm run build:tsc && npm run build:bundle",
    "build:clean": "rimraf dist",
    "build:tsc": "tsc",
    "build:bundle": "tsup src/index.ts --format cjs,esm --dts",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "type-check": "tsc --noEmit",
    "lint": "eslint src --ext .ts,.tsx",
    "lint:fix": "eslint src --ext .ts,.tsx --fix",
    "format": "prettier --write \"src/**/*.{ts,tsx,json,md}\"",
    "format:check": "prettier --check \"src/**/*.{ts,tsx,json,md}\"",
    "validate": "npm-run-all --parallel type-check lint test",
    "prepare": "husky install",
    "prepublishOnly": "npm run validate && npm run build",
    "release": "semantic-release",
    "clean": "rimraf dist node_modules coverage .turbo"
  },
  "dependencies": {
    "zod": "^3.22.4"
  },
  "devDependencies": {
    "@types/node": "^20.11.0",
    "@typescript-eslint/eslint-plugin": "^6.19.0",
    "@typescript-eslint/parser": "^6.19.0",
    "eslint": "^8.56.0",
    "husky": "^8.0.3",
    "lint-staged": "^15.2.0",
    "npm-run-all": "^4.1.5",
    "prettier": "^3.2.4",
    "rimraf": "^5.0.5",
    "semantic-release": "^23.0.0",
    "tsup": "^8.0.1",
    "tsx": "^4.7.0",
    "typescript": "^5.3.3",
    "vitest": "^1.2.0"
  },
  "peerDependencies": {
    "react": "^18.0.0"
  },
  "peerDependenciesMeta": {
    "react": {
      "optional": true
    }
  },
  "optionalDependencies": {
    "fsevents": "^2.3.3"
  },
  "engines": {
    "node": ">=18.0.0",
    "npm": ">=9.0.0"
  },
  "packageManager": "pnpm@8.15.0",
  "publishConfig": {
    "access": "public",
    "registry": "https://registry.npmjs.org/"
  },
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ],
    "*.{json,md}": [
      "prettier --write"
    ]
  }
}
```

## Field-by-Field Explanation

### Essential Metadata

```json
{
  "name": "@scope/my-typescript-project",
  "version": "1.0.0",
  "description": "A production-ready TypeScript project"
}
```

- **name**: Use scoped packages (@scope/name) for namespacing
- **version**: Follow semantic versioning (MAJOR.MINOR.PATCH)
- **description**: Clear, concise (under 200 chars)

### Module System

```json
{
  "type": "module"
}
```

- **module**: Default to ESM for modern projects
- Omit or use `"type": "commonjs"` for CJS only

### Export Configuration (Node.js 12+)

```json
{
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "require": "./dist/index.cjs"
    },
    "./utils": {
      "types": "./dist/utils.d.ts",
      "import": "./dist/utils.js"
    },
    "./package.json": "./package.json"
  }
}
```

**Benefits:**
- Multiple entry points
- TypeScript type definitions
- Dual CJS/ESM support
- Subpath exports

### Legacy Fields (Backward Compatibility)

```json
{
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts"
}
```

Keep these for tools that don't support exports field yet.

### CLI Binary

```json
{
  "bin": {
    "my-cli": "./dist/cli.js"
  }
}
```

Creates executable command when installed globally or in node_modules/.bin/

**Requirements:**
- Shebang in CLI file: `#!/usr/bin/env node`
- Make executable: `chmod +x dist/cli.js`

### Files to Publish

```json
{
  "files": [
    "dist",
    "README.md",
    "LICENSE"
  ]
}
```

**Whitelist approach** - only listed files are published.

**Always include:**
- Build output (dist/)
- README.md
- LICENSE
- Type definitions

**Never include:**
- Source files (src/)
- Tests
- Configuration files
- node_modules

### Development Scripts

```json
{
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "npm run build:clean && npm run build:tsc",
    "test": "vitest run",
    "lint": "eslint src --ext .ts,.tsx"
  }
}
```

**Essential scripts:**
- **dev**: Development server with watch mode
- **build**: Production build
- **test**: Run test suite
- **lint**: Code quality checks
- **format**: Code formatting
- **type-check**: TypeScript validation without emit

### CI/CD Scripts

```json
{
  "scripts": {
    "validate": "npm-run-all --parallel type-check lint test",
    "prepublishOnly": "npm run validate && npm run build"
  }
}
```

**validate**: Run all checks in parallel
**prepublishOnly**: Lifecycle hook before npm publish

### Dependency Types

```json
{
  "dependencies": {
    "zod": "^3.22.4"
  },
  "devDependencies": {
    "typescript": "^5.3.3"
  },
  "peerDependencies": {
    "react": "^18.0.0"
  },
  "optionalDependencies": {
    "fsevents": "^2.3.3"
  }
}
```

**dependencies**: Required at runtime
**devDependencies**: Build/test only
**peerDependencies**: Expected from consumer
**optionalDependencies**: Nice to have, not required

### Peer Dependencies Metadata

```json
{
  "peerDependenciesMeta": {
    "react": {
      "optional": true
    }
  }
}
```

Make peer dependencies optional to avoid warnings for optional features.

### Engine Requirements

```json
{
  "engines": {
    "node": ">=18.0.0",
    "npm": ">=9.0.0"
  }
}
```

**Best practices:**
- Use >=  for minimum versions
- Specify LTS Node.js versions
- Include pnpm/yarn if required

### Package Manager Enforcement

```json
{
  "packageManager": "pnpm@8.15.0"
}
```

**Corepack feature** (Node.js 16.9+):
- Enforces specific package manager
- Automatically downloads correct version
- Prevents version mismatches

### Publishing Configuration

```json
{
  "publishConfig": {
    "access": "public",
    "registry": "https://registry.npmjs.org/"
  }
}
```

**access**: "public" for scoped packages (default is restricted)
**registry**: Override default registry

### Git Hooks Configuration

```json
{
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ]
  }
}
```

Used with husky for pre-commit hooks.

## Workspace Configuration (Monorepos)

### Root package.json

```json
{
  "name": "my-monorepo",
  "private": true,
  "workspaces": [
    "packages/*",
    "apps/*"
  ],
  "scripts": {
    "build": "turbo run build",
    "test": "turbo run test",
    "lint": "turbo run lint"
  },
  "devDependencies": {
    "turbo": "^1.12.0",
    "typescript": "^5.3.3"
  }
}
```

### Package-specific package.json

```json
{
  "name": "@monorepo/shared",
  "version": "1.0.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "dependencies": {
    "zod": "workspace:^"
  }
}
```

**workspace:*** - Use workspace version of dependency

## Version Constraints Explained

```json
{
  "dependencies": {
    "exact": "1.2.3",
    "caret": "^1.2.3",
    "tilde": "~1.2.3",
    "range": ">=1.2.3 <2.0.0",
    "latest": "latest",
    "workspace": "workspace:*"
  }
}
```

- **1.2.3** (exact): Only 1.2.3
- **^1.2.3** (caret): >=1.2.3 <2.0.0 (recommended)
- **~1.2.3** (tilde): >=1.2.3 <1.3.0
- **>= <** (range): Custom range
- **latest**: Always use latest (dangerous)
- **workspace:*** : Use local workspace package

## Environment-Specific Templates

### Library Package

```json
{
  "name": "@scope/library",
  "type": "module",
  "exports": "./dist/index.js",
  "files": ["dist"],
  "scripts": {
    "build": "tsup src/index.ts --format esm,cjs --dts"
  }
}
```

### CLI Tool

```json
{
  "name": "my-cli",
  "bin": {
    "my-cli": "./dist/cli.js"
  },
  "preferGlobal": true,
  "scripts": {
    "build": "tsup src/cli.ts --format esm --shims"
  }
}
```

### Application (Not Published)

```json
{
  "name": "my-app",
  "private": true,
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "start": "node dist/server.js"
  }
}
```

## Best Practices

1. **Always specify types**: Include TypeScript definitions
2. **Use exports field**: For modern module resolution
3. **Lock down engines**: Prevent incompatible Node.js versions
4. **Whitelist files**: Only publish necessary files
5. **Private by default**: Add "private": true for non-published packages
6. **Semantic versioning**: Follow semver strictly
7. **Meaningful scripts**: Clear, consistent naming
8. **Document packageManager**: Help contributors use correct tool
9. **Lint-staged integration**: Automate code quality
10. **Test before publish**: Use prepublishOnly hook

## Common Patterns

### TypeScript Library

Focus on type definitions, dual CJS/ESM, and exports field.

### CLI Tool

Emphasize bin field, shebang, and preferGlobal.

### Monorepo Package

Use workspaces, workspace: protocol, and Turborepo/Nx.

### Full-stack Application

Private package, separate build scripts, environment configuration.

## Troubleshooting

### Module Resolution Issues

Ensure `type`, `exports`, `main`, and `module` fields align with your build output.

### TypeScript Not Found

Add types field pointing to .d.ts files.

### CLI Not Executable

1. Add shebang: `#!/usr/bin/env node`
2. Make executable: `chmod +x dist/cli.js`
3. Ensure bin field is correct

### Peer Dependency Warnings

Use peerDependenciesMeta to mark optional.

## Further Reading

- [Package.json Documentation](https://docs.npmjs.com/cli/v9/configuring-npm/package-json)
- [Node.js Packages](https://nodejs.org/api/packages.html)
- [TypeScript Module Resolution](https://www.typescriptlang.org/docs/handbook/module-resolution.html)
