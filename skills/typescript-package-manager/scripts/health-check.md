# TypeScript Project Health Check

A comprehensive diagnostic and improvement guide for TypeScript projects. Use this to audit type safety, detect dead code, analyze performance, and ensure your project follows best practices.

**References:**
- https://www.typescriptlang.org/tsconfig/
- https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html

---

## Overview

Run a full health check to identify and fix issues across these dimensions:

| Check | Tool | What It Finds |
|-------|------|---------------|
| Type Coverage | `type-coverage` | Percentage of typed expressions |
| Strict Mode | `tsc` flags | Unsafe type checking gaps |
| Missing Types | `npm ls` + `@types` | Untyped dependencies |
| Dead Code | `knip` or `ts-prune` | Unused exports/files |
| Circular Deps | `madge` | Import cycles |
| Bundle Size | `size-limit` | Regression in output size |
| Type Performance | `tsc --extendedDiagnostics` | Slow compilation hotspots |
| Declaration Files | `@arethetypeswrong/cli` | Broken `.d.ts` exports |

---

## 1. Type Coverage Check

Measure what percentage of your TypeScript code is actually typed (not `any`).

### Using `type-coverage`

```bash
# Install
npm install --save-dev type-coverage

# Run
npx type-coverage

# Strict: fail if coverage drops below 90%
npx type-coverage --at-least 90

# Show all uncovered lines
npx type-coverage --detail

# Ignore catch blocks and well-known any patterns
npx type-coverage --ignore-catch --ignore-files "src/**/*.test.ts"
```

### Using `typescript-coverage-report`

```bash
# Install
npm install --save-dev typescript-coverage-report

# Generate HTML report
npx typescript-coverage-report

# Open coverage/index.html in your browser
```

### Interpreting Results

| Coverage | Status |
|----------|--------|
| 95-100% | Excellent |
| 85-94% | Good |
| 70-84% | Needs improvement |
| Below 70% | High risk — prioritize fixing |

### Add to `package.json`

```json
{
  "scripts": {
    "health:coverage": "type-coverage --at-least 90 --detail"
  }
}
```

---

## 2. Strict Mode Audit

Enable TypeScript strict flags progressively to improve type safety without breaking everything at once.

### Checklist: Strict Flags

Enable these in order (each one is harder to fix than the last):

```json
{
  "compilerOptions": {
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "alwaysStrict": true,
    "strict": true,

    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "noPropertyAccessFromIndexSignature": true,
    "exactOptionalPropertyTypes": true,

    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noImplicitReturns": true
  }
}
```

### Step-by-Step Migration to `strict: true`

```bash
# Step 1: Count current errors with noImplicitAny
npx tsc --noImplicitAny --noEmit 2>&1 | grep "error TS" | wc -l

# Step 2: Count errors with strictNullChecks
npx tsc --strictNullChecks --noEmit 2>&1 | grep "error TS" | wc -l

# Step 3: Count all strict errors
npx tsc --strict --noEmit 2>&1 | grep "error TS" | wc -l
```

### Finding Remaining `any` Types

```bash
# Count explicit 'any' in source
grep -r ": any" src/ --include="*.ts" | wc -l

# Find ts-ignore suppression comments
grep -r "@ts-ignore\|@ts-nocheck" src/ --include="*.ts"

# Find explicit any casts
grep -r "as any" src/ --include="*.ts"
```

### Add to `package.json`

```json
{
  "scripts": {
    "health:strict": "tsc --strict --noEmit"
  }
}
```

---

## 3. Dependency Type Audit

Find dependencies that lack TypeScript type definitions.

### Check for Missing `@types` Packages

```bash
# List all dependencies and check for types
npx are-the-types-wrong
```

### Manual Check Script

```bash
# List production dependencies without @types counterpart
node -e "
const pkg = require('./package.json');
const deps = Object.keys(pkg.dependencies || {});
const devDeps = Object.keys(pkg.devDependencies || {});
const typePkgs = devDeps.filter(d => d.startsWith('@types/'));

deps.forEach(dep => {
  const typePkg = '@types/' + dep.replace('@', '').replace('/', '__');
  if (!typePkgs.includes(typePkg)) {
    // Check if package bundles its own types
    try {
      const depPkg = require('./node_modules/' + dep + '/package.json');
      if (!depPkg.types && !depPkg.typings) {
        console.log('Missing types:', dep, '-> try:', typePkg);
      }
    } catch (e) {
      console.log('Cannot check:', dep);
    }
  }
});
"
```

### Bulk Install Missing Types

```bash
# Install types for common packages if needed
npm install --save-dev \
  @types/node \
  @types/express \
  @types/lodash \
  @types/jest \
  @types/react \
  @types/react-dom
```

### Add to `package.json`

```json
{
  "scripts": {
    "health:types": "npx are-the-types-wrong"
  }
}
```

---

## 4. Dead Code Detection

Find unused exports, files, and dependencies that bloat your project.

### Using `knip` (Recommended)

```bash
# Install
npm install --save-dev knip

# Run
npx knip

# Only report unused exports
npx knip --include exports

# Fix automatically (removes unused exports)
npx knip --fix
```

### `knip.json` Configuration

```json
{
  "entry": ["src/index.ts"],
  "project": ["src/**/*.ts"],
  "ignoreDependencies": ["some-peer-dep"],
  "ignoreExportsUsedInFile": true,
  "rules": {
    "files": "warn",
    "exports": "warn",
    "types": "warn",
    "dependencies": "warn"
  }
}
```

### Using `ts-prune` (Alternative)

```bash
# Install
npm install --save-dev ts-prune

# Find unused exports
npx ts-prune

# Ignore test files
npx ts-prune --ignore ".*test.*|.*spec.*"
```

### Using ESLint Rules for Unused Code

```json
{
  "compilerOptions": {
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}
```

### Add to `package.json`

```json
{
  "scripts": {
    "health:dead-code": "knip"
  }
}
```

---

## 5. Circular Dependency Check

Circular imports cause runtime issues, make code harder to test, and slow down compilation.

### Using `madge`

```bash
# Install
npm install --save-dev madge

# Check for circular dependencies
npx madge --circular src/

# TypeScript files
npx madge --circular --ts-config tsconfig.json src/

# Generate a dependency graph image (requires graphviz)
npx madge --image graph.svg src/

# Show all dependencies
npx madge src/index.ts
```

### Interpreting Circular Dependency Output

```
Circular dependency found!
src/auth/user.service.ts -> src/auth/auth.service.ts -> src/auth/user.service.ts
```

### Breaking Circular Dependencies

```typescript
// Pattern: Extract shared interface to a separate file

// Before (circular):
// user.service.ts imports AuthService
// auth.service.ts imports UserService

// After (no circular):
// types/auth.types.ts — shared interfaces only
export interface IAuthService {
  validateToken(token: string): Promise<boolean>;
}
export interface IUserService {
  findById(id: string): Promise<User | null>;
}

// auth.service.ts — depends on IUserService interface, not UserService class
import type { IUserService } from '../types/auth.types';

// user.service.ts — depends on IAuthService interface, not AuthService class
import type { IAuthService } from '../types/auth.types';
```

### Add to `package.json`

```json
{
  "scripts": {
    "health:circular": "madge --circular --ts-config tsconfig.json src/"
  }
}
```

---

## 6. Bundle Size Analysis

Prevent unintentional bundle size growth when publishing libraries or building apps.

### Using `size-limit`

```bash
# Install
npm install --save-dev size-limit @size-limit/preset-small-lib

# Or for apps
npm install --save-dev size-limit @size-limit/preset-app
```

### `.size-limit.json`

```json
[
  {
    "path": "dist/index.js",
    "limit": "10 kB",
    "gzip": true
  },
  {
    "path": "dist/esm/index.js",
    "limit": "10 kB",
    "gzip": true,
    "import": "{ mainExport }"
  }
]
```

### Run Size Check

```bash
# Check bundle sizes
npx size-limit

# Show detailed breakdown
npx size-limit --why
```

### `package.json` Integration

```json
{
  "scripts": {
    "health:size": "size-limit",
    "build": "tsc && npm run health:size"
  },
  "size-limit": [
    {
      "path": "dist/index.js",
      "limit": "10 kB"
    }
  ]
}
```

---

## 7. Type Performance Analysis

Identify slow TypeScript compilation and complex types that slow down editor responsiveness.

### Extended Diagnostics

```bash
# Show detailed compilation statistics
npx tsc --extendedDiagnostics --noEmit 2>&1 | head -50
```

Key metrics to watch:

```
Files:            Total files included in compilation
Lines:            Total lines of code
Instantiations:   Number of type instantiations (high = complex types)
Memory used:      Peak memory usage
Parse time:       Time to parse files
Bind time:        Time to bind symbols
Check time:       Time to type-check
Total time:       Overall compilation time
```

### Generate a Performance Trace

```bash
# Generate trace for analysis
npx tsc --generateTrace ./trace-output --noEmit

# Analyze trace in Chrome DevTools:
# 1. Open chrome://tracing
# 2. Load ./trace-output/trace.json
```

### Identify Problematic Files

```bash
# Show per-file check times
npx tsc --diagnostics --noEmit 2>&1 | grep -E "Check time|\.ts"
```

### Common Performance Issues

| Issue | Symptom | Fix |
|-------|---------|-----|
| Deep generic recursion | High instantiation count | Add type parameter bounds |
| Complex conditional types | Slow editor | Simplify or cache with `type` alias |
| Large union types | High check time | Use discriminated unions |
| `skipLibCheck: false` | Slow compilation | Enable `skipLibCheck: true` |
| No `incremental` | Full rebuild every time | Enable `incremental: true` |

### Incremental Compilation

```json
{
  "compilerOptions": {
    "incremental": true,
    "tsBuildInfoFile": ".tsbuildinfo"
  }
}
```

```bash
# Add to .gitignore
echo ".tsbuildinfo" >> .gitignore
```

### Add to `package.json`

```json
{
  "scripts": {
    "health:perf": "tsc --extendedDiagnostics --noEmit",
    "health:trace": "tsc --generateTrace ./trace-output --noEmit && echo 'Load trace-output/trace.json in chrome://tracing'"
  }
}
```

---

## 8. Declaration File Validation

Ensure your published `.d.ts` files work correctly for all consumers (ESM, CJS, bundlers).

### Using `@arethetypeswrong/cli`

```bash
# Install
npm install --save-dev @arethetypeswrong/cli

# Check your built package
npx attw --pack .

# Check a published package
npx attw some-npm-package

# Check from tarball
npm pack
npx attw my-package-1.0.0.tgz
```

### Common Issues Detected

| Problem | Description | Fix |
|---------|-------------|-----|
| `missing-exports` | Export in `package.json` has no types | Add matching `.d.ts` file |
| `false-cjs` | Package claims CJS but types say ESM | Fix `exports` condition |
| `cjs-resolves-to-esm` | CJS import resolves to ESM types | Provide separate CJS types |
| `no-resolution` | Cannot resolve the package | Check `main`/`module` fields |

### Validate Declaration Files Manually

```bash
# Check that all public exports have types
npx tsc --declaration --emitDeclarationOnly --outDir ./dist-check

# Check for missing re-exports
node -e "
const fs = require('fs');
const dts = fs.readFileSync('./dist/index.d.ts', 'utf-8');
console.log('Exports found:', (dts.match(/^export /mg) || []).length);
"
```

### Add to `package.json`

```json
{
  "scripts": {
    "health:declarations": "attw --pack .",
    "prepublishOnly": "npm run health:declarations && npm run build"
  }
}
```

---

## The `health-check.sh` Shell Script

A single script that runs all health checks in sequence and produces a report.

```bash
#!/usr/bin/env bash
# health-check.sh — TypeScript Project Health Check
# Usage: bash health-check.sh [--fix] [--ci]

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Options
FIX=false
CI=false
FAILED=0
WARNINGS=0

for arg in "$@"; do
  case $arg in
    --fix) FIX=true ;;
    --ci) CI=true ;;
  esac
done

# Helper functions
pass()    { echo -e "${GREEN}  PASS${NC} $1"; }
fail()    { echo -e "${RED}  FAIL${NC} $1"; ((FAILED++)) || true; }
warn()    { echo -e "${YELLOW}  WARN${NC} $1"; ((WARNINGS++)) || true; }
section() { echo -e "\n${BOLD}${BLUE}=== $1 ===${NC}"; }

echo -e "${BOLD}TypeScript Project Health Check${NC}"
echo "Project: $(node -p "require('./package.json').name" 2>/dev/null || echo 'unknown')"
echo "Date: $(date '+%Y-%m-%d %H:%M:%S')"
echo "---"

# ─────────────────────────────────────────────────────────────────────────────
section "1. TypeScript Compilation"
# ─────────────────────────────────────────────────────────────────────────────

if npx tsc --noEmit --pretty false 2>&1 | tail -5; then
  pass "No TypeScript errors"
else
  fail "TypeScript compilation errors found"
fi

# ─────────────────────────────────────────────────────────────────────────────
section "2. Type Coverage"
# ─────────────────────────────────────────────────────────────────────────────

if command -v npx type-coverage &>/dev/null || npx --yes type-coverage --version &>/dev/null; then
  COVERAGE_OUTPUT=$(npx type-coverage --at-least 80 2>&1 || true)
  if echo "$COVERAGE_OUTPUT" | grep -q "type-coverage:"; then
    PERCENT=$(echo "$COVERAGE_OUTPUT" | grep -oP '\d+\.\d+(?=%)' | head -1)
    if (( $(echo "$PERCENT >= 90" | bc -l) )); then
      pass "Type coverage: ${PERCENT}%"
    elif (( $(echo "$PERCENT >= 80" | bc -l) )); then
      warn "Type coverage: ${PERCENT}% (target: 90%+)"
    else
      fail "Type coverage: ${PERCENT}% (below 80% threshold)"
    fi
  else
    warn "Could not parse type coverage output"
  fi
else
  warn "type-coverage not installed — run: npm install --save-dev type-coverage"
fi

# ─────────────────────────────────────────────────────────────────────────────
section "3. Strict Mode Audit"
# ─────────────────────────────────────────────────────────────────────────────

TSCONFIG=$(cat tsconfig.json 2>/dev/null || echo '{}')

check_flag() {
  local flag="$1"
  if echo "$TSCONFIG" | grep -q "\"$flag\": true" || echo "$TSCONFIG" | grep -q "\"strict\": true"; then
    pass "$flag is enabled"
  else
    warn "$flag is NOT enabled"
  fi
}

check_flag "strict"
check_flag "noUncheckedIndexedAccess"
check_flag "noImplicitOverride"
check_flag "exactOptionalPropertyTypes"

# Count explicit 'any' usages
ANY_COUNT=$(grep -r ": any\|as any\| any " src/ --include="*.ts" 2>/dev/null | wc -l || echo "0")
if [ "$ANY_COUNT" -eq 0 ]; then
  pass "No explicit 'any' types found"
elif [ "$ANY_COUNT" -lt 10 ]; then
  warn "Found ${ANY_COUNT} explicit 'any' usage(s) — consider replacing"
else
  fail "Found ${ANY_COUNT} explicit 'any' usages — significant type safety gap"
fi

# Count ts-ignore
IGNORE_COUNT=$(grep -r "@ts-ignore\|@ts-nocheck" src/ --include="*.ts" 2>/dev/null | wc -l || echo "0")
if [ "$IGNORE_COUNT" -eq 0 ]; then
  pass "No @ts-ignore or @ts-nocheck comments"
else
  warn "Found ${IGNORE_COUNT} @ts-ignore/@ts-nocheck comment(s)"
fi

# ─────────────────────────────────────────────────────────────────────────────
section "4. Dead Code Detection"
# ─────────────────────────────────────────────────────────────────────────────

if npx --yes knip --version &>/dev/null 2>&1; then
  if $FIX; then
    npx knip --fix 2>&1 || warn "knip --fix completed with warnings"
    pass "Dead code fix attempted"
  else
    KNIP_OUTPUT=$(npx knip 2>&1 || true)
    if echo "$KNIP_OUTPUT" | grep -q "No issues found"; then
      pass "No dead code detected"
    else
      warn "Potential dead code found — run 'npx knip' for details"
    fi
  fi
else
  warn "knip not installed — run: npm install --save-dev knip"
fi

# ─────────────────────────────────────────────────────────────────────────────
section "5. Circular Dependencies"
# ─────────────────────────────────────────────────────────────────────────────

if npx --yes madge --version &>/dev/null 2>&1; then
  CIRCULAR=$(npx madge --circular --ts-config tsconfig.json src/ 2>&1 || true)
  if echo "$CIRCULAR" | grep -q "No circular"; then
    pass "No circular dependencies found"
  elif echo "$CIRCULAR" | grep -q "Circular dependency found"; then
    CYCLE_COUNT=$(echo "$CIRCULAR" | grep -c "Circular" || echo "1")
    fail "Found ${CYCLE_COUNT} circular dependency cycle(s)"
    echo "$CIRCULAR" | grep -A 2 "Circular" | head -20
  else
    warn "Could not parse madge output"
  fi
else
  warn "madge not installed — run: npm install --save-dev madge"
fi

# ─────────────────────────────────────────────────────────────────────────────
section "6. Dependencies"
# ─────────────────────────────────────────────────────────────────────────────

# Check for security vulnerabilities
echo "Running npm audit..."
AUDIT_OUTPUT=$(npm audit --json 2>/dev/null || echo '{"metadata":{"vulnerabilities":{}}}')
CRITICAL=$(echo "$AUDIT_OUTPUT" | node -pe "JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')).metadata.vulnerabilities.critical || 0" 2>/dev/null || echo "?")
HIGH=$(echo "$AUDIT_OUTPUT" | node -pe "JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')).metadata.vulnerabilities.high || 0" 2>/dev/null || echo "?")

if [ "$CRITICAL" = "0" ] && [ "$HIGH" = "0" ]; then
  pass "No critical/high vulnerabilities"
else
  fail "Found ${CRITICAL} critical, ${HIGH} high severity vulnerabilities — run 'npm audit fix'"
fi

# Check for outdated packages
OUTDATED=$(npm outdated --json 2>/dev/null || echo '{}')
OUTDATED_COUNT=$(echo "$OUTDATED" | node -pe "Object.keys(JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'))).length" 2>/dev/null || echo "0")
if [ "$OUTDATED_COUNT" = "0" ]; then
  pass "All packages are up to date"
else
  warn "${OUTDATED_COUNT} package(s) are outdated — run 'npm outdated' for details"
fi

# ─────────────────────────────────────────────────────────────────────────────
section "7. Build & Performance"
# ─────────────────────────────────────────────────────────────────────────────

echo "Measuring compilation time..."
START_TIME=$(date +%s%N)
npx tsc --noEmit 2>/dev/null
END_TIME=$(date +%s%N)
COMPILE_TIME=$(( (END_TIME - START_TIME) / 1000000 ))

if [ "$COMPILE_TIME" -lt 5000 ]; then
  pass "Compilation time: ${COMPILE_TIME}ms (fast)"
elif [ "$COMPILE_TIME" -lt 15000 ]; then
  warn "Compilation time: ${COMPILE_TIME}ms (consider enabling incremental)"
else
  fail "Compilation time: ${COMPILE_TIME}ms (slow — run 'tsc --extendedDiagnostics' to profile)"
fi

# Check for incremental compilation
if echo "$TSCONFIG" | grep -q "\"incremental\": true"; then
  pass "Incremental compilation is enabled"
else
  warn "incremental compilation not enabled — add '\"incremental\": true' to tsconfig.json"
fi

# ─────────────────────────────────────────────────────────────────────────────
section "8. Declaration File Validation"
# ─────────────────────────────────────────────────────────────────────────────

# Only check if we have a dist/ directory (published package)
if [ -d "dist" ]; then
  if npx --yes @arethetypeswrong/cli --version &>/dev/null 2>&1; then
    echo "Validating declaration files..."
    if npx attw --pack . 2>&1 | grep -q "No problems found"; then
      pass "Declaration files are valid"
    else
      warn "Declaration file issues found — run 'npx attw --pack .' for details"
    fi
  else
    warn "@arethetypeswrong/cli not installed — run: npm install --save-dev @arethetypeswrong/cli"
  fi
else
  warn "No dist/ directory found — build first to validate declaration files"
fi

# ─────────────────────────────────────────────────────────────────────────────
section "Summary"
# ─────────────────────────────────────────────────────────────────────────────

echo ""
if [ "$FAILED" -eq 0 ] && [ "$WARNINGS" -eq 0 ]; then
  echo -e "${GREEN}${BOLD}All checks passed!${NC} Your TypeScript project is in excellent health."
elif [ "$FAILED" -eq 0 ]; then
  echo -e "${YELLOW}${BOLD}${WARNINGS} warning(s), 0 failures.${NC} Good health with some improvements possible."
else
  echo -e "${RED}${BOLD}${FAILED} failure(s), ${WARNINGS} warning(s).${NC} Action required."
fi

echo ""
echo "Failures: $FAILED"
echo "Warnings: $WARNINGS"

if $CI && [ "$FAILED" -gt 0 ]; then
  exit 1
fi
```

### Making the Script Executable

```bash
chmod +x health-check.sh

# Run all checks
bash health-check.sh

# Run with auto-fix where possible
bash health-check.sh --fix

# Fail the process in CI if checks fail
bash health-check.sh --ci
```

---

## Complete `package.json` Health Check Scripts Block

Add these scripts to your `package.json`:

```json
{
  "scripts": {
    "health": "bash scripts/health-check.sh",
    "health:fix": "bash scripts/health-check.sh --fix",
    "health:ci": "bash scripts/health-check.sh --ci",
    "health:coverage": "type-coverage --at-least 90 --detail",
    "health:strict": "tsc --strict --noEmit",
    "health:dead-code": "knip",
    "health:circular": "madge --circular --ts-config tsconfig.json src/",
    "health:size": "size-limit",
    "health:perf": "tsc --extendedDiagnostics --noEmit 2>&1 | head -30",
    "health:trace": "tsc --generateTrace ./trace-output --noEmit",
    "health:audit": "npm audit",
    "health:declarations": "attw --pack .",
    "health:outdated": "npm outdated"
  },
  "devDependencies": {
    "type-coverage": "^2.0.0",
    "knip": "^5.0.0",
    "madge": "^8.0.0",
    "size-limit": "^11.0.0",
    "@size-limit/preset-small-lib": "^11.0.0",
    "@arethetypeswrong/cli": "^0.15.0"
  }
}
```

---

## One-Time Setup: Install All Health Check Tools

```bash
npm install --save-dev \
  type-coverage \
  typescript-coverage-report \
  knip \
  madge \
  size-limit \
  @size-limit/preset-small-lib \
  @arethetypeswrong/cli
```

---

## CI Integration

Add the health check to your CI pipeline:

```yaml
# .github/workflows/health-check.yml
name: TypeScript Health Check

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]
  schedule:
    # Run weekly on Monday at 9am UTC
    - cron: '0 9 * * 1'

jobs:
  health-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - run: npm ci

      - name: Type check
        run: npx tsc --noEmit

      - name: Type coverage
        run: npx type-coverage --at-least 90

      - name: Dead code check
        run: npx knip

      - name: Circular dependency check
        run: npx madge --circular --ts-config tsconfig.json src/

      - name: Security audit
        run: npm audit --audit-level=high

      - name: Full health check
        run: bash scripts/health-check.sh --ci
```

---

## Quick Wins Checklist

When you first run the health check, start with these high-impact fixes:

- [ ] Enable `"strict": true` in `tsconfig.json` and fix errors
- [ ] Replace all `as any` casts with proper types or `unknown`
- [ ] Remove all `@ts-ignore` comments (fix the underlying issue instead)
- [ ] Install `@types/*` for all untyped dependencies
- [ ] Break circular dependency cycles
- [ ] Enable `"incremental": true` for faster builds
- [ ] Set `"noUnusedLocals": true` and remove dead code
- [ ] Add type coverage threshold to CI (start at 80%, raise to 90%+)

---

## Health Check Score Card

Use this to track progress over time:

| Check | Current | Target | Status |
|-------|---------|--------|--------|
| TypeScript errors | 0 | 0 | |
| Type coverage | -% | 90%+ | |
| Strict mode | off/on | on | |
| Explicit `any` count | - | 0 | |
| @ts-ignore count | - | 0 | |
| Circular dependencies | - | 0 | |
| Critical vulnerabilities | - | 0 | |
| Build time (ms) | - | <5000 | |
| Bundle size (kB) | - | limit | |
