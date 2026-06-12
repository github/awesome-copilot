#!/usr/bin/env node
/**
 * axe-audit.mjs — run axe-core against a live URL and emit JSON + a readable summary.
 *
 * Why this exists: every accessibility audit otherwise re-writes the same
 * "launch a browser, inject axe, collect violations" boilerplate. This bundles it
 * once so the skill can get machine-detectable findings in a single command.
 *
 * Usage:
 *   node axe-audit.mjs <url> [--tags wcag2a,wcag2aa,wcag22aa] [--json report.json] [--full]
 *
 * Examples:
 *   node axe-audit.mjs http://localhost:3000
 *   node axe-audit.mjs https://example.com --tags wcag2a,wcag2aa,wcag22aa --json a11y.json
 *
 * Requires Playwright + axe-core. If they are not installed, run:
 *   npm i -D playwright @axe-core/playwright && npx playwright install chromium
 *
 * Exit code is the number of violations (capped at 250), so it can gate CI:
 *   node axe-audit.mjs "$URL" && echo "no machine-detectable issues"
 *
 * IMPORTANT: a clean run means "no automated violations found", NOT "accessible".
 * Automated tools detect only ~30-40% of WCAG issues. Always pair with manual checks.
 */

import { writeFileSync } from 'node:fs';

function parseArgs(argv) {
  const args = { url: null, tags: ['wcag2a', 'wcag2aa', 'wcag22aa'], json: null, full: false };
  const rest = argv.slice(2);
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i];
    if (a === '--tags') args.tags = rest[++i].split(',').map((t) => t.trim()).filter(Boolean);
    else if (a === '--json') args.json = rest[++i];
    else if (a === '--full') args.full = true;
    else if (a === '--help' || a === '-h') args.help = true;
    else if (!a.startsWith('--')) args.url = a;
  }
  return args;
}

function usage() {
  console.log(
    'Usage: node axe-audit.mjs <url> [--tags wcag2a,wcag2aa,wcag22aa] [--json report.json] [--full]'
  );
}

const args = parseArgs(process.argv);
if (args.help || !args.url) {
  usage();
  process.exit(args.url ? 0 : 1);
}

let chromium, AxeBuilder;
try {
  ({ chromium } = await import('playwright'));
  AxeBuilder = (await import('@axe-core/playwright')).default;
} catch {
  console.error(
    'Missing dependencies. Install with:\n' +
      '  npm i -D playwright @axe-core/playwright && npx playwright install chromium'
  );
  process.exit(2);
}

const IMPACT_ORDER = { critical: 0, serious: 1, moderate: 2, minor: 3, undefined: 4 };

const browser = await chromium.launch();
try {
  // axe-core/playwright requires a page created from an explicit context.
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(args.url, { waitUntil: 'networkidle' });

  const results = await new AxeBuilder({ page }).withTags(args.tags).analyze();

  const violations = [...results.violations].sort(
    (a, b) => (IMPACT_ORDER[a.impact] ?? 4) - (IMPACT_ORDER[b.impact] ?? 4)
  );

  // Readable summary to stdout
  console.log(`\nAccessibility scan — ${args.url}`);
  console.log(`Ruleset: ${args.tags.join(', ')}`);
  console.log(
    `Violations: ${violations.length} | Incomplete (needs human review): ${results.incomplete.length} | Passes: ${results.passes.length}\n`
  );

  if (violations.length === 0) {
    console.log('No automated violations found.');
    console.log('NOTE: this does NOT mean the page is accessible — perform the manual checks.');
  } else {
    for (const v of violations) {
      console.log(`[${(v.impact ?? 'n/a').toUpperCase()}] ${v.id} — ${v.help}`);
      console.log(`  WCAG/tags: ${v.tags.filter((t) => t.startsWith('wcag')).join(', ') || 'n/a'}`);
      console.log(`  ${v.helpUrl}`);
      const shown = args.full ? v.nodes : v.nodes.slice(0, 5);
      for (const n of shown) {
        console.log(`    • ${n.target.join(' ')}`);
        if (n.failureSummary) {
          console.log(`      ${n.failureSummary.replace(/\n/g, '\n      ')}`);
        }
      }
      if (!args.full && v.nodes.length > 5) {
        console.log(`    … and ${v.nodes.length - 5} more node(s) (use --full to list all)`);
      }
      console.log('');
    }
  }

  if (results.incomplete.length > 0) {
    console.log('Incomplete checks (a human must verify these):');
    for (const i of results.incomplete) console.log(`  - ${i.id}: ${i.help}`);
    console.log('');
  }

  if (args.json) {
    const out = {
      url: args.url,
      tags: args.tags,
      timestamp: results.timestamp,
      counts: {
        violations: violations.length,
        incomplete: results.incomplete.length,
        passes: results.passes.length,
      },
      violations,
      incomplete: results.incomplete,
    };
    writeFileSync(args.json, JSON.stringify(out, null, 2));
    console.log(`Full JSON written to ${args.json}`);
  }

  process.exit(Math.min(violations.length, 250));
} finally {
  await browser.close();
}
