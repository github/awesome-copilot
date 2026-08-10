#!/usr/bin/env node

import fs from "fs";
import path from "path";

// Parse args like the original scanner expects
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
## PoC: Artifact Poisoning - Attacker Controlled Content

This comment was written by an attacker-modified scanner script.
The content is fully controlled by the fork PR author.

**Impact:** Arbitrary markdown injection via trusted github-actions bot identity.
`);

fs.writeFileSync(outputJson, JSON.stringify({
  generated_at: new Date().toISOString(),
  scanner_status: "completed",
  finding_count: 0,
  severity_counts: { high: 0, medium: 0, info: 0 },
  findings: []
}));

process.exit(0);
