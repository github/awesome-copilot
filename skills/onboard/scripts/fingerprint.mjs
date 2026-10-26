#!/usr/bin/env node
// Print a read-only material fingerprint. No file contents are read or written.
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, lstatSync, readdirSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const root = resolve(process.argv[2] || '.');
const expected = process.argv[3];
if (!existsSync(root) || !lstatSync(root).isDirectory()) {
  console.error(`Directory not found: ${root}`);
  process.exit(2);
}

const omitted = new Set(['.git', '项目拆解包', 'node_modules', '.venv', 'venv', 'dist', 'build', 'coverage', '__pycache__']);
const secretName = /^(?:\.env(?:\..*)?|.*\.(?:pem|key|p12|pfx)|id_(?:rsa|ed25519)(?:\.pub)?)$/i;
const hash = createHash('sha256');
let files = 0;
let bytes = 0;
let mode = 'files';
let head = '';

function include(path) {
  const parts = path.replaceAll('\\', '/').split('/');
  return !parts.some(part => {
    if (/^\.env\.(?:example|sample|template)$/i.test(part)) return false;
    return omitted.has(part) || secretName.test(part);
  });
}

function add(path) {
  if (!include(path)) return;
  const full = join(root, path);
  let info;
  try { info = lstatSync(full); } catch { return; }
  if (!info.isFile()) return;
  files++;
  bytes += info.size;
  hash.update(`${path.replaceAll('\\', '/')}\0${info.size}\0${info.mtimeMs}\n`);
}

function git(args) {
  return execFileSync('git', ['-C', root, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
}

let isRepo = false;
try { isRepo = resolve(git(['rev-parse', '--show-toplevel'])) === root; } catch { /* ordinary folder */ }

if (isRepo) {
  mode = 'git';
  head = git(['rev-parse', 'HEAD']);
  hash.update(`HEAD\0${head}\n`);
  const status = execFileSync('git', ['-C', root, 'status', '--porcelain=v1', '-z', '--untracked-files=all'], { encoding: 'utf8' });
  const entries = status.split('\0').filter(Boolean);
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const path = entry.slice(3);
    const renamed = entry[0] === 'R' || entry[1] === 'R' || entry[0] === 'C' || entry[1] === 'C';
    const original = renamed ? entries[++i] : '';
    if (!include(path) || (original && !include(original))) continue;
    hash.update(`${entry.slice(0, 2)}\0${path}\0${original}\n`);
    add(path);
  }
} else {
  function walk(dir) {
    for (const item of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, item.name);
      const path = relative(root, full);
      if (!include(path) || item.isSymbolicLink()) continue;
      if (item.isDirectory()) walk(full);
      else if (item.isFile()) add(path);
    }
  }
  walk(root);
}

const fingerprint = hash.digest('hex');
console.log(`fingerprint: ${fingerprint}`);
console.log(`mode: ${mode}${head ? `; HEAD: ${head}` : ''}`);
console.log(`changed files: ${files}; changed bytes: ${bytes}`);
if (expected) {
  const match = expected === fingerprint;
  console.log(`comparison: ${match ? 'same' : 'changed'}`);
  if (!match) process.exitCode = 1;
}
