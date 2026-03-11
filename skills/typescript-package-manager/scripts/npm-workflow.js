#!/usr/bin/env node
/**
 * TypeScript npm Workflow Helper
 *
 * Provides utilities for common TypeScript + npm project tasks:
 *   - Generate a package.json scripts block for TypeScript projects
 *   - Generate tsconfig.json templates
 *   - Print setup checklists
 *   - Audit @types packages against dependencies
 *
 * Usage:
 *   node npm-workflow.js --scripts          # Print recommended package.json scripts
 *   node npm-workflow.js --tsconfig         # Print recommended tsconfig.json
 *   node npm-workflow.js --checklist        # Print TypeScript project setup checklist
 *   node npm-workflow.js --audit-types      # Audit @types packages vs dependencies
 *   node npm-workflow.js --test             # Run built-in makeshift tests
 *
 * Self-contained — no external dependencies required.
 */

import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';

// ─── CLI flags ───────────────────────────────────────────────────────────────
const args        = process.argv.slice(2);
const SHOW_SCRIPTS   = args.includes('--scripts');
const SHOW_TSCONFIG  = args.includes('--tsconfig');
const SHOW_CHECKLIST = args.includes('--checklist');
const AUDIT_TYPES    = args.includes('--audit-types');
const TEST           = args.includes('--test');
const SHOW_HELP      = args.includes('--help') || args.length === 0;

// ─── Colours ─────────────────────────────────────────────────────────────────
const c = {
  green:  (s) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  cyan:   (s) => `\x1b[36m${s}\x1b[0m`,
  bold:   (s) => `\x1b[1m${s}\x1b[0m`,
  dim:    (s) => `\x1b[2m${s}\x1b[0m`,
};

// ─── Templates ───────────────────────────────────────────────────────────────

/**
 * Returns recommended package.json scripts for a TypeScript project.
 * @param {object} opts
 * @param {'cjs'|'esm'} [opts.moduleType='cjs']
 * @param {boolean} [opts.includeTest=true]
 * @param {boolean} [opts.includeLint=true]
 * @returns {object} scripts map
 */
function buildScripts(opts = {}) {
  const { moduleType = 'cjs', includeTest = true, includeLint = true } = opts;
  const scripts = {
    build: 'tsc --project tsconfig.build.json',
    'build:watch': 'tsc --project tsconfig.build.json --watch',
    typecheck: 'tsc --noEmit',
    'typecheck:watch': 'tsc --noEmit --watch',
    clean: 'node -e "require(\'fs\').rmSync(\'dist\', { recursive: true, force: true })"',
    dev: 'tsx watch src/index.ts',
    start: 'node dist/index.js',
    prepare: 'npm run build',
  };

  if (includeTest) {
    Object.assign(scripts, {
      test: 'jest',
      'test:watch': 'jest --watch',
      'test:coverage': 'jest --coverage',
    });
  }

  if (includeLint) {
    Object.assign(scripts, {
      lint: 'eslint src --ext .ts,.tsx',
      'lint:fix': 'eslint src --ext .ts,.tsx --fix',
      format: 'prettier --write "src/**/*.{ts,tsx}"',
      'format:check': 'prettier --check "src/**/*.{ts,tsx}"',
    });
  }

  Object.assign(scripts, {
    validate: 'npm run typecheck && npm run lint && npm run test',
    ci: 'npm run validate && npm run build',
    prepublishOnly: 'npm run ci',
  });

  return scripts;
}

/**
 * Returns a recommended tsconfig.json for a TypeScript project.
 * @param {'node'|'react'|'lib'} [target='node']
 * @returns {object}
 */
function buildTsconfig(target = 'node') {
  const base = {
    compilerOptions: {
      target: 'ES2022',
      lib: ['ES2022'],
      module: target === 'react' ? 'ESNext' : 'CommonJS',
      moduleResolution: target === 'react' ? 'Bundler' : 'Node10',
      outDir: './dist',
      rootDir: './src',
      declaration: true,
      declarationMap: true,
      sourceMap: true,
      strict: true,
      noUncheckedIndexedAccess: true,
      exactOptionalPropertyTypes: true,
      noImplicitOverride: true,
      noImplicitReturns: true,
      noFallthroughCasesInSwitch: true,
      noUnusedLocals: true,
      noUnusedParameters: true,
      esModuleInterop: true,
      skipLibCheck: true,
      forceConsistentCasingInFileNames: true,
    },
    include: ['src'],
    exclude: ['node_modules', 'dist', '**/*.test.ts', '**/*.spec.ts'],
  };

  if (target === 'react') {
    base.compilerOptions.jsx = 'react-jsx';
    base.compilerOptions.lib = ['ES2022', 'DOM', 'DOM.Iterable'];
  }

  if (target === 'lib') {
    base.compilerOptions.declarationDir = './types';
  }

  return base;
}

/**
 * Returns the list of @types packages that are likely needed for common deps.
 * @param {string[]} deps - array of dependency names
 * @returns {string[]} recommended @types packages
 */
function suggestTypes(deps) {
  const typeMap = {
    express: '@types/express',
    node: '@types/node',
    jest: '@types/jest',
    mocha: '@types/mocha',
    chai: '@types/chai',
    react: '@types/react',
    'react-dom': '@types/react-dom',
    lodash: '@types/lodash',
    uuid: '@types/uuid',
    ws: '@types/ws',
    cors: '@types/cors',
    helmet: '@types/helmet',
    morgan: '@types/morgan',
    multer: '@types/multer',
    passport: '@types/passport',
    jsonwebtoken: '@types/jsonwebtoken',
    bcrypt: '@types/bcrypt',
    supertest: '@types/supertest',
  };

  return deps
    .filter(dep => typeMap[dep])
    .map(dep => typeMap[dep]);
}

// ─── Actions ─────────────────────────────────────────────────────────────────

function printHelp() {
  console.log(`
${c.bold(c.cyan('TypeScript npm Workflow Helper'))}

${c.bold('Usage:')}
  node npm-workflow.js [option]

${c.bold('Options:')}
  --scripts       Print recommended package.json scripts block
  --tsconfig      Print recommended tsconfig.json
  --checklist     Print TypeScript project setup checklist
  --audit-types   Audit @types packages against your package.json
  --test          Run built-in makeshift tests
  --help          Show this help
`);
}

function printScripts() {
  console.log(c.bold('\n📜  Recommended package.json scripts\n'));
  const scripts = buildScripts({ moduleType: 'cjs', includeTest: true, includeLint: true });
  const block = JSON.stringify({ scripts }, null, 2);
  console.log(block);
  console.log(c.dim('\n  Add the above to your package.json\n'));
}

function printTsconfig() {
  console.log(c.bold('\n⚙️   Recommended tsconfig.json (Node.js)\n'));
  console.log(JSON.stringify(buildTsconfig('node'), null, 2));
  console.log(c.dim('\n  Also available: --tsconfig react, --tsconfig lib  (extend this script)\n'));
}

function printChecklist() {
  console.log(c.bold('\n📋  TypeScript Project Setup Checklist\n'));
  const steps = [
    ['Initialize project',        'npm init -y'],
    ['Install TypeScript',        'npm install -D typescript'],
    ['Install Node types',        'npm install -D @types/node'],
    ['Install tsx (dev runner)',  'npm install -D tsx'],
    ['Install ts-jest',           'npm install -D jest ts-jest @types/jest'],
    ['Install ESLint + TS',       'npm install -D eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin'],
    ['Install Prettier',          'npm install -D prettier'],
    ['Create tsconfig.json',      'npx tsc --init  (or use --tsconfig flag above)'],
    ['Create src/index.ts',       'mkdir src && echo "export {};" > src/index.ts'],
    ['Add package.json scripts',  'node npm-workflow.js --scripts  (copy output)'],
    ['First build',               'npm run build'],
    ['Run type check',            'npm run typecheck'],
  ];

  steps.forEach(([label, cmd], i) => {
    console.log(`  ${c.green(String(i + 1).padStart(2, ' '))}. ${label.padEnd(30)} ${c.dim(cmd)}`);
  });
  console.log();
}

function auditTypes() {
  console.log(c.bold('\n🔍  @types package audit\n'));
  if (!existsSync('package.json')) {
    console.log(c.yellow('  No package.json found in current directory.\n'));
    return;
  }
  const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
  const allDeps = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies });
  const suggested = suggestTypes(allDeps);
  const devDeps = Object.keys(pkg.devDependencies || {});
  const missing = suggested.filter(t => !devDeps.includes(t));

  if (missing.length === 0) {
    console.log(c.green('  ✅  All detected dependencies have @types packages installed.\n'));
  } else {
    console.log(c.yellow(`  ⚠️   Missing @types packages:\n`));
    missing.forEach(t => console.log(`    npm install -D ${t}`));
    console.log();
    console.log(c.dim('  Install all at once:'));
    console.log(`  npm install -D ${missing.join(' ')}\n`);
  }
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

  // Test 1: buildScripts returns expected keys
  const scripts = buildScripts();
  assert('buildScripts() includes "build" key', 'build' in scripts, true);
  // Expected: true

  assert('buildScripts() includes "typecheck" key', 'typecheck' in scripts, true);
  // Expected: true

  assert('buildScripts() includes "test" key', 'test' in scripts, true);
  // Expected: true

  assert('buildScripts() includes "lint" key', 'lint' in scripts, true);
  // Expected: true

  // Test 2: buildScripts excludes test when includeTest=false
  const noTestScripts = buildScripts({ includeTest: false });
  assert('buildScripts({includeTest:false}) excludes "test"', 'test' in noTestScripts, false);
  // Expected: false

  // Test 3: buildTsconfig returns strict: true
  const tsconfig = buildTsconfig('node');
  assert('buildTsconfig("node").compilerOptions.strict', tsconfig.compilerOptions.strict, true);
  // Expected: true

  assert('buildTsconfig("node").compilerOptions.target', tsconfig.compilerOptions.target, 'ES2022');
  // Expected: 'ES2022'

  // Test 4: buildTsconfig react adds jsx
  const reactCfg = buildTsconfig('react');
  assert('buildTsconfig("react") sets jsx', reactCfg.compilerOptions.jsx, 'react-jsx');
  // Expected: 'react-jsx'

  // Test 5: suggestTypes maps express
  const suggestions = suggestTypes(['express', 'lodash', 'unknown-pkg']);
  assert('suggestTypes() maps express → @types/express', suggestions.includes('@types/express'), true);
  // Expected: true

  assert('suggestTypes() maps lodash → @types/lodash', suggestions.includes('@types/lodash'), true);
  // Expected: true

  assert('suggestTypes() ignores unknown packages', suggestions.length, 2);
  // Expected: 2  (only express and lodash match)

  // Test 6: suggestTypes returns empty for no matches
  const empty = suggestTypes(['some-internal-package']);
  assert('suggestTypes() returns [] for no matches', empty, []);
  // Expected: []

  // Test 7: buildScripts validate command includes typecheck
  assert('buildScripts() validate runs typecheck', scripts.validate.includes('typecheck'), true);
  // Expected: true

  // Test 8: buildTsconfig node excludes DOM lib
  assert('buildTsconfig("node") excludes DOM lib', tsconfig.compilerOptions.lib.includes('DOM'), false);
  // Expected: false

  console.log(c.bold(`\n  Tests: ${c.green(passed + ' passed')}  ${failed > 0 ? '\x1b[31m' + failed + ' failed\x1b[0m' : c.dim('0 failed')}\n`));
  if (failed > 0) process.exit(1);
}

// ─── Entry point ─────────────────────────────────────────────────────────────

if (TEST)           runTests();
else if (SHOW_SCRIPTS)   printScripts();
else if (SHOW_TSCONFIG)  printTsconfig();
else if (SHOW_CHECKLIST) printChecklist();
else if (AUDIT_TYPES)    auditTypes();
else                     printHelp();
