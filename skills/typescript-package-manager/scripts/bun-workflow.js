#!/usr/bin/env node
/**
 * Bun TypeScript Workflow Helper
 *
 * Detects Bun, generates Bun-optimised configs, and guides setup.
 *
 * Usage:
 *   node bun-workflow.js --detect         # Detect Bun and show version
 *   node bun-workflow.js --tsconfig       # Print Bun-optimised tsconfig.json
 *   node bun-workflow.js --bunfig         # Print bunfig.toml template
 *   node bun-workflow.js --scripts        # Print package.json scripts for Bun
 *   node bun-workflow.js --migrate        # Show Node.js → Bun migration steps
 *   node bun-workflow.js --test           # Run built-in makeshift tests
 *
 * Self-contained — no external dependencies required.
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';

// ─── CLI flags ───────────────────────────────────────────────────────────────
const args           = process.argv.slice(2);
const DETECT         = args.includes('--detect');
const SHOW_TSCONFIG  = args.includes('--tsconfig');
const SHOW_BUNFIG    = args.includes('--bunfig');
const SHOW_SCRIPTS   = args.includes('--scripts');
const SHOW_MIGRATE   = args.includes('--migrate');
const TEST           = args.includes('--test');
const SHOW_HELP      = args.length === 0 || args.includes('--help');

// ─── Colours ─────────────────────────────────────────────────────────────────
const c = {
  green:  (s) => `\x1b[32m${s}\x1b[0m`,
  red:    (s) => `\x1b[31m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  cyan:   (s) => `\x1b[36m${s}\x1b[0m`,
  bold:   (s) => `\x1b[1m${s}\x1b[0m`,
  dim:    (s) => `\x1b[2m${s}\x1b[0m`,
};

// ─── Utilities ───────────────────────────────────────────────────────────────

function tryRun(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf8', stdio: 'pipe' }).trim();
  } catch {
    return null;
  }
}

/** Detect Bun and return version string, or null if not installed. */
function detectBun() {
  return tryRun('bun --version');
}

/** Check if we're inside a git repo. */
function isGitRepo() {
  return existsSync('.git') || tryRun('git rev-parse --is-inside-work-tree') === 'true';
}

// ─── Template generators ─────────────────────────────────────────────────────

/**
 * Returns Bun-optimised tsconfig.json content.
 * @param {'app'|'lib'|'react'} [target='app']
 * @returns {object}
 */
function buildBunTsconfig(target = 'app') {
  const base = {
    compilerOptions: {
      // Bun supports these natively
      target: 'ESNext',
      lib: target === 'react' ? ['ESNext', 'DOM', 'DOM.Iterable'] : ['ESNext'],
      module: 'Preserve',           // best for Bun
      moduleResolution: 'Bundler',  // required for module: Preserve
      // Output
      outDir: './dist',
      rootDir: './src',
      declaration: true,
      declarationMap: true,
      sourceMap: true,
      // Strictness
      strict: true,
      noUncheckedIndexedAccess: true,
      exactOptionalPropertyTypes: true,
      noImplicitOverride: true,
      noImplicitReturns: true,
      noFallthroughCasesInSwitch: true,
      noUnusedLocals: true,
      noUnusedParameters: true,
      // Interop
      esModuleInterop: true,
      allowSyntheticDefaultImports: true,
      skipLibCheck: true,
      forceConsistentCasingInFileNames: true,
      // Bun globals
      types: target === 'app' ? ['bun-types'] : [],
    },
    include: ['src'],
    exclude: ['node_modules', 'dist'],
  };

  if (target === 'react') {
    base.compilerOptions.jsx = 'react-jsx';
  }

  return base;
}

/**
 * Returns a bunfig.toml template string.
 * @param {object} opts
 * @param {string} [opts.testDir='src']
 * @param {boolean} [opts.coverage=true]
 * @returns {string}
 */
function buildBunfig(opts = {}) {
  const { testDir = 'src', coverage = true } = opts;
  return `# bunfig.toml — Bun configuration
# Reference: https://bun.sh/docs/runtime/bunfig

[install]
# Use exact versions (like npm --save-exact)
exact = false
# Lifecycle scripts (postinstall etc.) — set false for untrusted packages
lifecycle = true
# Auto-install types on install
auto = "auto"
# Dedupe on install
dedupe = false

[install.scopes]
# Scoped registry configuration (example)
# "@myorg" = { url = "https://registry.myorg.com/", token = "$NPM_TOKEN" }

[run]
# Default shell for bun run scripts
# shell = "system"
# Automatically load .env file
# bun automatically loads .env, .env.local, .env.development, .env.production

[test]
# Root directory for test files
root = "${testDir}"
# Coverage
coverage = ${coverage}
coverageThreshold = { line = 80, function = 80, statement = 80 }
# Timeout per test (ms)
timeout = 5000
# Reporter
reporter = "default"
# Preload file (equivalent to jest setupFilesAfterFramework)
# preload = ["./src/test-setup.ts"]

[build]
# Default entrypoint (used by \`bun build\`)
# entrypoints = ["./src/index.ts"]
# Default output directory
# outdir = "./dist"
# Minify in production
# minify = true
`;
}

/**
 * Returns Bun-specific package.json scripts.
 * @param {boolean} [react=false]
 * @returns {object}
 */
function buildBunScripts(react = false) {
  return {
    dev: 'bun run --watch src/index.ts',
    start: 'bun run src/index.ts',
    build: 'bun build src/index.ts --outdir dist --target bun',
    'build:minify': 'bun build src/index.ts --outdir dist --target bun --minify',
    test: 'bun test',
    'test:watch': 'bun test --watch',
    'test:coverage': 'bun test --coverage',
    typecheck: 'tsc --noEmit',
    lint: `eslint src --ext .ts${react ? ',.tsx' : ''}`,
    'lint:fix': `eslint src --ext .ts${react ? ',.tsx' : ''} --fix`,
    format: `prettier --write "src/**/*.ts${react ? 'x' : ''}"`,
    clean: 'rm -rf dist',
    ci: 'bun run typecheck && bun test --coverage && bun run build',
  };
}

// ─── Migration steps ─────────────────────────────────────────────────────────

function getMigrationSteps() {
  return [
    {
      step: 1,
      title: 'Install Bun',
      cmd: 'curl -fsSL https://bun.sh/install | bash   # macOS/Linux\n  powershell -c "irm bun.sh/install.ps1 | iex"  # Windows',
    },
    {
      step: 2,
      title: 'Install dependencies with Bun (replaces npm install)',
      cmd: 'bun install',
    },
    {
      step: 3,
      title: 'Update tsconfig.json for Bun',
      cmd: 'node bun-workflow.js --tsconfig  (copy output to tsconfig.json)',
    },
    {
      step: 4,
      title: 'Create bunfig.toml',
      cmd: 'node bun-workflow.js --bunfig > bunfig.toml',
    },
    {
      step: 5,
      title: 'Add bun-types',
      cmd: 'bun add -D bun-types',
    },
    {
      step: 6,
      title: 'Replace npm scripts with Bun equivalents',
      cmd: 'node bun-workflow.js --scripts  (copy output to package.json)',
    },
    {
      step: 7,
      title: 'Migrate Jest tests to bun:test (optional)',
      cmd: 'Replace: import { describe, it, expect } from "@jest/globals"\nWith:    import { describe, it, expect } from "bun:test"',
    },
    {
      step: 8,
      title: 'Update CI/CD (if any)',
      cmd: 'Replace: actions/setup-node\nWith:    oven-sh/setup-bun',
    },
  ];
}

// ─── Output actions ───────────────────────────────────────────────────────────

function printHelp() {
  console.log(`
${c.bold(c.cyan('Bun TypeScript Workflow Helper'))}

${c.bold('Usage:')}
  node bun-workflow.js [option]

${c.bold('Options:')}
  --detect      Detect Bun installation and version
  --tsconfig    Print Bun-optimised tsconfig.json
  --bunfig      Print bunfig.toml template
  --scripts     Print package.json scripts for Bun projects
  --migrate     Show Node.js → Bun migration steps
  --test        Run built-in makeshift tests
  --help        Show this help
`);
}

function detectAndPrint() {
  const version = detectBun();
  if (version) {
    console.log(`\n  ${c.green('✅')}  Bun detected: ${c.bold('v' + version)}`);
    const nodeVersion = tryRun('node --version');
    if (nodeVersion) console.log(`  ${c.dim('ℹ️')}  Node.js also available: ${nodeVersion}`);
  } else {
    console.log(`\n  ${c.yellow('⚠️')}  Bun is not installed or not on PATH.`);
    console.log(`\n  Install with:`);
    console.log(`    ${c.cyan('curl -fsSL https://bun.sh/install | bash')}   # macOS/Linux`);
    console.log(`    ${c.cyan('powershell -c "irm bun.sh/install.ps1 | iex"')}  # Windows`);
  }
  console.log();
}

function printTsconfig() {
  console.log(c.bold('\n⚙️   Bun-optimised tsconfig.json (app)\n'));
  console.log(JSON.stringify(buildBunTsconfig('app'), null, 2));
  console.log(c.dim('\n  Note: module: "Preserve" + moduleResolution: "Bundler" is the recommended pair for Bun.\n'));
}

function printBunfig() {
  console.log(c.bold('\n📄  bunfig.toml template\n'));
  console.log(buildBunfig());
}

function printScripts() {
  console.log(c.bold('\n📜  package.json scripts for Bun projects\n'));
  console.log(JSON.stringify({ scripts: buildBunScripts() }, null, 2));
}

function printMigration() {
  console.log(c.bold('\n🔄  Node.js → Bun Migration Steps\n'));
  getMigrationSteps().forEach(({ step, title, cmd }) => {
    console.log(`  ${c.bold(c.cyan(step + '.'))} ${title}`);
    console.log(c.dim('     ' + cmd.replace(/\n/g, '\n     ')));
    console.log();
  });
}

// ─── Makeshift tests ─────────────────────────────────────────────────────────

function runTests() {
  console.log(c.bold('\n═══ Makeshift Tests ═══\n'));
  let passed = 0; let failed = 0;

  function assert(label, actual, expected) {
    const ok = JSON.stringify(actual) === JSON.stringify(expected);
    console.log(`  ${ok ? '\x1b[32m✅ PASS\x1b[0m' : '\x1b[31m❌ FAIL\x1b[0m'}  ${label}`);
    console.log(c.dim(`        Expected: ${JSON.stringify(expected)}`));
    if (!ok) console.log(c.dim(`        Got:      ${JSON.stringify(actual)}`));
    ok ? passed++ : failed++;
  }

  // Test 1: buildBunTsconfig sets module: Preserve
  const cfg = buildBunTsconfig('app');
  assert('buildBunTsconfig("app").compilerOptions.module', cfg.compilerOptions.module, 'Preserve');
  // Expected: 'Preserve'

  assert('buildBunTsconfig("app").compilerOptions.moduleResolution', cfg.compilerOptions.moduleResolution, 'Bundler');
  // Expected: 'Bundler'

  assert('buildBunTsconfig("app").compilerOptions.strict', cfg.compilerOptions.strict, true);
  // Expected: true

  // Test 2: buildBunTsconfig react adds jsx + DOM
  const reactCfg = buildBunTsconfig('react');
  assert('buildBunTsconfig("react") sets jsx', reactCfg.compilerOptions.jsx, 'react-jsx');
  // Expected: 'react-jsx'

  assert('buildBunTsconfig("react") includes DOM lib', reactCfg.compilerOptions.lib.includes('DOM'), true);
  // Expected: true

  assert('buildBunTsconfig("app") excludes DOM lib', cfg.compilerOptions.lib.includes('DOM'), false);
  // Expected: false

  // Test 3: buildBunfig is a non-empty string
  const bunfig = buildBunfig();
  assert('buildBunfig() returns a string', typeof bunfig, 'string');
  // Expected: 'string'

  assert('buildBunfig() contains [test] section', bunfig.includes('[test]'), true);
  // Expected: true

  assert('buildBunfig() contains [install] section', bunfig.includes('[install]'), true);
  // Expected: true

  // Test 4: buildBunfig coverage option
  const noCov = buildBunfig({ coverage: false });
  assert('buildBunfig({coverage:false}) sets coverage = false', noCov.includes('coverage = false'), true);
  // Expected: true

  // Test 5: buildBunScripts includes bun test
  const scripts = buildBunScripts();
  assert('buildBunScripts().test uses bun test', scripts.test, 'bun test');
  // Expected: 'bun test'

  assert('buildBunScripts().dev uses bun run --watch', scripts.dev.startsWith('bun run --watch'), true);
  // Expected: true

  // Test 6: getMigrationSteps returns 8 steps
  const steps = getMigrationSteps();
  assert('getMigrationSteps() returns 8 items', steps.length, 8);
  // Expected: 8

  assert('First migration step is step 1', steps[0].step, 1);
  // Expected: 1

  // Test 7: tryRun returns string for node version
  const nodeVer = tryRun('node --version');
  assert('tryRun("node --version") returns a string', typeof nodeVer, 'string');
  // Expected: 'string'

  assert('tryRun("node --version") starts with v', nodeVer.startsWith('v'), true);
  // Expected: true

  console.log(c.bold(`\n  Tests: ${c.green(passed + ' passed')}  ${failed > 0 ? '\x1b[31m' + failed + ' failed\x1b[0m' : c.dim('0 failed')}\n`));
  if (failed > 0) process.exit(1);
}

// ─── Entry point ─────────────────────────────────────────────────────────────

if (TEST)               runTests();
else if (DETECT)        detectAndPrint();
else if (SHOW_TSCONFIG) printTsconfig();
else if (SHOW_BUNFIG)   printBunfig();
else if (SHOW_SCRIPTS)  printScripts();
else if (SHOW_MIGRATE)  printMigration();
else                    printHelp();
