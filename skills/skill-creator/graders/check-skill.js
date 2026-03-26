import { readFileSync } from 'node:fs';

let skill = '';
try {
  skill = readFileSync('draft/SKILL.md', 'utf8');
} catch (error) {
  console.log(JSON.stringify({
    status: 'failure',
    reason: 'missing input file',
    file: 'draft/SKILL.md',
    details: error instanceof Error ? error.message : String(error),
    score: 0,
    checks: [
      { name: 'input-file', passed: false, message: 'Missing or unreadable draft/SKILL.md' },
    ],
  }));
  process.exit(0);
}

const checks = [];
let passed = 0;

function addCheck(name, condition, message) {
  checks.push({ name, passed: condition, message: condition ? 'OK' : message });
  if (condition) passed += 1;
}

const frontmatterMatch = skill.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
const frontmatter = frontmatterMatch?.[1] ?? '';

addCheck('frontmatter', Boolean(frontmatterMatch), 'Missing YAML frontmatter at the top of the file');
addCheck('name', /^name:\s*\S.+$/m.test(frontmatter), 'name missing');
addCheck('description', /^description:\s*\S.+$/m.test(frontmatter), 'description missing');
addCheck('usage', /## When to Use This Skill/.test(skill), 'Missing usage section');
addCheck('error-handling', /## Error Handling/.test(skill), 'Missing error handling section');

const score = (passed / checks.length).toFixed(2);
console.log(JSON.stringify({
  score: Number(score),
  details: `${passed}/${checks.length} checks passed`,
  checks,
}));
