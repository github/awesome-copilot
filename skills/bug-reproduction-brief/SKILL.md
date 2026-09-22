---
name: bug-reproduction-brief
description: 'Turn a vague, intermittent, or environment-specific bug report into a minimal evidence-backed reproduction before proposing a fix.'
---

# Bug Reproduction Brief

Use this skill when a bug report is incomplete, intermittent, environment-specific, or mixed with an assumed cause. The goal is to prove the smallest observable failure before diagnosis or repair begins.

## 1. Record the observed failure

Capture the exact error, incorrect output, timestamp, affected route or command, and the smallest known input. Preserve relevant logs without secrets or personal data. Label second-hand descriptions as unverified.

## 2. Identify the environment

Record only facts you can inspect:

- repository and commit;
- runtime and package-manager versions;
- operating system or container;
- dependency lockfile;
- relevant feature flags;
- whether the target is local, test, staging, or production.

Never guess credentials or production configuration.

## 3. Separate expected from actual behaviour

Write two explicit observable statements:

```text
Expected: [observable result]
Actual:   [observable result, including status or error]
```

Do not put the suspected cause in either statement.

## 4. Reduce the reproduction

Start from the reported path, then remove unrelated data, services, and steps one at a time. Keep the smallest fixture that still fails. If the failure stops, restore the last removed condition and record it.

Prefer an isolated test, minimal script, or smallest safe request over reproducing against production.

## 5. Prove repeatability

Run the minimal reproduction at least twice where safe. Record commands and outputs. If the failure is intermittent, report the observed frequency and duration instead of calling it deterministic.

## 6. Stop before repair

A verified reproduction is the deliverable. Do not edit implementation code while building the brief because that can destroy the evidence or mix diagnosis with remediation.

## Output

```markdown
# Bug Reproduction Brief

- Target and commit:
- Environment:
- Expected:
- Actual:
- Minimal steps:
- Minimal fixture:
- Reproduced: yes / no / intermittent
- Evidence:
- Unknowns:
- Safe next hypothesis to test:
```

## Safety boundaries

- Do not change production data merely to reproduce a bug.
- Do not publish secrets, customer records, or private source.
- Do not claim a root cause from correlation alone.
- Use read-only or reversible discovery first.
- Stop after a verified reproduction; diagnosis and repair are separate workflows.

## Example prompt

```text
Use the Bug Reproduction Brief skill on the failing checkout test. Do not fix it yet. Reduce it to the smallest safe failing fixture and report the exact command evidence, expected result, actual result, and remaining unknowns.
```

## Source and licence

Adapted from the MIT-licensed workflow at https://github.com/skyestrela/ai-agent-skill-preview.
