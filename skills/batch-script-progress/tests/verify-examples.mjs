import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const windows = process.platform === 'win32';
const runtimes = [
  { name: 'Python', command: process.env.BATCH_PYTHON ?? (windows ? 'py.exe' : 'python3'), args: [...(windows && !process.env.BATCH_PYTHON ? ['-3'] : []), '-B', join(root, 'examples/batch.py')] },
  { name: 'PowerShell', command: process.env.BATCH_POWERSHELL ?? (windows ? 'powershell.exe' : 'pwsh'), args: ['-NoProfile', '-NonInteractive', ...(windows ? ['-ExecutionPolicy', 'Bypass'] : []), '-File', join(root, 'examples/batch.ps1')] },
  { name: 'Node.js', command: process.execPath, args: [join(root, 'examples/batch.mjs')] },
];
const cases = {
  normal: { total: 3, succeeded: 3, failed: 0, skipped: 0, status: 'completed', code: 0 },
  mixed: { total: 4, succeeded: 2, failed: 1, skipped: 1, status: 'partial', code: 1 },
  'partial-zero': { total: 3, succeeded: 2, failed: 1, skipped: 0, status: 'partial', code: 0 },
  empty: { total: 0, succeeded: 0, failed: 0, skipped: 0, status: 'completed', code: 0 },
  unknown: { total: null, succeeded: 3, failed: 0, skipped: 0, status: 'completed', code: 0 },
  'fail-fast': { total: 3, succeeded: 1, failed: 1, skipped: 0, status: 'failed', code: 1 },
  cancelled: { total: 3, succeeded: 1, failed: 0, skipped: 0, status: 'cancelled', code: 130 },
  live: { total: 3, succeeded: 3, failed: 0, skipped: 0, status: 'completed', code: 0 },
};

function accounting(record) {
  for (const key of ['processed', 'succeeded', 'failed', 'skipped']) {
    assert.ok(Number.isInteger(record[key]) && record[key] >= 0, key);
  }
  assert.equal(record.processed, record.succeeded + record.failed + record.skipped);
}

function verify(stdout, stderr, code, scenario) {
  const expected = cases[scenario];
  const events = stderr.trim().split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line));
  assert.equal(events[0].event, 'start');
  assert.equal(events.at(-1).event, 'summary');
  assert.equal(events.filter(record => record.event === 'start').length, 1);
  assert.equal(events.filter(record => record.event === 'summary').length, 1);
  let previous = { processed: 0, succeeded: 0, failed: 0, skipped: 0, elapsed_ms: 0 };
  for (const record of events) {
    accounting(record);
    assert.equal(record.total, expected.total);
    for (const key of ['processed', 'succeeded', 'failed', 'skipped', 'elapsed_ms']) {
      assert.ok(record[key] >= previous[key], `non-monotonic ${key}`);
    }
    if (expected.total === null) {
      for (const key of ['percentage', 'eta', 'remaining']) assert.ok(!(key in record));
    }
    previous = record;
  }
  const summary = events.at(-1);
  for (const key of ['succeeded', 'failed', 'skipped', 'status']) assert.equal(summary[key], expected[key]);
  assert.equal(summary.exit_code, expected.code);
  assert.equal(code, expected.code);
  assert.equal(summary.unprocessed, expected.total === null ? null : expected.total - summary.processed);
  const failures = events.filter(record => record.event === 'item-failed');
  assert.equal(failures.length, expected.failed);
  for (const failure of failures) {
    assert.equal(failure.item_id, ['fail-fast', 'partial-zero'].includes(scenario) ? 'item-2' : 'item-3');
    assert.equal(failure.reason, 'fixture-rejected');
    assert.equal(failure.will_continue, scenario !== 'fail-fast');
  }
  if (scenario === 'empty') assert.equal(events.filter(record => record.event === 'progress').length, 0);
  if (['normal', 'unknown', 'mixed', 'partial-zero', 'live'].includes(scenario)) assert.ok(events.some(record => record.event === 'progress'));
  if (scenario === 'cancelled') {
    assert.equal(stdout, '');
  } else {
    const result = JSON.parse(stdout);
    const ids = scenario === 'mixed' ? [1, 4] : scenario === 'partial-zero' ? [1, 3] : scenario === 'fail-fast' ? [1] : scenario === 'empty' ? [] : [1, 2, 3];
    assert.deepEqual(result.results, ids.map(index => ({ id: `item-${index}`, value: index * 2 })));
  }
}

async function verifyLive(runtime) {
  const child = spawn(runtime.command, [...runtime.args, 'live'], { stdio: ['pipe', 'pipe', 'pipe'] });
  let stdout = '';
  let stderr = '';
  let pending = '';
  let released = false;
  let failure;
  const timeout = setTimeout(() => {
    failure = new Error(`${runtime.name}: no live notification before watchdog`);
    child.kill();
  }, 15000);
  child.stdout.setEncoding('utf8');
  child.stderr.setEncoding('utf8');
  child.stdin.on('error', error => { failure ??= error; });
  child.stdout.on('data', chunk => { stdout += chunk; });
  child.stderr.on('data', chunk => {
    stderr += chunk;
    pending += chunk;
    let newline;
    while ((newline = pending.indexOf('\n')) !== -1) {
      const line = pending.slice(0, newline).trim();
      pending = pending.slice(newline + 1);
      try {
        const record = JSON.parse(line);
        if (record.event === 'progress' && !released) {
          assert.equal(child.exitCode, null);
          assert.equal(child.signalCode, null);
          assert.equal(record.processed, 1);
          released = true;
          child.stdin.end('\n');
        }
      } catch (error) {
        failure ??= error;
        child.kill();
      }
    }
  });
  const code = await new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('close', resolve);
  }).finally(() => clearTimeout(timeout));
  if (failure) throw failure;
  assert.ok(released, `${runtime.name}: notification not observed before exit`);
  verify(stdout, stderr, code, 'live');
}

assert.throws(() => accounting({ processed: 2, succeeded: 1, failed: 0, skipped: 0 }), assert.AssertionError);
console.log('PASS negative control: corrupted accounting rejected');
let passed = 0;
for (const runtime of runtimes) {
  for (const scenario of Object.keys(cases).filter(name => name !== 'live')) {
    const result = spawnSync(runtime.command, [...runtime.args, scenario], { encoding: 'utf8', timeout: 15000 });
    if (result.error) throw result.error;
    assert.equal(result.signal, null);
    verify(result.stdout, result.stderr, result.status, scenario);
    console.log(`PASS ${runtime.name} ${scenario}`);
    passed++;
  }
  await verifyLive(runtime);
  console.log(`PASS ${runtime.name} live output received before release and exit`);
  passed++;
}
console.log(`BATCH_OUTPUT_CONTRACT_PASSED scenarios=${passed}`);
