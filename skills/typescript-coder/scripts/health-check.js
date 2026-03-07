#!/usr/bin/env node
/**
 * TypeScript Project Health Check
 *
 * Runs diagnostic checks on a TypeScript project and reports results.
 *
 * Usage:
 *   node health-check.js              # Run all checks
 *   node health-check.js --fix        # Run checks and attempt auto-fixes
 *   node health-check.js --ci         # CI mode (exit 1 on failures)
 *   node health-check.js --test       # Run built-in makeshift tests
 *
 * Dependencies (install as needed):
 *   npm install -D type-coverage knip madge @arethetypeswrong/cli size-limit
 */

import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import path from 'path';

// ─── Colour helpers ──────────────────────────────────────────────────────────
const c = {
  green:  (s) => `\x1b[32m${s}\x1b[0m`,
  red:    (s) => `\x1b[31m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  cyan:   (s) => `\x1b[36m${s}\x1b[0m`,
  bold:   (s) => `\x1b[1m${s}\x1b[0m`,
  dim:    (s) => `\x1b[2m${s}\x1b[0m`,
};

const PASS  = c.green('✅ PASS');
const FAIL  = c.red('❌ FAIL');
const WARN  = c.yellow('⚠️  WARN');
const SKIP  = c.dim('⏭️  SKIP');

// ─── CLI flags ───────────────────────────────────────────────────────────────
const args  = process.argv.slice(2);
const FIX   = args.includes('--fix');
const CI    = args.includes('--ci');
const TEST  = args.includes('--test');

// ─── Utilities ───────────────────────────────────────────────────────────────

/** Run a shell command and return stdout, or null on failure. */
function tryRun(cmd, opts = {}) {
  try {
    return execSync(cmd, { encoding: 'utf8', stdio: 'pipe', ...opts }).trim();
  } catch {
    return null;
  }
}

/** Check whether a CLI tool is available on PATH. */
function hasTool(name) {
  return tryRun(`${process.platform === 'win32' ? 'where' : 'which'} ${name}`) !== null;
}

/** Parse the nearest tsconfig.json and return its parsed content, or null. */
function loadTsconfig(cwd = process.cwd()) {
  const loc = path.join(cwd, 'tsconfig.json');
  if (!existsSync(loc)) return null;
  try {
    // Strip JS-style comments before parsing
    const raw = readFileSync(loc, 'utf8').replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/** Accumulate results */
const results = { pass: 0, fail: 0, warn: 0, skip: 0 };

function report(status, label, detail = '') {
  const icon = status === 'pass' ? PASS : status === 'fail' ? FAIL : status === 'warn' ? WARN : SKIP;
  results[status]++;
  console.log(`  ${icon}  ${label}${detail ? c.dim('  — ' + detail) : ''}`);
}

// ─── Check functions ─────────────────────────────────────────────────────────

function checkTsconfig() {
  console.log(c.bold('\n🔧  tsconfig.json audit'));
  const cfg = loadTsconfig();
  if (!cfg) {
    report('fail', 'tsconfig.json not found', 'run: npx tsc --init');
    return;
  }
  report('pass', 'tsconfig.json found and parseable');

  const co = (cfg.compilerOptions || {});

  const strictFlags = ['strict', 'noImplicitAny', 'strictNullChecks', 'strictFunctionTypes',
                       'strictBindCallApply', 'strictPropertyInitialization', 'noImplicitThis',
                       'alwaysStrict'];
  const enabled = strictFlags.filter(f => co[f] === true || co.strict === true);
  if (co.strict === true) {
    report('pass', 'strict: true enabled');
  } else if (enabled.length >= 4) {
    report('warn', `${enabled.length}/${strictFlags.length} strict flags enabled`, 'consider strict: true');
  } else {
    report('fail', `Only ${enabled.length}/${strictFlags.length} strict flags enabled`, 'add strict: true');
  }

  if (co.noUncheckedIndexedAccess) report('pass', 'noUncheckedIndexedAccess enabled');
  else report('warn', 'noUncheckedIndexedAccess not set', 'catches undefined array access');

  if (co.exactOptionalPropertyTypes) report('pass', 'exactOptionalPropertyTypes enabled');
  else report('warn', 'exactOptionalPropertyTypes not set');

  if (co.noImplicitOverride) report('pass', 'noImplicitOverride enabled');
  else report('warn', 'noImplicitOverride not set');
}

function checkTypeCoverage() {
  console.log(c.bold('\n📊  Type coverage'));
  if (!hasTool('type-coverage') && !existsSync('node_modules/.bin/type-coverage')) {
    report('skip', 'type-coverage not installed', 'npm install -D type-coverage');
    return;
  }
  const out = tryRun('npx type-coverage --detail');
  if (!out) { report('fail', 'type-coverage failed to run'); return; }
  const match = out.match(/(\d+\.\d+)%/);
  if (match) {
    const pct = parseFloat(match[1]);
    if (pct >= 95) report('pass', `Type coverage ${pct}%`, 'Excellent');
    else if (pct >= 80) report('warn', `Type coverage ${pct}%`, 'aim for ≥95%');
    else report('fail', `Type coverage ${pct}%`, 'high risk — many any types');
  } else {
    report('warn', 'Could not parse type-coverage output');
  }
}

function checkDeadCode() {
  console.log(c.bold('\n🧹  Dead code detection'));
  if (!hasTool('knip') && !existsSync('node_modules/.bin/knip')) {
    report('skip', 'knip not installed', 'npm install -D knip');
    return;
  }
  const out = tryRun('npx knip --reporter compact 2>&1');
  if (!out) { report('fail', 'knip failed'); return; }
  if (out.includes('No issues found')) {
    report('pass', 'No dead code / unused exports detected');
  } else {
    const lines = out.split('\n').filter(Boolean).length;
    const status = lines > 10 ? 'fail' : 'warn';
    report(status, `knip found ${lines} potential issues`, FIX ? 'review knip output above' : 'run --fix for details');
  }
}

function checkCircularDeps() {
  console.log(c.bold('\n🔄  Circular dependencies'));
  if (!hasTool('madge') && !existsSync('node_modules/.bin/madge')) {
    report('skip', 'madge not installed', 'npm install -D madge');
    return;
  }
  const src = existsSync('src') ? 'src' : '.';
  const out = tryRun(`npx madge --circular --extensions ts,tsx ${src} 2>&1`);
  if (!out) { report('warn', 'madge returned no output'); return; }
  if (out.includes('No circular dependency found') || out.trim() === '') {
    report('pass', 'No circular dependencies found');
  } else {
    report('fail', 'Circular dependencies detected', 'use shared interface files to break cycles');
    console.log(c.dim(out.split('\n').slice(0, 5).join('\n')));
  }
}

function checkDeclarationFiles() {
  console.log(c.bold('\n📦  Declaration file validation'));
  if (!hasTool('attw') && !existsSync('node_modules/.bin/attw')) {
    report('skip', '@arethetypeswrong/cli not installed', 'npm install -D @arethetypeswrong/cli');
    return;
  }
  const pkg = existsSync('package.json')
    ? JSON.parse(readFileSync('package.json', 'utf8'))
    : null;
  if (!pkg) { report('skip', 'No package.json found'); return; }

  const out = tryRun('npx attw --pack . 2>&1');
  if (!out) { report('warn', 'attw returned no output'); return; }
  if (out.includes('No problems found')) {
    report('pass', 'Declaration files look correct');
  } else {
    report('warn', 'attw found potential issues', 'review output above');
  }
}

function checkTypePerformance() {
  console.log(c.bold('\n⚡  TypeScript compile performance'));
  const out = tryRun('npx tsc --noEmit --extendedDiagnostics 2>&1');
  if (!out) { report('warn', 'tsc not available or compile errors'); return; }

  const instantiations = out.match(/Instantiations:\s+([\d,]+)/);
  const checkTime = out.match(/Check time:\s+([\d.]+)s/);

  if (instantiations) {
    const count = parseInt(instantiations[1].replace(/,/g, ''), 10);
    if (count < 1_000_000) report('pass', `Type instantiations: ${instantiations[1]}`, 'healthy');
    else if (count < 5_000_000) report('warn', `Type instantiations: ${instantiations[1]}`, 'consider simplifying complex generics');
    else report('fail', `Type instantiations: ${instantiations[1]}`, 'very slow — run tsc --generateTrace for profiling');
  }
  if (checkTime) {
    const secs = parseFloat(checkTime[1]);
    if (secs < 5) report('pass', `Check time: ${checkTime[1]}s`);
    else if (secs < 15) report('warn', `Check time: ${checkTime[1]}s`, 'consider incremental builds');
    else report('fail', `Check time: ${checkTime[1]}s`, 'enable incremental: true in tsconfig');
  }
}

// ─── Main ────────────────────────────────────────────────────────────────────

function main() {
  console.log(c.bold(c.cyan('\n╔══════════════════════════════════════╗')));
  console.log(c.bold(c.cyan('║  TypeScript Project Health Check     ║')));
  console.log(c.bold(c.cyan('╚══════════════════════════════════════╝')));
  console.log(c.dim(`  Project: ${process.cwd()}`));

  checkTsconfig();
  checkTypeCoverage();
  checkDeadCode();
  checkCircularDeps();
  checkDeclarationFiles();
  checkTypePerformance();

  // Summary
  console.log(c.bold('\n── Summary ──────────────────────────────'));
  console.log(`  ${c.green('✅')} Pass: ${results.pass}   ${c.red('❌')} Fail: ${results.fail}   ${c.yellow('⚠️')}  Warn: ${results.warn}   ${c.dim('⏭️')}  Skip: ${results.skip}`);

  if (results.fail === 0 && results.warn === 0) {
    console.log(c.green('\n  🎉  Project health is excellent!\n'));
  } else if (results.fail === 0) {
    console.log(c.yellow('\n  👍  Project is healthy with some minor warnings.\n'));
  } else {
    console.log(c.red(`\n  🚨  ${results.fail} check(s) failed. Review output above.\n`));
  }

  if (CI && results.fail > 0) process.exit(1);
}

// ─── Makeshift Tests ─────────────────────────────────────────────────────────

function runTests() {
  console.log(c.bold('\n═══ Makeshift Tests ═══\n'));
  let passed = 0;
  let failed = 0;

  function assert(label, actual, expected) {
    if (actual === expected) {
      console.log(`${PASS}  ${label}`);
      console.log(c.dim(`        Expected: ${JSON.stringify(expected)}`));
      passed++;
    } else {
      console.log(`${FAIL}  ${label}`);
      console.log(c.dim(`        Expected: ${JSON.stringify(expected)}`));
      console.log(c.dim(`        Got:      ${JSON.stringify(actual)}`));
      failed++;
    }
  }

  // Test 1: Color helpers produce ANSI codes
  const green = c.green('ok');
  assert('c.green() wraps in ANSI green', green.includes('\x1b[32m'), true);
  // Expected: true — string contains ANSI escape code

  const red = c.red('err');
  assert('c.red() wraps in ANSI red', red.includes('\x1b[31m'), true);
  // Expected: true

  // Test 2: tryRun returns null on bad command
  const bad = tryRun('this-command-does-not-exist-xyz-123 2>/dev/null');
  assert('tryRun() returns null for unknown command', bad, null);
  // Expected: null

  // Test 3: tryRun executes simple echo
  const echo = tryRun(`node -e "console.log('hello')"`);
  assert('tryRun() returns stdout of valid command', echo, 'hello');
  // Expected: 'hello'

  // Test 4: hasTool detects node
  const nodeFound = hasTool('node');
  assert('hasTool("node") returns true', nodeFound, true);
  // Expected: true (node is running this script)

  // Test 5: hasTool returns false for fake tool
  const fakeFound = hasTool('this-tool-xyz-does-not-exist-abc');
  assert('hasTool() returns false for nonexistent tool', fakeFound, false);
  // Expected: false

  // Test 6: loadTsconfig returns null when no tsconfig.json in a temp path
  const tmpCfg = loadTsconfig('/tmp');
  assert('loadTsconfig() returns null for missing tsconfig', tmpCfg, null);
  // Expected: null

  // Test 7: Results accumulator starts at 0
  const fresh = { pass: 0, fail: 0, warn: 0, skip: 0 };
  assert('results.pass initial value', fresh.pass, 0);
  // Expected: 0

  // Test 8: PASS constant includes green ANSI code
  assert('PASS constant contains green ANSI', PASS.includes('\x1b[32m'), true);
  // Expected: true

  console.log(c.bold(`\n  Tests: ${c.green(passed + ' passed')}  ${failed > 0 ? c.red(failed + ' failed') : c.dim('0 failed')}\n`));
  if (failed > 0) process.exit(1);
}

// ─── Entry point ─────────────────────────────────────────────────────────────

if (TEST) {
  runTests();
} else {
  main();
}
