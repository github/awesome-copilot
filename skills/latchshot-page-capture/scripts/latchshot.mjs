#!/usr/bin/env node

import { randomBytes } from 'node:crypto';
import { access, mkdir, open, rename, rm, stat } from 'node:fs/promises';
import { constants as fsConstants } from 'node:fs';
import { basename, dirname, extname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const ORIGIN = 'https://latchshot.fly.dev';
const CAPTURE_URL = `${ORIGIN}/v1/render`;
const DEMO_URL = `${ORIGIN}/api/demo`;
const USAGE_URL = `${ORIGIN}/v1/usage`;
const USER_AGENT = 'latchshot-agent-skill/1.1';
const MAX_ARTIFACT_BYTES = 50 * 1024 * 1024;
const MAX_JSON_BYTES = 1024 * 1024;

const FORMAT_BY_EXTENSION = new Map([
  ['.png', 'png'],
  ['.jpg', 'jpeg'],
  ['.jpeg', 'jpeg'],
  ['.pdf', 'pdf'],
]);

const CONTENT_TYPE_BY_FORMAT = {
  png: 'image/png',
  jpeg: 'image/jpeg',
  pdf: 'application/pdf',
};

const booleanFlags = new Set([
  'allow-query',
  'block-ads',
  'block-chats',
  'block-trackers',
  'dark',
  'force',
  'full-page',
  'hide-cookie-banners',
  'hide-popups',
  'landscape',
  'scroll-page',
]);

const valueFlags = new Set([
  'delay-ms',
  'format',
  'height',
  'output',
  'paper',
  'quality',
  'scale',
  'timeout-ms',
  'url',
  'wait-until',
  'width',
]);

class CliError extends Error {
  constructor(message, code = 'invalid_arguments', exitCode = 2) {
    super(message);
    this.name = 'CliError';
    this.code = code;
    this.exitCode = exitCode;
  }
}

function help() {
  return `Usage:
  node scripts/latchshot.mjs capture --url URL --output FILE [OPTIONS]
  node scripts/latchshot.mjs demo --url URL --output FILE [OPTIONS]
  node scripts/latchshot.mjs usage

Capture one public HTTP(S) webpage as a validated local artifact. The demo
command needs no key and returns JPEG only, limited to 3 attempts per IP/hour.
Capture and usage read LATCHSHOT_API_KEY; keys are never accepted as arguments.

Demo options:
  --width 320..2560           Viewport width (default: 1440)
  --height 240..1440          Viewport height (default: 900)
  --allow-query               Confirm a query string contains no secret
  --force                     Replace an existing output file atomically

Capture options:
  --format png|jpeg|pdf       Infer from output extension when omitted
  --width 320..2560           Viewport width (default: 1440)
  --height 240..1440          Viewport height (default: 900)
  --scale 1|2                 Device scale factor (default: 1)
  --quality 1..100            JPEG only (default: 85)
  --full-page                 Capture bounded full page (screenshots only)
  --scroll-page               Bounded lazy-content scroll; requires --full-page
  --wait-until load|domcontentloaded|networkidle
  --delay-ms 0..3000          Additional post-load wait
  --timeout-ms 3000..30000    Navigation timeout
  --dark                      Prefer dark color scheme
  --block-ads                 Best-effort known ad-host blocking
  --block-trackers            Best-effort known tracker-host blocking
  --block-chats               Best-effort known chat-host blocking
  --hide-cookie-banners       Hide common consent overlays without clicking
  --hide-popups               Hide common signup/newsletter/discount overlays
  --paper A4|Letter|Legal     PDF only (default: A4)
  --landscape                 PDF only
  --allow-query               Confirm a query string contains no secret
  --force                     Replace an existing output file atomically
  --help                      Show this help

Examples:
  node scripts/latchshot.mjs demo --url https://example.com --output demo.jpg
  node scripts/latchshot.mjs capture --url https://example.com --output page.png
  node scripts/latchshot.mjs capture --url https://example.com --output page.pdf --paper A4
  node scripts/latchshot.mjs usage

Exit codes: 0 success, 2 invalid input, 3 missing key, 4 API/network failure,
5 invalid artifact or filesystem failure.`;
}

function parseFlags(tokens) {
  const flags = new Map();
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (!token.startsWith('--')) {
      throw new CliError(`unexpected argument: ${token}`);
    }

    const separator = token.indexOf('=');
    const name = token.slice(2, separator === -1 ? undefined : separator);
    if (flags.has(name)) throw new CliError(`duplicate option: --${name}`);

    if (name === 'help') {
      flags.set(name, true);
      continue;
    }
    if (booleanFlags.has(name)) {
      if (separator !== -1) throw new CliError(`--${name} does not accept a value`);
      flags.set(name, true);
      continue;
    }
    if (!valueFlags.has(name)) throw new CliError(`unknown option: --${name}`);

    const value = separator === -1 ? tokens[++index] : token.slice(separator + 1);
    if (value === undefined || value.startsWith('--') || value === '') {
      throw new CliError(`--${name} requires a value`);
    }
    flags.set(name, value);
  }
  return flags;
}

function integerFlag(flags, name, fallback, minimum, maximum) {
  const raw = flags.get(name);
  const value = raw === undefined ? fallback : Number(raw);
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw new CliError(`--${name} must be an integer from ${minimum} to ${maximum}`);
  }
  return value;
}

function choiceFlag(flags, name, fallback, allowed) {
  const value = flags.get(name) ?? fallback;
  if (!allowed.includes(value)) {
    throw new CliError(`--${name} must be one of: ${allowed.join(', ')}`);
  }
  return value;
}

function targetUrl(raw, allowQuery) {
  if (!raw) throw new CliError('--url is required');
  let target;
  try {
    target = new URL(raw);
  } catch {
    throw new CliError('--url must be a valid absolute HTTP or HTTPS URL', 'invalid_target');
  }
  if (!['http:', 'https:'].includes(target.protocol)) {
    throw new CliError('--url must use http or https', 'invalid_target');
  }
  if (target.username || target.password) {
    throw new CliError('--url must not contain credentials', 'invalid_target');
  }
  if (target.port && !['80', '443'].includes(target.port)) {
    throw new CliError('--url may use only web ports 80 or 443', 'invalid_target');
  }
  if (target.search && !allowQuery) {
    throw new CliError('--url has a query string; verify it contains no secret, then pass --allow-query', 'query_confirmation_required');
  }
  if (target.hash) {
    throw new CliError('--url must not contain a fragment', 'invalid_target');
  }
  return target.href;
}

function apiKey(env) {
  const key = env.LATCHSHOT_API_KEY;
  if (!key || typeof key !== 'string' || /\s/.test(key)) {
    throw new CliError('set LATCHSHOT_API_KEY to a Latchshot key; do not pass it as an argument', 'missing_api_key', 3);
  }
  return key;
}

function outputContract(flags) {
  const raw = flags.get('output');
  if (!raw || raw === '-') throw new CliError('--output is required and must be a file path');
  const output = resolve(raw);
  const inferred = FORMAT_BY_EXTENSION.get(extname(output).toLowerCase());
  if (!inferred) throw new CliError('--output must end in .png, .jpg, .jpeg, or .pdf');
  const format = choiceFlag(flags, 'format', inferred, ['png', 'jpeg', 'pdf']);
  if (format !== inferred) {
    throw new CliError(`--format ${format} does not match output file ${basename(output)}`);
  }
  return { output, format };
}

function capturePayload(flags) {
  const { output, format } = outputContract(flags);
  const fullPage = flags.has('full-page');
  const scrollPage = flags.has('scroll-page');
  if (scrollPage && !fullPage) throw new CliError('--scroll-page requires --full-page');
  if (format === 'pdf' && (fullPage || scrollPage)) {
    throw new CliError('--full-page and --scroll-page are screenshot options, not PDF options');
  }
  if (flags.has('quality') && format !== 'jpeg') {
    throw new CliError('--quality is supported only for JPEG output');
  }
  if (format !== 'pdf' && (flags.has('paper') || flags.has('landscape'))) {
    throw new CliError('--paper and --landscape are supported only for PDF output');
  }

  const payload = {
    url: targetUrl(flags.get('url'), flags.has('allow-query')),
    format,
    width: integerFlag(flags, 'width', 1440, 320, 2560),
    height: integerFlag(flags, 'height', 900, 240, 1440),
    scale: integerFlag(flags, 'scale', 1, 1, 2),
    fullPage,
    scrollPage,
    waitUntil: choiceFlag(flags, 'wait-until', 'domcontentloaded', ['load', 'domcontentloaded', 'networkidle']),
    delayMs: integerFlag(flags, 'delay-ms', 0, 0, 3000),
    timeoutMs: integerFlag(flags, 'timeout-ms', 15000, 3000, 30000),
    darkMode: flags.has('dark'),
    blockAds: flags.has('block-ads'),
    blockTrackers: flags.has('block-trackers'),
    blockChats: flags.has('block-chats'),
    hideCookieBanners: flags.has('hide-cookie-banners'),
    hidePopups: flags.has('hide-popups'),
  };

  if (format === 'jpeg') payload.quality = integerFlag(flags, 'quality', 85, 1, 100);
  if (format === 'pdf') {
    payload.paper = choiceFlag(flags, 'paper', 'A4', ['A4', 'Letter', 'Legal']);
    payload.landscape = flags.has('landscape');
  }
  return { output, format, payload, force: flags.has('force') };
}

function demoPayload(flags) {
  const allowed = new Set(['allow-query', 'force', 'height', 'output', 'url', 'width']);
  for (const name of flags.keys()) {
    if (!allowed.has(name)) throw new CliError(`demo does not accept --${name}`);
  }
  const { output, format } = outputContract(flags);
  if (format !== 'jpeg') throw new CliError('demo output must end in .jpg or .jpeg');
  return {
    output,
    format,
    payload: {
      url: targetUrl(flags.get('url'), flags.has('allow-query')),
      width: integerFlag(flags, 'width', 1440, 320, 2560),
      height: integerFlag(flags, 'height', 900, 240, 1440),
    },
    force: flags.has('force'),
  };
}

async function readBounded(response, maximum) {
  const declared = Number(response.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > maximum) {
    throw new CliError(`response exceeds ${maximum} bytes`, 'response_too_large', 5);
  }
  if (!response.body) return Buffer.alloc(0);

  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maximum) {
      await reader.cancel();
      throw new CliError(`response exceeds ${maximum} bytes`, 'response_too_large', 5);
    }
    chunks.push(Buffer.from(value));
  }
  return Buffer.concat(chunks, total);
}

function redact(value) {
  return String(value || '')
    .replace(/ls_live_[A-Za-z0-9_-]+/g, '[redacted-key]')
    .replace(/https?:\/\/[^\s"']+/g, '[redacted-url]')
    .replace(/[\r\n]+/g, ' ')
    .slice(0, 500);
}

function apiFailure(status, body) {
  let code = `http_${status}`;
  let message = `Latchshot returned HTTP ${status}`;
  try {
    const parsed = JSON.parse(body.toString('utf8'));
    code = redact(parsed?.error?.code || code);
    message = redact(parsed?.error?.message || message);
  } catch {
    const text = redact(body.toString('utf8'));
    if (text) message = text;
  }
  throw new CliError(message, code, 4);
}

function validateArtifact(format, contentType, body) {
  const expected = CONTENT_TYPE_BY_FORMAT[format];
  if (contentType !== expected) {
    throw new CliError(`expected ${expected} but received ${contentType || 'no content type'}`, 'invalid_content_type', 5);
  }
  const valid = format === 'png'
    ? body.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'))
    : format === 'jpeg'
      ? body.length >= 4 && body[0] === 0xff && body[1] === 0xd8 && body[2] === 0xff
      : body.subarray(0, 5).equals(Buffer.from('%PDF-'));
  if (!valid) throw new CliError(`response body is not a valid ${format} artifact`, 'invalid_artifact', 5);
}

async function exists(path) {
  try {
    await access(path, fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function writeAtomic(output, body, force) {
  if (!force && await exists(output)) {
    throw new CliError(`output already exists: ${output}; choose another path or pass --force`, 'output_exists', 5);
  }
  await mkdir(dirname(output), { recursive: true });
  const temporary = `${output}.latchshot-${process.pid}-${randomBytes(6).toString('hex')}.tmp`;
  let handle;
  try {
    handle = await open(temporary, 'wx', 0o600);
    await handle.writeFile(body);
    await handle.sync();
    await handle.close();
    handle = null;
    await rename(temporary, output);
  } catch (error) {
    if (handle) await handle.close().catch(() => {});
    await rm(temporary, { force: true }).catch(() => {});
    if (error instanceof CliError) throw error;
    throw new CliError(`could not write output: ${redact(error.message)}`, 'output_failed', 5);
  }
}

function numericHeader(headers, name) {
  const value = headers.get(name);
  if (value === null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

async function capture(flags, env, fetchImpl) {
  const key = apiKey(env);
  const { output, format, payload, force } = capturePayload(flags);
  if (!force && await exists(output)) {
    throw new CliError(`output already exists: ${output}; choose another path or pass --force`, 'output_exists', 5);
  }
  let response;
  try {
    response = await fetchImpl(CAPTURE_URL, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${key}`,
        'content-type': 'application/json',
        'user-agent': USER_AGENT,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(payload.timeoutMs + 15000),
    });
  } catch (error) {
    throw new CliError(`request failed: ${redact(error.message)}`, 'request_failed', 4);
  }

  const body = await readBounded(response, response.ok ? MAX_ARTIFACT_BYTES : MAX_JSON_BYTES);
  if (!response.ok) apiFailure(response.status, body);
  const contentType = (response.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
  validateArtifact(format, contentType, body);
  await writeAtomic(output, body, force);
  const file = await stat(output);

  return {
    ok: true,
    operation: 'capture',
    output,
    format,
    contentType,
    bytes: file.size,
    render: {
      durationMs: numericHeader(response.headers, 'x-latchshot-render-ms'),
      navigation: response.headers.get('x-latchshot-navigation'),
      fonts: response.headers.get('x-latchshot-fonts'),
      scripts: response.headers.get('x-latchshot-scripts'),
      scroll: response.headers.get('x-latchshot-scroll'),
    },
    quota: {
      limit: numericHeader(response.headers, 'x-quota-limit'),
      remaining: numericHeader(response.headers, 'x-quota-remaining'),
      resetAt: response.headers.get('x-quota-reset'),
    },
  };
}

async function demo(flags, fetchImpl) {
  const { output, format, payload, force } = demoPayload(flags);
  if (!force && await exists(output)) {
    throw new CliError(`output already exists: ${output}; choose another path or pass --force`, 'output_exists', 5);
  }
  let response;
  try {
    response = await fetchImpl(DEMO_URL, {
      method: 'POST',
      headers: {
        accept: 'image/jpeg',
        'content-type': 'application/json',
        'user-agent': USER_AGENT,
        'x-latchshot-acquisition': 'agentskill',
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(30000),
    });
  } catch (error) {
    throw new CliError(`request failed: ${redact(error.message)}`, 'request_failed', 4);
  }

  const body = await readBounded(response, response.ok ? MAX_ARTIFACT_BYTES : MAX_JSON_BYTES);
  if (!response.ok) apiFailure(response.status, body);
  const contentType = (response.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
  validateArtifact(format, contentType, body);
  await writeAtomic(output, body, force);
  const file = await stat(output);

  return {
    ok: true,
    operation: 'demo',
    output,
    format,
    contentType,
    bytes: file.size,
    render: {
      durationMs: numericHeader(response.headers, 'x-latchshot-render-ms'),
      navigation: response.headers.get('x-latchshot-navigation'),
      fonts: response.headers.get('x-latchshot-fonts'),
      scripts: response.headers.get('x-latchshot-scripts'),
    },
    demo: {
      authenticationRequired: false,
      attemptsPerIpPerHour: 3,
    },
  };
}

async function usage(env, fetchImpl) {
  const key = apiKey(env);
  let response;
  try {
    response = await fetchImpl(USAGE_URL, {
      headers: {
        authorization: `Bearer ${key}`,
        accept: 'application/json',
        'user-agent': USER_AGENT,
      },
      signal: AbortSignal.timeout(15000),
    });
  } catch (error) {
    throw new CliError(`request failed: ${redact(error.message)}`, 'request_failed', 4);
  }
  const body = await readBounded(response, MAX_JSON_BYTES);
  if (!response.ok) apiFailure(response.status, body);
  try {
    return { ok: true, operation: 'usage', usage: JSON.parse(body.toString('utf8')) };
  } catch {
    throw new CliError('usage response was not valid JSON', 'invalid_usage_response', 5);
  }
}

export async function run(argv, options = {}) {
  const env = options.env || process.env;
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  const stdout = options.stdout || ((line) => console.log(line));
  const stderr = options.stderr || ((line) => console.error(line));

  try {
    if (argv.length === 0 || argv.includes('--help')) {
      stdout(help());
      return 0;
    }
    const [command, ...tokens] = argv;
    const flags = parseFlags(tokens);
    if (flags.has('help')) {
      stdout(help());
      return 0;
    }
    let result;
    if (command === 'capture') result = await capture(flags, env, fetchImpl);
    else if (command === 'demo') result = await demo(flags, fetchImpl);
    else if (command === 'usage') {
      if (flags.size > 0) throw new CliError('usage does not accept options');
      result = await usage(env, fetchImpl);
    } else {
      throw new CliError(`command must be capture, demo, or usage; received: ${command}`);
    }
    stdout(JSON.stringify(result));
    return 0;
  } catch (error) {
    const safe = error instanceof CliError
      ? error
      : new CliError(redact(error.message), 'unexpected_error', 5);
    stderr(JSON.stringify({ ok: false, error: { code: safe.code, message: redact(safe.message) } }));
    return safe.exitCode;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  process.exitCode = await run(process.argv.slice(2));
}
