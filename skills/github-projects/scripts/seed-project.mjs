#!/usr/bin/env node
/**
 * Seed a GitHub Project (v2) for a release cycle — reference pattern.
 *
 * Idempotent: addProjectV2ItemById returns the existing item on re-add,
 * and field stamps are upserts — safe to re-run every cycle.
 *
 * Usage:
 *   node scripts/seed-project.mjs vX.Y.Z
 *   PROJECT_OWNER=myorg PROJECT_NUMBER=3 node scripts/seed-project.mjs vX.Y.Z
 *
 * Requires gh CLI authenticated with the `project` scope
 * (gh auth refresh -s project).
 *
 * Per-cycle edit: bump the ISSUE_MAP below (and add the new Release
 * option + any new grouping options to the project fields FIRST —
 * updateProjectV2Field replaces the full option list, so merge).
 */
import { execFileSync } from 'node:child_process';

const OWNER = process.env.PROJECT_OWNER ?? 'ORG_NAME';
const PROJECT_NUMBER = Number(process.env.PROJECT_NUMBER ?? 1);
const REPO = process.env.SEED_REPO ?? 'ORG_NAME/REPO_NAME';
const RELEASE = process.argv[2] ?? 'vX.Y.Z';

/** issue number → grouping-field option name ('' = leave unstamped) */
const ISSUE_MAP = {
  // 18: 'Growth/SEO',
  // 19: 'Security',
};

const GROUPING_FIELD = 'Workstream'; // rename to your grouping field
const DEFAULT_STATUS = 'Todo';
// ──────────────────────────────────────────────────────────────────────

const gh = (args, { optionalJson = false } = {}) => {
  const out = execFileSync('gh', args, {
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024,
  });
  if (!out.trim()) {
    if (optionalJson) return null;
    throw new Error(`gh ${args.join(' ')} returned empty output`);
  }
  return JSON.parse(out);
};

const fail = (msg) => {
  console.error(`✗ ${msg}`);
  process.exit(1);
};

// 1. Resolve project + fields dynamically (never hardcode option IDs)
const project = gh([
  'project', 'view', String(PROJECT_NUMBER),
  '--owner', OWNER, '--format', 'json',
]);
const projectId = project.id;
console.log(`project #${PROJECT_NUMBER} → ${projectId} (${project.url})`);

const fields = gh([
  'project', 'field-list', String(PROJECT_NUMBER),
  '--owner', OWNER, '--format', 'json',
]).fields;

const fieldId = (name) => {
  const f = fields.find((x) => x.name === name);
  if (!f) fail(`field "${name}" not found. Have: ${fields.map((x) => x.name).join(', ')}`);
  return f.id;
};
const optionId = (fieldName, optionName) => {
  const f = fields.find((x) => x.name === fieldName);
  const o = f?.options?.find((x) => x.name === optionName);
  if (!o) fail(`option "${optionName}" not on field "${fieldName}" — add it first (updateProjectV2Field REPLACES the option list; merge).`);
  return o.id;
};

const releaseField = fieldId('Release');
const statusField = fieldId('Status');
const autoStatus = fields.some((x) => x.name === 'Status');
if (!releaseField || !autoStatus) fail('Release and Status fields must exist on the project first.');

// 2. Add + stamp issues
for (const [num, group] of Object.entries(ISSUE_MAP)) {
  const url = `https://github.com/${REPO}/issues/${num}`;
  const item = gh([
    'project', 'item-add', String(PROJECT_NUMBER),
    '--owner', OWNER, '--url', url, '--format', 'json',
  ]);
  const itemId = item.id;

  gh([
    'project', 'item-edit', '--project-id', projectId, '--id', itemId,
    '--field-id', releaseField,
    '--single-select-option-id', optionId('Release', RELEASE),
  ], { optionalJson: true });
  gh([
    'project', 'item-edit', '--project-id', projectId, '--id', itemId,
    '--field-id', statusField,
    '--single-select-option-id', optionId('Status', DEFAULT_STATUS),
  ], { optionalJson: true });
  if (group) {
    gh([
      'project', 'item-edit', '--project-id', projectId, '--id', itemId,
      '--field-id', fieldId(GROUPING_FIELD),
      '--single-select-option-id', optionId(GROUPING_FIELD, group),
    ], { optionalJson: true });
  }
  console.log(`✓ #${num} → ${RELEASE}${group ? ` · ${group}` : ''}`);
}

console.log(`\nDone: ${Object.keys(ISSUE_MAP).length} items seeded into ${project.url}`);
console.log('One-time manual UI steps (API is read-only for these):');
console.log('  - Workflows: Auto-add issues; Item added → Status=Todo');
console.log('  - Board view: group by Status, filter Release=vX; Backlog view: group by grouping field');
