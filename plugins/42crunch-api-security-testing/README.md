# 42Crunch API Security Plugin

Automate API security directly in GitHub Copilot with 42Crunch - audit OpenAPI specs, detect vulnerabilities aligned with OWASP API Security risks (including BOLA/BFLA), and apply AI-powered fixes.

## Overview

The `42crunch-api-security-testing` plugin is designed for AI-assisted development workflows, it provides continuous guardrails through an **audit->scan->remediate->validate** loop, ensuring APIs meet enterprise security standards before deployment.

## Commands

| Skill | Description |
|---|---|
| [`/42crunch-setup`](./README.md#42crunch-setup) | Install the `42c-ast` binary and configure credentials (one-time) |
| [`/42crunch-audit`](./README.md#42crunch-audit) | Static security audit of an OpenAPI Specification file with scored findings and AI-assisted fixes |
| [`/42crunch-scan`](./README.md#42crunch-scan) | Live conformance and authorization scan (BOLA/BFLA) against a running API |
| [`/42crunch-api-security-testing`](./README.md#42crunch-api-security-testing) | Full audit + scan pipeline in a single session |
| [`/42crunch-code-to-oas`](./README.md#42crunch-code-to-oas) | Generate a complete `openapi.json` from your API source code| 

## Prerequisites

- [GitHub Copilot](https://github.com/features/copilot) (CLI or IDE extension)
- A 42Crunch account — [freemium](https://42crunch.com/freemium/) or paid (Platform API key)
- For `42crunch-scan`: a running API server reachable at the URL in `servers[0]` of your OAS (or via `SCAN42C_HOST`)

The `42c-ast` binary is downloaded and kept up to date automatically on first use.

## Installation

Install the `42crunch-api-security-testing` plugin:

```
copilot plugin install 42crunch-api-security-testing@awesome-copilot
```

## Quick Start

1. **Install the plugin** — add this marketplace to GitHub Copilot.
2. **Set up the environment** — say: *"set up 42crunch"*
3. **Audit your API** — say: *"run a 42Crunch audit"* (Copilot will offer to generate an OAS from source code if you don't have one)
4. **Fix issues** — Copilot presents findings by severity and asks your consent before changing anything
5. **Scan your API** — say: *"run a conformance scan"* against your running server

## Skills

### `42crunch-setup`

Installs the `42c-ast` binary for your OS/architecture, verifies its checksum, and walks you through credential configuration. Supports Platform (API key) and Freemium (token) modes. Credentials are stored in `~/.42crunch/conf/env` with `600` permissions.

> **Trigger:** "set up 42crunch", "configure 42crunch", "install 42c-ast", "update 42c-ast", "set api key", "42crunch not working", "binary not found"

**Usage:**
```
/42crunch-setup
```

---

### `42crunch-audit`

Runs a static analysis of an OpenAPI Specification and produces a 0–100 security score. Findings are classified into three tiers:

- **SQG-Blocking** — must fix to pass the Security Quality Gate
- **Security** — recommended fixes
- **Data Validation** — informational

Copilot asks your explicit consent before applying any changes, then re-runs the audit to confirm passage.

**Platform mode:** SQG threshold enforced from your platform policy.  
**Freemium mode:** No automated SQG gate; you set the target score and blocking severity for the session.

> **Trigger:** "run audit", "42crunch audit", "fix audit issues", "SQG audit", "audit score"

**Usage:**
```
/42crunch-audit
```

---

### `42crunch-scan`

Runs a live conformance and authorization test against a running API server. Copilot confirms the target URL, checks reachability, analyses the OAS (operations, auth schemes, BOLA candidates), and presents a scan preview before any configuration begins. After a happy-path validation run, Copilot asks your consent before starting the full fuzzing scan.

Findings are classified into three tiers:

- **Authorization failures** — BOLA/BFLA confirmed
- **SQG-Blocking conformance** — must fix to pass the Security Quality Gate
- **Informational conformance** — surfaced for review

Copilot asks your consent before applying any fixes — both OAS contract updates and server-side code changes.

**Platform mode:** SQG enforced from platform policy.  
**Freemium mode:** All findings presented informally; you decide what to fix.

> **Trigger:** "run scan", "scan only", "conformance test", "BOLA test", "BFLA test", "42crunch scan", "scan config"

**Usage:**
```
/42crunch-scan
```

---

### `42crunch-api-security-testing`

Orchestrates Audit (Phase 1) and Scan (Phase 2) in sequence. Resolves the OAS file and confirms the scan target URL up front. Each phase requires separate user consent. Produces a combined summary covering both phases.

> **Trigger:** "run audit and scan", "full 42crunch pipeline", "full security check", "audit then scan", "SQG"

**Usage:**
```
/42crunch-api-security-testing
```

---

### `42crunch-code-to-oas`

Analyses your API codebase and generates a complete `openapi.json`. Detects routes, parameters, request/response schemas, auth middleware, data models, and server config. Performs a self-review pass before writing the file.

Supported frameworks: Express, Fastify, Koa, Hapi, NestJS, FastAPI, Flask, Django, Starlette, Spring Boot, Quarkus, Micronaut, Gin, Echo, Chi, Gorilla/mux, Rails, Sinatra, Grape, ASP.NET Core, and more.

> **Trigger:** "generate OAS from code", "create OpenAPI spec", "document my API", "reverse-engineer spec", "write openapi.json from my codebase"

**Usage:**
```
/42crunch-code-to-oas
```

---

## Configuration

Credentials are read from `~/.42crunch/conf/env` (macOS/Linux) or `%APPDATA%\42Crunch\conf\env` (Windows), written by `42crunch-setup`. Never edit this file manually while a skill is running.

| Variable | Description | Mode |
|---|---|---|
| `API_KEY` | Platform token (`api_*` or `ide_*`) | Platform |
| `PLATFORM_HOST` | 42Crunch platform base URL (e.g. `https://us.42crunch.cloud`) | Platform |
| `FREEMIUM_TOKEN` | Freemium token (Base64) | Freemium |
| `SCAN42C_HOST` | Override scan target URL (overrides `servers[0]` in OAS) | Both |

Credentials are never printed in plaintext after entry.

---

## Links

- [42Crunch](https://42crunch.com/)
- [42Crunch Documentation](https://docs.42crunch.com)
- [42Crunch on GitHub](https://github.com/42Crunch)
- Support: support@42crunch.com

## License

MIT — see [LICENSE](./LICENSE) for details.
