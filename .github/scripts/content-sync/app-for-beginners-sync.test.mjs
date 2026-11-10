import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  DOCS_DIR, IMAGES_DIR, adaptMarkdown, approvedPages, planImport,
} from './app-for-beginners-sync.mjs';

const sha = 'a'.repeat(40);
const nextSha = 'b'.repeat(40);
const date = '2026-10-04';
const directories = [
  '00-setup', '01-tour-the-app', '02-sessions-worktrees-context', '03-development-workflows',
  '04-skills-custom-agents', '05-mcp-plugins', '06-canvases', '07-automations',
];

function fixture() {
  const source = new Map([
    ['README.md', Buffer.from('# GitHub Copilot app for Beginners\n\n[Start](00-setup/)\n')],
    ['LICENSE', Buffer.from('MIT License\nCopyright GitHub, Inc.\n')],
    ['assets/assignment.webp', Buffer.from([0, 1, 2, 255])],
    ['GLOSSARY.md', Buffer.from('## Worktree\n')],
    ['samples/book-app-web/README.md', Buffer.from('# Sample\n')],
    ['.github/scripts/setup-training-scenarios.js', Buffer.from('// source only\n')],
  ]);
  for (const directory of directories) {
    source.set(`${directory}/README.md`, Buffer.from(
      '![Assignment](../assets/assignment.webp)\n\n[Home](../README.md)\n',
    ));
  }
  return source;
}

function plan(source, local = new Map(), commit = sha, importDate = date) {
  return planImport({
    sha: commit, date: importDate, paths: new Set(source.keys()),
    readSource: async (filename) => {
      assert.ok(source.has(filename), `Missing source: ${filename}`);
      return source.get(filename);
    },
    readLocal: async (filename) => local.get(filename),
  });
}

function applyToMap(result, previous = new Map()) {
  const local = new Map(previous);
  for (const filename of result.changed) {
    if (result.outputs.has(filename)) local.set(filename, result.outputs.get(filename));
    else local.delete(filename);
  }
  return local;
}

test('imports only nine pages and referenced binary assets; repeat and unrelated commits are noops', async () => {
  const source = fixture();
  const initial = await plan(source);
  assert.equal(initial.pages, 9);
  assert.equal(initial.assets, 1);
  assert.deepEqual(initial.outputs.get(`${IMAGES_DIR}/overview/assignment.webp`), source.get('assets/assignment.webp'));
  assert.ok(![...initial.outputs.keys()].some((filename) => filename.includes('samples/')));
  const local = applyToMap(initial);
  assert.deepEqual((await plan(source, local, sha, '2026-10-05')).changed, []);
  source.set('samples/book-app-web/src/App.tsx', Buffer.from('// unrelated\n'));
  assert.deepEqual((await plan(source, local, nextSha)).changed, []);
  assert.equal(JSON.parse(local.get(`${DOCS_DIR}/source.json`)).sourceCommit, sha);
});

test('cache loss and pending PR do not advance the main baseline or miss older changes', async () => {
  const source = fixture();
  const main = applyToMap(await plan(source));
  source.set('00-setup/README.md', Buffer.from('A visible typo fix.\n'));
  const pendingPlan = await plan(source, main, nextSha, '2026-11-04');
  assert.equal(pendingPlan.baseline, sha);
  assert.ok(pendingPlan.changed.includes(`${DOCS_DIR}/00-setup.md`));
  const pending = applyToMap(pendingPlan, main);
  assert.deepEqual((await plan(source, pending, nextSha)).changed, []);
  assert.equal(JSON.parse(main.get(`${DOCS_DIR}/source.json`)).sourceCommit, sha);
  assert.ok((await plan(source, main, nextSha)).changed.length > 0);
  source.set('01-tour-the-app/README.md', Buffer.from('A later change while the PR is open.\n'));
  assert.ok((await plan(source, pending, 'c'.repeat(40))).changed.includes(`${DOCS_DIR}/01-tour-the-app.md`));
});

test('asset-only updates change bytes and the dates of pages that use them', async () => {
  const source = fixture();
  const local = applyToMap(await plan(source));
  source.set('assets/assignment.webp', Buffer.from([0, 3, 4, 255]));
  const result = await plan(source, local, nextSha, '2026-10-05');
  assert.ok(result.changed.includes(`${IMAGES_DIR}/overview/assignment.webp`));
  assert.match(result.outputs.get(`${DOCS_DIR}/06-canvases.md`).toString(), /lastUpdated: 2026-10-05/);
});

test('renames keep chapter routes stable; deletions prune only manifest-owned files; additions stay upstream', async () => {
  const source = fixture();
  const local = applyToMap(await plan(source));
  source.set('01-renamed/README.md', source.get('01-tour-the-app/README.md'));
  source.delete('01-tour-the-app/README.md');
  source.delete('07-automations/README.md');
  source.set('08-extra/README.md', Buffer.from('New out-of-scope chapter\n'));
  const result = await plan(source, local, nextSha);
  assert.equal(result.pages, 8);
  assert.ok(result.outputs.has(`${DOCS_DIR}/01-tour-the-app.md`));
  assert.ok(result.deleted.includes(`${DOCS_DIR}/07-automations.md`));
  assert.ok(!result.outputs.has(`${DOCS_DIR}/08-extra.md`));
  assert.throws(() => approvedPages(new Set(['00-a/README.md', '00-b/README.md'])), /Ambiguous/);
});

test('rewrites links and images without changing prose, code, prompts, or inline sample paths', () => {
  const paths = new Set(fixture().keys());
  const pages = approvedPages(paths);
  const markdown = [
    '[Chapter](../00-setup/README.md#seed-the-repository)',
    '[Glossary](../GLOSSARY.md#worktree)',
    '[`setup` script](../.github/scripts/setup-training-scenarios.js)',
    '[Sample](../samples/book-app-web/)',
    '[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](../LICENSE)',
    '[home]: ../README.md',
    '<img src="../assets/assignment.webp" alt="Assignment" width="800" />',
    '<details>\n<summary>Optional</summary>\n\n## Nested heading\n\n</details>',
    '> [!NOTE]\n> Keep this note.',
    'Use `samples/book-app-web` and `@samples/book-app-web`.',
    '```text\n[do not rewrite](../README.md)\ncd samples/book-app-web\n```',
  ].join('\n');
  const { body } = adaptMarkdown(markdown, '06-canvases/README.md', pages, paths);
  assert.match(body, /\/learning-hub\/app-for-beginners\/00-setup\/#seed-the-repository/);
  assert.match(body, /\/blob\/main\/GLOSSARY.md#worktree/);
  assert.match(body, /\/blob\/main\/.github\/scripts\/setup-training-scenarios.js/);
  assert.match(body, /\/tree\/main\/samples\/book-app-web/);
  assert.match(body, /\]\(https:\/\/github.com\/github\/copilot-app-for-beginners\/blob\/main\/LICENSE\)/);
  assert.match(body, /\[home\]: \/learning-hub\/app-for-beginners\//);
  assert.match(body, /\/images\/learning-hub\/copilot-app-for-beginners\/overview\/assignment.webp/);
  for (const unchanged of [
    '<details>\n<summary>Optional</summary>\n\n## Nested heading\n\n</details>',
    '> [!NOTE]\n> Keep this note.',
    'Use `samples/book-app-web` and `@samples/book-app-web`.',
    '```text\n[do not rewrite](../README.md)\ncd samples/book-app-web\n```',
  ]) assert.ok(body.includes(unchanged));
});

test('source failures, invalid commits, missing links and unsafe deletions remain errors', async () => {
  const source = fixture();
  await assert.rejects(plan(source, new Map(), 'main'), /full source commit/);
  const local = applyToMap(await plan(source));
  source.set('README.md', Buffer.from('[Broken](missing.md)\n'));
  await assert.rejects(plan(source, local), /Missing source link/);
  source.set('README.md', Buffer.from('[Outside](../../other)\n'));
  await assert.rejects(plan(source, local), /leaves the repository/);
  const valid = fixture();
  const manifest = JSON.parse(local.get(`${DOCS_DIR}/source.json`));
  manifest.files.push({ local: 'CODEOWNERS' });
  local.set(`${DOCS_DIR}/source.json`, Buffer.from(JSON.stringify(manifest)));
  await assert.rejects(plan(valid, local), /Unsafe deletion/);
});
