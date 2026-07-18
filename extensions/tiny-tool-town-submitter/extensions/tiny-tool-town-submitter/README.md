# Tiny Tool Town Submitter

Inspect the current Git repository, review every field required by Tiny Tool Town, and submit a complete listing issue from a Copilot canvas.

The canvas also checks public-repository readiness, detects missing README guidance, licenses, and showcase imagery, and can request a dedicated Copilot project session to implement selected recommendations.

## Actions

- **Re-scan repository** refreshes detected metadata and readiness findings.
- **Generate options** uses the Copilot SDK to draft short, balanced, and detailed listing descriptions that can be reviewed before applying.
- **Start improvement session** hands selected findings to a new local project session.
- **Submit to Tiny Tool Town** checks required confirmations, searches for an existing submission, and creates the public issue through GitHub CLI.

GitHub CLI must be installed and authenticated to verify repository visibility or submit an issue.

## Assets

- `assets/preview.png` shows the submission workshop canvas.
