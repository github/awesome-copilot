#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import { extname } from 'node:path';
import { pathToFileURL } from 'node:url';

const ANONYMOUS_MAX_BYTES = 1_000_000;
const ALLOWED_EXTENSIONS = new Set(['.html', '.htm']);

function findScriptSources(html) {
  const sources = [];
  const pattern = /<script\b[^>]*\bsrc\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi;
  let match;

  while ((match = pattern.exec(html)) !== null) {
    sources.push(match[1] ?? match[2] ?? match[3] ?? '');
  }

  return [...new Set(sources)];
}

export async function preflight(inputPath, options = {}) {
  if (!inputPath) {
    return {
      ok: false,
      errors: [{ code: 'PATH_REQUIRED', message: 'Pass one HTML deck path.' }],
    };
  }

  let fileStat;
  let bytes;

  try {
    fileStat = await stat(inputPath);
  } catch (error) {
    return {
      ok: false,
      input: inputPath,
      errors: [{ code: 'FILE_NOT_FOUND', message: error.message }],
    };
  }

  if (!fileStat.isFile()) {
    return {
      ok: false,
      input: inputPath,
      errors: [{ code: 'NOT_A_FILE', message: 'The input must be one regular file.' }],
    };
  }

  bytes = await readFile(inputPath);

  const extension = extname(inputPath).toLowerCase();
  const scriptSources = findScriptSources(bytes.toString('utf8'));
  const errors = [];

  if (!ALLOWED_EXTENSIONS.has(extension)) {
    errors.push({ code: 'UNSUPPORTED_EXTENSION', message: 'Use a .html or .htm file.' });
  }
  const mode = options.mode === 'owned' ? 'owned' : 'anonymous';
  if (mode === 'anonymous' && fileStat.size > ANONYMOUS_MAX_BYTES) {
    errors.push({
      code: 'ANONYMOUS_SIZE_LIMIT',
      message: `Anonymous single-file publishing is limited to ${ANONYMOUS_MAX_BYTES} bytes.`,
    });
  }
  if (scriptSources.length > 0) {
    errors.push({
      code: 'EXTERNAL_SCRIPT_SOURCE',
      message: 'Anonymous single-file decks must not contain <script src=...>; bundle runtime code.',
      sources: scriptSources,
    });
  }

  return {
    ok: errors.length === 0,
    input: inputPath,
    size_bytes: fileStat.size,
    sha256: createHash('sha256').update(bytes).digest('hex'),
    script_sources: scriptSources,
    mode,
    limit_bytes: mode === 'anonymous' ? ANONYMOUS_MAX_BYTES : null,
    errors,
  };
}

async function main() {
  const modeIndex = process.argv.indexOf('--mode');
  const requestedMode = modeIndex === -1 ? undefined : process.argv[modeIndex + 1];
  if (requestedMode !== undefined && requestedMode !== 'anonymous' && requestedMode !== 'owned') {
    process.stdout.write(
      `${JSON.stringify({
        ok: false,
        errors: [
          {
            code: 'INVALID_MODE',
            message: 'Use --mode anonymous or --mode owned.',
          },
        ],
      })}\n`,
    );
    process.exitCode = 1;
    return;
  }

  const result = await preflight(process.argv[2], { mode: requestedMode });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (!result.ok) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
