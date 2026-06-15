# Slack vs Teams: Platform Differences & Bridging Strategies

A practical guide for developers adding cross-platform support to an existing bot. Each document covers a category of differences, explains why they matter, and provides concrete mitigation strategies with effort estimates.

## Documents

| Document | What It Covers |
|---|---|
| [**Feature Gaps**](feature-gaps.md) | **Complete inventory of every RED and YELLOW gap with mitigations in both directions** |
| [**Workflows**](workflows.md) | **Message-native workflow scenarios: standup, PTO, equipment, account health, break management, incidents** |
| [Messaging & Commands](messaging-and-commands.md) | Messages, slash commands, events, threading, @mentions |
| [UI Components](ui-components.md) | Block Kit vs Adaptive Cards, modals vs dialogs, App Home vs personal tabs |
| [Interactive Responses](interactive-responses.md) | Ephemeral messages, button actions, message updates, confirmation dialogs |
| [Identity & Auth](identity-and-auth.md) | User IDs, OAuth, signing/verification, tokens |
| [Files & Links](files-and-links.md) | File upload/download, link unfurling/previews |
| [Middleware & Handler Patterns](middleware-and-handlers.md) | Middleware chains, ack(), handler registration, error handling |
| [Advanced Features](advanced-features.md) | Scheduling, workflows, shortcuts, channel ops, reactions, distribution |
| [Infrastructure](infrastructure.md) | Transport, compute, storage, secrets, observability |
| [**Eval Harness**](../evals/README.md) | Automated testing for expert routing, completeness, and code patterns |

## Eval Harness

The [`evals/`](../evals/) directory contains an automated test harness for the expert system. It validates three dimensions:

- **Routing** — 51 test cases across all 7 domains verify queries route to the correct domain, clusters, and expert files
- **Completeness** — 9 test cases check experts cover all required concepts for their domain
- **Patterns** — 294 TypeScript code blocks across all experts are compiled in-memory to catch syntax errors

Pattern evals are fully deterministic (no API key needed). Routing and completeness evals use an LLM judge (OpenAI, Anthropic, or Azure OpenAI). See [`evals/README.md`](../evals/README.md) for setup and usage.

## How to Read These Docs

Each difference follows this format:

- **What's different** — the concrete behavioral gap
- **Impact** — what breaks or degrades if you ignore it
- **Mitigation** — one or more strategies ranked by effort and fidelity
- **Effort** — rough hours to implement

### Difficulty Ratings

| Rating | Meaning |
|---|---|
| GREEN | Direct mapping exists. Mechanical conversion, minimal design decisions. |
| YELLOW | Mapping exists but requires design decisions or trade-offs. |
| RED | Platform gap — no equivalent exists. Requires redesign or custom workaround. |
