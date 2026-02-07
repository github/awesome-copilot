# Partners Plugin

Custom agents that have been created by GitHub partners

## Installation

```bash
# Using Copilot CLI
copilot plugin install partners@awesome-copilot
```

## What's Included

### Agents

| Agent | Description |
|-------|-------------|
| `amplitude-experiment-implementation` | This custom agent uses Amplitude's MCP tools to deploy new experiments inside of Amplitude, enabling seamless variant testing capabilities and rollout of product features. |
| `apify-integration-expert` | Expert agent for integrating Apify Actors into codebases. Handles Actor selection, workflow design, implementation across JavaScript/TypeScript and Python, testing, and production-ready deployment. |
| `arm-migration` | Arm Cloud Migration Assistant accelerates moving x86 workloads to Arm infrastructure. It scans the repository for architecture assumptions, portability issues, container base image and dependency incompatibilities, and recommends Arm-optimized changes. It can drive multi-arch container builds, validate performance, and guide optimization, enabling smooth cross-platform deployment directly inside GitHub. |
| `diffblue-cover` | Expert agent for creating unit tests for java applications using Diffblue Cover. |
| `droid` | Provides installation guidance, usage examples, and automation patterns for the Droid CLI, with emphasis on droid exec for CI/CD and non-interactive automation |
| `dynatrace-expert` | The Dynatrace Expert Agent integrates observability and security capabilities directly into GitHub workflows, enabling development teams to investigate incidents, validate deployments, triage errors, detect performance regressions, validate releases, and manage security vulnerabilities by autonomously analysing traces, logs, and Dynatrace findings. This enables targeted and precise remediation of identified issues directly within the repository. |
| `elasticsearch-observability` | Our expert AI assistant for debugging code (O11y), optimizing vector search (RAG), and remediating security threats using live Elastic data. |
| `jfrog-sec` | The dedicated Application Security agent for automated security remediation. Verifies package and version compliance, and suggests vulnerability fixes using JFrog security intelligence. |
| `launchdarkly-flag-cleanup` | A specialized GitHub Copilot agent that uses the LaunchDarkly MCP server to safely automate feature flag cleanup workflows. This agent determines removal readiness, identifies the correct forward value, and creates PRs that preserve production behavior while removing obsolete flags and updating stale defaults. |
| `lingodotdev-i18n` | Expert at implementing internationalization (i18n) in web applications using a systematic, checklist-driven approach. |
| `monday-bug-fixer` | Elite bug-fixing agent that enriches task context from Monday.com platform data. Gathers related items, docs, comments, epics, and requirements to deliver production-quality fixes with comprehensive PRs. |
| `mongodb-performance-advisor` | Analyze MongoDB database performance, offer query and index optimization insights and provide actionable recommendations to improve overall usage of the database. |
| `neo4j-docker-client-generator` | AI agent that generates simple, high-quality Python Neo4j client libraries from GitHub issues with proper best practices |
| `neon-migration-specialist` | Safe Postgres migrations with zero-downtime using Neon's branching workflow. Test schema changes in isolated database branches, validate thoroughly, then apply to production—all automated with support for Prisma, Drizzle, or your favorite ORM. |
| `neon-optimization-analyzer` | Identify and fix slow Postgres queries automatically using Neon's branching workflow. Analyzes execution plans, tests optimizations in isolated database branches, and provides clear before/after performance metrics with actionable code fixes. |
| `octopus-deploy-release-notes-mcp` | Generate release notes for a release in Octopus Deploy. The tools for this MCP server provide access to the Octopus Deploy APIs. |
| `stackhawk-security-onboarding` | Automatically set up StackHawk security testing for your repository with generated configuration and GitHub Actions workflow |
| `terraform` | Terraform infrastructure specialist with automated HCP Terraform workflows. Leverages Terraform MCP server for registry integration, workspace management, and run orchestration. Generates compliant code using latest provider/module versions, manages private registries, automates variable sets, and orchestrates infrastructure deployments with proper validation and security practices. |
| `pagerduty-incident-responder` | Responds to PagerDuty incidents by analyzing incident context, identifying recent code changes, and suggesting fixes via GitHub PRs. |
| `comet-opik` | Unified Comet Opik agent for instrumenting LLM apps, managing prompts/projects, auditing prompts, and investigating traces/metrics via the latest Opik MCP server. |

## Source

This plugin is part of [Awesome Copilot](https://github.com/github/awesome-copilot), a community-driven collection of GitHub Copilot extensions.

## License

MIT
