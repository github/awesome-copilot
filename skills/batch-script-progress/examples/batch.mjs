import { once } from 'node:events';
import { createInterface } from 'node:readline';

const scenario = process.argv[2] ?? 'normal';
if (!['normal', 'mixed', 'partial-zero', 'empty', 'unknown', 'fail-fast', 'cancelled', 'live'].includes(scenario)) {
  throw new Error('Unknown fixture scenario');
}
const count = scenario === 'empty' ? 0 : scenario === 'mixed' ? 4 : 3;
const total = scenario === 'unknown' ? null : count;
const stats = { processed: 0, succeeded: 0, failed: 0, skipped: 0 };
const started = performance.now();
let lastReport = started;
let status = 'completed';
const results = [];

async function writeRecord(stream, record) {
  if (!stream.write(`${JSON.stringify(record)}\n`)) await once(stream, 'drain');
}

async function emit(event, fields = {}) {
  await writeRecord(process.stderr, { event, total, ...stats, elapsed_ms: Math.round(performance.now() - started), ...fields });
}

await emit('start');
for (let index = 1; index <= count; index++) {
  if (scenario === 'cancelled' && index === 2) {
    status = 'cancelled';
    break;
  }
  if (scenario === 'mixed' && index === 2) {
    stats.skipped++;
  } else {
    try {
      if ((scenario === 'mixed' && index === 3) || (['fail-fast', 'partial-zero'].includes(scenario) && index === 2)) {
        throw new Error('fixture-rejected');
      }
      results.push({ id: `item-${index}`, value: index * 2 });
      stats.succeeded++;
    } catch {
      stats.failed++;
      stats.processed++;
      await emit('item-failed', { item_id: `item-${index}`, reason: 'fixture-rejected', will_continue: scenario !== 'fail-fast' });
      if (scenario === 'fail-fast') {
        status = 'failed';
        break;
      }
      stats.processed--;
    }
  }
  stats.processed++;
  const now = performance.now();
  if (stats.processed % 2 === 0 || now - lastReport >= 1000 || scenario === 'live') {
    if (scenario === 'live' && index === 1) {
      const input = createInterface({ input: process.stdin });
      const released = once(input, 'line');
      await emit('progress');
      await released;
      input.close();
    } else {
      await emit('progress');
    }
    lastReport = now;
  }
}
if (status === 'completed' && stats.failed) status = 'partial';
const exitCode = status === 'cancelled' ? 130 : stats.failed && scenario !== 'partial-zero' ? 1 : 0;
await emit('summary', { status, exit_code: exitCode, unprocessed: total === null ? null : total - stats.processed });
if (status !== 'cancelled') await writeRecord(process.stdout, { results });
process.exitCode = exitCode;
