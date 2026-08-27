---
name: ai-decision-authority
description: |
  Decide which AI outputs a human must approve and which an agent can own outright, by sorting decisions into three governance zones on stakes and reversibility rather than seniority. Use this skill when:
  - Deciding whether an agent may act autonomously on a given task
  - Auditing a backlog of team workflows to see which are safe to automate
  - Diagnosing why AI adoption stalled after a mandatory review process was introduced
  - Writing an AI usage or human-in-the-loop policy for a team
  - Deciding whether an agent should hold a send, merge, publish, or deploy permission
  - Splitting a workflow that mixes low-stakes and high-stakes steps
---

# AI Decision Authority

Sorts AI-assisted decisions into three zones and gives each a governance rule.

This is organisational governance: who approves what. For technical controls inside an agent (tool allow-lists, intent classification, trust scoring, audit trails), see the `agent-governance` skill. They compose well: this skill decides what needs a gate, `agent-governance` implements the gate.

## The problem

AI governance usually fails in one of two directions.

Review every output, and adoption collapses. Using the tool becomes slower than doing the work by hand, so people quietly stop using it. The policy looks responsible right up until you check the usage numbers.

Review nothing, and errors accumulate quietly until one does not stay quiet. Then legal or security arrives, a blanket review rule is imposed, and you get the first failure anyway.

Both come from applying one rule to every decision. Generating forty test variants is not the same decision as publishing a security advisory. Sort them.

## The three questions

Ask in this order. Order matters, because reversibility dominates.

1. **Can it be corrected if it is wrong?** Can this be quietly fixed, or has the damage already left the building? A draft can be rewritten. A published CVE description, a sent customer email, or a force-push to main cannot.
2. **Who sees it, and what follows?** Internal only, or does it cross a legal, executive, customer, or public boundary? Exposure is what pulls a decision out of Zone 1.
3. **How often does it happen?** Fifty times a day or twice a quarter? High-frequency standardised work is where a per-output human gate is fatal to adoption. Low-frequency, high-consequence work absorbs human ownership easily.

## The zones

### Zone 1: AI-Primary

Reversible, high volume, internal. Correctable at negligible cost.

Examples: first-draft code and docs, test scaffolding, internal research summaries, log triage, dependency bump PRs behind CI, categorisation and tagging, draft release notes.

**Rule:** the agent acts. Keep a log. Audit a periodic sample, never every output. No per-output gate.

Expect most decision volume here. If Zone 1 is small, decisions have been miscategorised and adoption will suffer.

### Zone 2: Collaborative

Reaches an external audience or touches shared state. A wrong output carries reputational, financial, or compliance cost. Human review adds real judgment rather than a rubber stamp.

Examples: customer-facing communications, public changelogs and docs, merges to a protected branch, schema migrations, pricing or billing copy, anything shipping under someone else's name.

**Rule:** the agent drafts and explains its reasoning. A human approves before it goes out. The agent does not hold the send or merge permission.

### Zone 3: Human-Primary

Irreversible, novel, or legally exposed. A named person is accountable for the outcome.

Examples: security advisories and incident disclosures, production deploys during an incident, regulatory filings, contractual or licensing commitments, layoffs and org communications, crisis response.

**Rule:** the agent researches and drafts ranked options with transparent reasoning. A named human decides and executes.

Keep this zone small. A large Zone 3 is the review-everything failure wearing a different hat.

## Govern the boundary, not the workflow

Most real workflows span zones. "The agent drafts the release notes and publishes them" is Zone 1 drafting plus Zone 2 publishing.

Gate the boundary and let the rest run. Governing an entire workflow at its highest zone is where most of the available adoption is lost, and it is the single most common mistake.

## Output format

For one decision:

```text
Decision: <restate it>
Reversibility: <answer>
Exposure: <answer>
Frequency: <answer>
-> Zone <n>: <name>
Rule: <governance rule>
If misclassified: <what breaks one zone down / one zone up>
```

For several, produce a table: Decision | Zone | Rule | Why.

Always state the misclassification cost. A zone assignment without the consequence of getting it wrong is an opinion, not governance.

## Anti-patterns

- **Gating every output.** The most common failure. Looks responsible, collapses adoption. Measure usage, not policy compliance.
- **Sorting by seniority.** Zones are set by stakes and reversibility. A principal engineer's internal scratch work is Zone 1. A junior's public security note is Zone 3.
- **Letting Zone 3 sprawl.** If most decision types land there, they were sorted by fear rather than analysis.
- **Governing a whole workflow at its highest zone.** Split it and gate the boundary.
- **Granting send, merge, or deploy permission because drafts have been good.** Draft quality and execution authority are separate grants.
- **Treating any published zone distribution as a target.** It is an observation from one context, not a benchmark.

## Provenance

Adapted from the Augmented Marketing Decision Architecture, an observational deployment across 16 product launches in one enterprise product marketing function. The zone boundaries generalise well; any specific percentages from that deployment do not, and are deliberately omitted here.

Framework by Kuber Sharma. Specification: kubersharma.com/frameworks/amda
