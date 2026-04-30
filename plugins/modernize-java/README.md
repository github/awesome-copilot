# GitHub Copilot modernization – Java Upgrade CLI Plugin

**GitHub Copilot modernization – Java Upgrade CLI Plugin** helps you upgrade your Java applications directly from the command line. It brings the same intelligent modernization capabilities as the VS Code extension to your terminal and CI/CD pipelines, enabling you to:

- Analyze your project, assess your dependencies, and generate an upgrade plan
- Execute the plan to automatically transform your codebase
- Fix build issues and resolve migration errors during the upgrade process
- Validate your application against known CVEs after the upgrade
- Output a detailed summary including file changes, updated dependencies, and upgrade results

## Installation

```bash
copilot plugin install modernize-java@awesome-copilot
```

## Quick Start

```bash
copilot --model claude-sonnet-4.6 --agent modernize-java:modernize-java
```

## Key Capabilities

### 🔍 Intelligent Analysis and Upgrade Planning

Modernization starts with understanding your code. The CLI automatically analyzes your Java project and generates a customizable upgrade plan that you can review and edit before execution.

### 🔧 Automatic Code Transformation and Error Fixing

The CLI applies code transformations, automatically resolves build issues, and runs test validations — ensuring a smooth, error-free upgrade process without manual intervention.

### 🛡️ Post-Upgrade CVE Validation

After upgrade, the CLI scans for CVE (Common Vulnerabilities and Exposures) issues and code inconsistencies, then reports detected issues with suggested fixes to improve your application's security posture.

### 🔄 Upgrade Summary

At the end of each upgrade run, the CLI outputs a structured summary covering file changes, updated dependencies, test validation results, and any remaining issues — suitable for review in pull requests or CI logs.

## Feedback

We value your feedback — share [your thoughts here](https://aka.ms/AM4JFeedback) to help us continue improving the product.

## License

MIT

## Trademarks

Authorized use of Microsoft trademarks or logos must follow [Microsoft's Trademark & Brand Guidelines](https://www.microsoft.com/legal/intellectualproperty/trademarks/usage/general).

## Privacy Statement

GitHub Copilot modernization uses GitHub Copilot to make code changes, which does not retain code snippets beyond the immediate session. We do not collect, transmit, or store your custom tasks. Review the [Microsoft Privacy Statement](https://go.microsoft.com/fwlink/?LinkId=521839).

Telemetry metrics are collected and analyzed to track feature usage and effectiveness. Learn more about [telemetry settings in VS Code](https://code.visualstudio.com/docs/configure/telemetry).

## Transparency Note

GitHub Copilot modernization uses AI to make code changes, and AI sometimes makes mistakes. Please review and test all changes before using them in production.

## Disclaimer

Unless otherwise permitted under applicable license(s), users may not decompile, modify, repackage, or redistribute any assets, prompts, or internal tools provided as part of this product without prior written consent from Microsoft.
