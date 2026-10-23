# Security extension

The Security extension for GitHub Copilot App provides a canvas for reviewing
GitHub Advanced Security code scanning alerts and local security findings.
Use the canvas to inspect findings and ask Copilot to explain, fix, or recheck
selected local findings.

## Requirements

- GitHub Copilot App. Standalone Copilot CLI is not supported.
- Access to code scanning alerts in the selected repository when loading
  GitHub Advanced Security findings.

## Getting started

Install the `github-security` plugin from your configured marketplace, then
open the **Security** canvas in a repository session. GitHub access uses the
repository's GitHub account in Copilot App.

Security findings and generated fixes require review; they do not guarantee
that a repository is free of vulnerabilities.

## Third-party notices

The bundled dependencies' versions, licenses, and notices are included with the
[extension](https://github.com/github/awesome-copilot/blob/main/extensions/github-security/THIRD_PARTY_NOTICES.md) and
[canvas](https://github.com/github/awesome-copilot/blob/main/extensions/github-security/client/THIRD_PARTY_NOTICES.md).
