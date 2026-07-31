import assert from 'node:assert/strict';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { preflight } from './preflight.mjs';

async function fixture(name, content) {
  const directory = await mkdtemp(join(tmpdir(), 'slidesfly-preflight-'));
  const path = join(directory, name);
  await writeFile(path, content);
  return path;
}

test('accepts a self-contained HTML file and returns a checksum', async () => {
  const path = await fixture('deck.html', '<!doctype html><title>Deck</title><main>Slide</main>');
  const result = await preflight(path);

  assert.equal(result.ok, true);
  assert.equal(result.errors.length, 0);
  assert.match(result.sha256, /^[a-f0-9]{64}$/);
  assert.equal(result.script_sources.length, 0);
});

test('rejects external script sources', async () => {
  const path = await fixture('deck.html', '<script src="https://cdn.example.test/deck.js"></script>');
  const result = await preflight(path);

  assert.equal(result.ok, false);
  assert.equal(result.errors[0].code, 'EXTERNAL_SCRIPT_SOURCE');
  assert.deepEqual(result.script_sources, ['https://cdn.example.test/deck.js']);
});

test('rejects anonymous files larger than 1,000,000 bytes', async () => {
  const path = await fixture('deck.html', 'x'.repeat(1_000_001));
  const result = await preflight(path);

  assert.equal(result.ok, false);
  assert.equal(result.errors[0].code, 'ANONYMOUS_SIZE_LIMIT');
  assert.equal(result.size_bytes, 1_000_001);
});

test('records but does not guess an account plan size limit in owned mode', async () => {
  const path = await fixture('deck.html', 'x'.repeat(1_000_001));
  const result = await preflight(path, { mode: 'owned' });

  assert.equal(result.ok, true);
  assert.equal(result.mode, 'owned');
  assert.equal(result.limit_bytes, null);
});
