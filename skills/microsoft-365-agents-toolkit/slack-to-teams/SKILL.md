---
name: slack-to-teams
description: "Sub-skill of microsoft-365-agents-toolkit. Routed expert system with 100+ micro-expert files for migrating Slack bots to Teams, cross-platform bridging, and dual-platform bot development. USE FOR: migrating Slack bot to Teams, adding Teams support to Slack bot, building dual-platform bots, converting Block Kit to Adaptive Cards, identity/OAuth bridging, deploying bots to Azure or AWS, configuring AI model providers. DO NOT USE FOR: general web development, non-bot projects, standalone Teams development without Slack (use parent skill instead)."
---

# Slack to Teams Expert System

A routed expert system with 100+ micro-expert files for migrating Slack bots to Teams and building cross-platform bots.

> **Parent skill:** For ATK CLI setup and routing, see [../SKILL.md](../SKILL.md). For local testing, see [../test-playground/test-playground.md](../test-playground/test-playground.md) or [../test-teams/test-teams.md](../test-teams/test-teams.md). For cloud deploy, see [../provision-deploy/provision-deploy.md](../provision-deploy/provision-deploy.md). For troubleshooting, see [../troubleshoot/troubleshoot.md](../troubleshoot/troubleshoot.md).

## When to Use

- Building a new Slack bot, Teams bot, or dual-platform bot
- Adding Teams support to an existing Slack bot (or vice versa)
- Migrating a bot between platforms
- Deploying a bot to Azure or AWS
- Configuring AI model providers for a bot
- Converting UI between Block Kit and Adaptive Cards
- Bridging identity, events, files, or transport between platforms
- Making a Teams bot project compatible with Microsoft Agents Toolkit (m365agents.yml, env/, appPackage placeholders)

## Procedure

### Step 1: Determine project type

Assess whether the developer has an existing codebase or is starting fresh.

- **New project** → go to [New Project Flow](#new-project-flow)
- **Existing project** → go to [Existing Project Flow](#existing-project-flow)

---

### New Project Flow

#### 1a: Platform selection

Ask the developer which platform(s) to support:
- Slack + Teams (dual-platform)
- Slack only
- Teams only

#### 1b: Load the expert system

1. Read [experts/index.md](../experts/index.md) — the root router.
2. Execute the **pre-task interview** defined in that file.
3. Route based on platform choice:
   - **Slack + Teams** → Read [experts/bridge/index.md](../experts/bridge/index.md). Load [cross-platform-advisor](../experts/bridge/cross-platform-advisor-ts.md).
   - **Slack only** → Read [experts/slack/index.md](../experts/slack/index.md).
   - **Teams only** → Read [experts/teams/index.md](../experts/teams/index.md).

#### 1c: Architecture setup

1. Read [cross-platform-architecture](../experts/bridge/cross-platform-architecture-ts.md) (even for single-platform — establishes patterns for adding a second platform later).
2. Let the domain router and advisor take over.
3. Write a `PLAN.md` in the target project root with platform, features, experts loaded.

#### 1d: Implementation

Follow the advisor's or domain router's output. Implement feature by feature:
1. Pick the next feature from the prioritized list.
2. Load the expert(s) specified for that feature.
3. Implement using the expert's patterns and rules.
4. Verify against the expert's pitfalls section.

---

### Existing Project Flow

#### 2a: Analyze the project

Run these four sub-analyses **in parallel**:

**Detect language** — Scan for `package.json`+`tsconfig.json` (TypeScript), `pom.xml`/`build.gradle` (Java), `*.csproj`/`*.sln` (C#), `go.mod` (Go), `requirements.txt`/`pyproject.toml` (Python), `Gemfile` (Ruby), `Cargo.toml` (Rust).

**Detect current platform** — Scan dependencies for SDK indicators:
- Slack: `@slack/bolt`, `@slack/web-api`, `slack_bolt`, `app.message`, `app.command`, `ack()`
- Teams: `@microsoft/teams-ai`, `botbuilder`, `TeamsActivityHandler`, `app.turn`, Adaptive Cards

**Detect features** — Scan for slash commands, Block Kit/Adaptive Cards, action handlers, OAuth, file upload/download, scheduling, threading, AI/LLM calls, proactive messages.

**Detect architecture** — Scan for web framework (Express, Fastify, etc.), hosting target (Azure, AWS, Docker), cloud provider, architecture pattern (single bot, dual-bot, monolith).

#### 2b: Language gate

Classify the detected language into SDK tiers:

| Tier | Languages | Guidance |
|---|---|---|
| **1: Full SDK** | TypeScript / JavaScript | Full expert system available |
| **2: Adapt** | Python | Both SDKs exist — adapt TS patterns. Load [bolt-python](../experts/slack/bolt-python.md), [teams-python](../experts/teams/teams-python.md), [python-cross-platform](../experts/bridge/python-cross-platform.md) |
| **3: Split SDK** | Java, C# | One platform has SDK, other needs REST. Load [bolt-java](../experts/slack/bolt-java.md) or [teams-dotnet](../experts/teams/teams-dotnet.md) + [rest-only](../experts/bridge/rest-only-integration-ts.md) |
| **4: No SDK** | Go, Ruby, Rust | REST-only for both. Load [rest-only](../experts/bridge/rest-only-integration-ts.md) |

#### 2c: Expert coverage gap analysis

1. Read [experts/analyzer.md](../experts/analyzer.md).
2. Execute the analyzer workflow: scan manifests, dependencies, source files.
3. Cross-reference detected tech against existing experts.
4. Present gap analysis — covered vs uncovered technologies.

#### 2d: Build missing experts (if needed)

1. Read [experts/builder.md](../experts/builder.md).
2. For each gap: analyze project usage → read package source → draft expert → validate → wire into routing.
3. Use [experts/_expert-ts.md](../experts/_expert-ts.md) as the template.

#### 2e: Load the expert system

1. Read [experts/index.md](../experts/index.md) — the root router.
2. Execute the pre-task interview, pre-filling with analysis results from 2a.
3. Route based on detected platform and task intent:
   - Has Slack, wants Teams → **Bridge** domain
   - Has Teams, wants Slack → **Bridge** domain
   - Has both → Route by task (bridge refinement, deploy, models, etc.)
   - Has neither → Ask which platform(s) to target
4. Load [cross-platform-advisor](../experts/bridge/cross-platform-advisor-ts.md) if bridging. Feed analysis results into Phase 1.

#### 2f: Architecture and implementation

1. Read [cross-platform-architecture](../experts/bridge/cross-platform-architecture-ts.md).
2. Write a `PLAN.md` with analysis results, routing decisions, and feature migration order.
3. Implement feature by feature using the advisor's prioritized list.

## Agents Toolkit Compatibility

For ATK-compatible project structure (m365agents.yml, env/ files, appPackage), see the parent skill:
- **[Parent SKILL.md](../SKILL.md)** — ATK CLI setup, sub-skill routing, workflow chains
- **[manifest-and-yaml.md](../toolkit/manifest-and-yaml.md)** — Project files, YAML config, env vars, .localConfigs flow
- **[commands.md](../toolkit/commands.md)** — Package, validate, share, collaborate, environment management
- **[templates.md](../toolkit/templates.md)** — All templates with language support

For Teams manifest schema and packaging, see [runtime.manifest-ts](../experts/teams/runtime.manifest-ts.md).

## Error Recovery

If the expert system fails to cover a topic:
1. Read [experts/fallback.md](../experts/fallback.md).
2. Phase 1: Re-scan all domain routers for missed experts.
3. Phase 2: Web-search for remaining knowledge gaps.
4. Consider creating a new expert using [experts/builder.md](../experts/builder.md).

## Expert Domains

| Domain | Index | Description |
|---|---|---|
| Slack | [experts/slack/index.md](../experts/slack/index.md) | Bolt framework, events, OAuth, commands, UI, CLI |
| Teams | [experts/teams/index.md](../experts/teams/index.md) | Teams AI SDK, Adaptive Cards, Graph, MCP, A2A, deploy |
| Bridge | [experts/bridge/index.md](../experts/bridge/index.md) | 27 cross-platform conversion experts (the core differentiator) |
| Deploy | [experts/deploy/index.md](../experts/deploy/index.md) | Azure & AWS deployment walkthroughs |
| Models | [experts/models/index.md](../experts/models/index.md) | AI model providers (OpenAI, Anthropic, Bedrock, etc.) |
| Convert | [experts/convert/index.md](../experts/convert/index.md) | Language conversion to TypeScript |
| Security | [experts/security/index.md](../experts/security/index.md) | Input validation, secrets management |

## Platform Comparison Docs

Reference guides for side-by-side platform comparison:

- [UI Components](../docs/ui-components.md) — Block Kit vs Adaptive Cards
- [Messaging & Commands](../docs/messaging-and-commands.md)
- [Identity & Auth](../docs/identity-and-auth.md)
- [Interactive Responses](../docs/interactive-responses.md)
- [Files & Links](../docs/files-and-links.md)
- [Middleware & Handlers](../docs/middleware-and-handlers.md)
- [Infrastructure](../docs/infrastructure.md)
- [Advanced Features](../docs/advanced-features.md)
- [Feature Gaps](../docs/feature-gaps.md)
- [Workflow Scenarios](../docs/workflows.md) — Message-native workflow patterns (triggers, state, logic, AI, visibility) for Teams bots
