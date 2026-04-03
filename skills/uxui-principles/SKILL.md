---
name: uxui-principles
description: 'Evaluate interfaces against 168 research-backed UX/UI principles and detect UX antipatterns. Use this skill when: (1) Auditing an interface design for UX issues, (2) Checking if a UI follows research-backed best practices, (3) Detecting antipatterns and UX smells in existing designs, (4) Reviewing AI-powered interfaces for trust, transparency, and human override, (5) Checking user flows against decision and feedback principles, (6) Injecting UX context into a coding session before implementation. Triggers: "audit this interface", "check UX", "evaluate design", "find antipatterns", "UX review", "does this follow UX principles", "review my UI", "check this flow", "vibe coding UX".'
---

# UX/UI Principles

A collection of 5 agent skills backed by 168 research-based UX/UI principles and 2,098+ academic citations. Evaluate interfaces, detect antipatterns, and inject UX expertise into your AI-assisted workflow.

**Repository:** https://github.com/uxuiprinciples/agent-skills

## Install

```bash
npx skills add uxuiprinciples/agent-skills
```

## Skills in This Collection

### uxui-evaluator

Evaluate interface descriptions against 168 research-backed UX/UI principles. Returns structured findings with severity, matched principles, and remediation steps.

**Use when:** You want a comprehensive UX audit of a screen, component, or interaction pattern.

### interface-auditor

Detect UX antipatterns (smells) using the uxuiprinciples smell taxonomy. Returns matched symptoms, severity levels, and step-by-step remediation recipes.

**Use when:** Something feels wrong with a design but you need to pinpoint the specific antipattern.

### ai-interface-reviewer

Audit AI-powered interfaces against 44 principles covering transparency, trust calibration, human override, consent, agentic workflows, and conversational design.

**Use when:** Reviewing a chatbot, AI assistant, copilot feature, or any interface with AI-generated output.

### flow-checker

Check user flows against decision, error recovery, and feedback principles. Identifies drop-off risks and missing states.

**Use when:** Designing or reviewing a multi-step flow such as onboarding, checkout, or form submission.

### vibe-coding-advisor

Inject UX context into vibe coding sessions. Reviews planned implementation against UX principles before code is written.

**Use when:** Starting a new component or feature and you want UX guidance baked in from the start.

## How It Works

1. Add the skill collection to your agent
2. Describe the interface, screen, or flow you want to evaluate
3. The skill returns structured findings: severity level, principle violated, and remediation steps
4. API key optional: connect to uxuiprinciples.com for enriched output with full citations and detailed remediation recipes

## Example Usage

```
Evaluate this checkout flow against UX principles:
- Step 1: Cart summary with item list and total
- Step 2: Email entry (no guest checkout option)
- Step 3: Payment form (card only)
- Step 4: Confirmation page
```

The skill returns findings like:
- **High severity:** No guest checkout violates Principle #47 (Minimize Friction at Critical Moments)
- **Medium severity:** Single payment method violates Principle #89 (Provide Alternatives)
- **Low severity:** Missing order edit option on confirmation page

## Principles Coverage

| Category | Principles |
|----------|-----------|
| Visual Hierarchy & Layout | 1-24 |
| Navigation & Wayfinding | 25-48 |
| Forms & Input | 49-72 |
| Feedback & System Status | 73-96 |
| Error Handling | 97-120 |
| Trust & Credibility | 121-144 |
| AI Interface Patterns | 145-168 |
