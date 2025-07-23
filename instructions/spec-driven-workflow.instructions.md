---
description: 'You must follow a robust, interactive approach to software development. Clarify all requirements before implementation to eliminate ambiguity. Prioritize safety and transparency by producing and maintaining structured artifacts and clear protocols. Proactively identify and handle edge cases rather than waiting for them to emerge.'
applyTo: '**'
---

# Spec Driven Workflow v5

You must follow a robust, systematic approach to software development. Clarify all requirements before implementation to eliminate ambiguity. Prioritize safety and transparency by producing and maintaining structured artifacts and clear protocols. Proactively identify and handle edge cases rather than waiting for them to emerge.

---

## Core Principles

1. **Resolve Ambiguity**: Stop and clarify any unclear, inconsistent, or incomplete request. Make no assumptions.
2. **Execute Persistently**: Own tasks from start to finish. Produce all artifacts and handle edge cases unless explicitly paused or transferred.
3. **Communicate Concisely**: Use minimal, clear language in responses and artifacts unless elaboration is requested.
4. **Support Steering**: Accept structured steering instructions. Adjust scope, behavior, or execution path dynamically.
5. **Maintain Artifacts**: Keep clear, verifiable artifacts updated throughout all phases.
6. **Track Global Decisions**: When any user prompt, answer, or decision represents a pattern or global behavior change, update or add a steering document in `steering/*.md`. Keep one-off or task-specific decisions in `activity_log.md` only.

---

## Artifacts

### Required Artifacts

- `activity_log.md`: Log decisions and actions with context, options, rationale, and execution outcomes.
- `requirements.md`: Capture user stories and acceptance criteria in structured EARS notation.
- `edge_cases.md`: Edge case matrix (description, likelihood, impact, risk score, mitigation).
- `design.md`: Document technical architecture, sequence diagrams, and implementation considerations.
- `tasks.md`: Provide detailed implementation plans with discrete, trackable tasks.
- `steering/*.md`: Store steering documents. Use multiple steering files to separate focused instructions.
- `/spec/agent_work/`: Archive for intermediate files.

### File Structure

```md
/spec/
├── steering/
│   └── *.md              # Steering instructions for reusable patterns and policies
├── agent_work/           # Archive for intermediate files
├── requirements.md       # User stories and acceptance criteria in EARS notation
├── design.md             # Technical architecture, interfaces, and mitigations
├── tasks.md              # Implementation plans with trackable tasks and status
├── edge_cases.md        # Edge case matrix (description, likelihood, impact, risk score, mitigation)
└── activity_log.md       # Decisions, actions, reflections, escalations, and completion logs
```

### Maintenance Guidelines

- Update artifacts for new, updated, or obsolete tasks.
- Update steering docs when decisions or user prompts indicate reusable patterns or global policies.
- Use concise language unless elaboration is requested.

---

## Workflows

### Main Workflow

Structured process for complex, high-risk tasks requiring thorough analysis and validation.

#### Criteria

Use when **any** of the following are met:

- **Scope**: Spans multiple components, modules, or files, or involves external dependencies.
- **Impact**: Affects critical functionality (e.g., core logic, data integrity, user-facing features).
- **Risk Score**: ≥30 (likelihood × impact, per edge case matrix).
- **Edge Cases**: Multiple or complex edge cases (e.g., new error states, system interactions).
- **Ambiguity**: Requirements unclear or need clarification.

#### Steps

1. **ANALYZE**
   - Read: code, docs, tests, logs.
   - Summarize: findings in `activity_log.md`.
   - Define: requirements in EARS notation in `requirements.md`.
   - Identify: dependencies, constraints, data flows.
   - Catalog: edge cases in matrix (`edge_cases.md`):
     - Fields: description, likelihood (1–5), impact (1–5), risk score (likelihood × impact), mitigation.
   - Assess: confidence score (0–100%).
   - Action: halt and request clarification if ambiguous.

2. **DESIGN**
   - High confidence (>85%): plan with edge case mitigations.
   - Medium confidence (66–85%): build PoC/MVP.
   - Low confidence (<66%): research and simulate edge cases.
   - Document: architecture, interfaces, mitigations in `design.md`.
   - Define: unit tests for edge cases.
   - Plan: tasks in `tasks.md`.
   - Apply: steering instructions from `steering/*.md`.

3. **IMPLEMENT**
   - Code: in small, testable increments.
   - Build: from dependencies upward.
   - Follow: conventions, log deviations in `activity_log.md`.
   - Add: intent comments in code.
   - Update: `tasks.md` with status and edge case outcomes.

4. **VALIDATE**
   - Run: tests, log results in `activity_log.md` (include edge cases).
   - Perform: linting, type checking; log results.
   - Verify: performance, log traces.
   - Resolve: all issues before proceeding.

5. **REFLECT**
   - Refactor: for maintainability, document changes.
   - Update: artifacts, including `edge_cases.md`.
   - Update: `tasks.md` with task status.
   - Log: reflections in `activity_log.md`.
   - Identify: improvements, technical debt, missed edge cases.
   - Validate: success criteria and edge case outcomes.

6. **HANDOFF**
   - Generate: executive summary (task outcomes, decisions, mitigations, validation results).
   - Prepare: pull request (summary, changelog, validation/artifact links).
   - Archive: intermediate files to `/spec/agent_work/`.
   - Log: completion in `activity_log.md`.

### Lightweight Workflow

Streamlined process for small, low-risk tasks with minimal overhead.

#### Criteria

Use when **all** criteria are met:

- **Scope**: Single component/module/file, no external dependencies.
- **Impact**: Low, affects non-critical functionality (e.g., UI tweaks, typo fixes).
- **Risk Score**: <30 (likelihood × impact, per edge case matrix).
- **Edge Cases**: Minimal or none (no new error states or system interactions).

#### Steps

1. **ANALYZE**
   - Confirm: task meets lightweight criteria.
   - Log: task and criteria assessment in `activity_log.md`.
   - Identify: edge cases (if any), document in `edge_cases.md` or as a section in `activity_log.md` if minimal.
   - Action: escalate to Main Workflow if ambiguities or risks emerge.

2. **IMPLEMENT**
   - Code: in small, testable increments.
   - Follow: conventions, log deviations in `activity_log.md`.
   - Add: intent comments in code.

3. **VALIDATE**
   - Run: relevant tests (unit, integration), log results in `activity_log.md`.
   - Perform: linting, type checking; log results.
   - Resolve: all issues before proceeding.

4. **REFLECT**
   - Document: changes and outcomes in `activity_log.md`.
   - Identify: technical debt, missed edge cases (log with priority, impact, remediation in `activity_log.md`).
   - Confirm: task completion against success criteria.

5. **HANDOFF**
   - Log: completion in `activity_log.md` (summary, validation results, edge case outcomes).
   - Prepare: pull request (summary, link to `activity_log.md`).
   - Archive: intermediate notes to `/spec/agent_work/`.

### Interruption/Resume

- Check: task status in `tasks.md` and validate artifact consistency (`requirements.md`, `design.md`, `edge_cases.md`).
- Reassess: system impact and update artifacts (`design.md`, `tasks.md`, `activity_log.md`).
- Log: interruption/resume event in `activity_log.md` with context and next steps.

### Troubleshooting

- Reanalyze: requirements and edge cases in `requirements.md` and `edge_cases.md`.
- Update: `design.md` and `tasks.md` for new mitigations.
- Retry: with updated logic.
- Escalate: persistent issues by logging with `[ESCALATE]` tag in `activity_log.md` and notifying human operator.

### Technical Debt

- Log: in `activity_log.md` with title, priority, location, reason, impact, remediation, and effort.
- Prioritize: by risk and effort.

## Quality Assurance

- Perform: static analysis (architecture, vulnerabilities).
- Perform: dynamic analysis (runtime, performance).
- Verify: documentation completeness and accuracy.
- Track: edge case mitigations in `edge_cases.md`.
- Measure: edge case risk reduction post-mitigation.
- Validate: steering instructions in `steering/*.md` and log outcomes in `activity_log.md`.
- Ensure: global decisions propagate to `steering/*.md`.

## Few-Shot Examples for Artifacts

### requirements.md

```md
**Functional Requirements**

- req-001: WHEN user submits web form for code generation, AGENT SHALL validate input and generate code (HTML/JS/CSS). Priority: High, Status: Active
- req-002: IF input has invalid syntax, AGENT SHALL return error with specific hints. Priority: High, Status: Active
- req-003: WHILE session storage is active, AGENT SHALL persist command context in browser. Priority: Medium, Status: Active

### edge_cases.md
```md
**Edge Case Matrix**

| ID       | Description                                 | Likelihood | Impact | Risk Score | Mitigation                                  |
| -------- | ------------------------------------------- | ---------- | ------ | ---------- | ------------------------------------------- |
| edge-001 | Invalid syntax in form (e.g., bad JSON/CSS) | 4          | 5      | 20         | Validate input; return clear error messages |
| edge-002 | Session storage mismatch (e.g., expired)    | 3          | 5      | 15         | Verify storage; prompt re-authentication    |
| edge-003 | Vague form input (e.g., "make webpage")     | 3          | 4      | 12         | Prompt for specific details in UI           |
```

### design.md

```md
**Function**: `handleApiResponse(response)`\ **Inputs**: `response: any`\ **Outputs**: `{ status: "success" | "error", data: any, message: string }`

**Logic Flow**

1. Check response for null/undefined
2. Retry on timeout
3. Log errors to `activity_log.md`

**Dependencies**

- API client library

**Edge Cases**

- edge-004: Null response (Risk: 15)
  - Mitigation: Return default value
  - Test: Simulate null response
- edge-005: Timeout (Risk: 8)
  - Mitigation: Retry request
  - Test: Simulate timeout
```

### tasks.md

```md
**task-003**: Handle null API response

- Depends: API client
- Status: To Do
- Outcome: Graceful error handling with default value
- Edge Cases: Null response, timeout
- Priority: High
```

### activity\_log.md

```md
**Decision**

- Date: 2025-07-23
- Title: Default value for null API response
- Context: Prevent crashes on null response
- Options: Throw error, return default
- Rationale: Default value ensures continuity
- Status: Approved

**Action**

- Date: 2025-07-23T15:00:00Z
- Action: Implement handleApiResponse
- Outcome: Handles null response with default
- Edge Cases: Null response, timeout
- Logs: 2 unit tests passed
- Issues: None
- Next Steps: Test timeout retry
```

### steering/performance.tuning.md

```md
**Steering: Performance Tuning**\ Date: 2025-07-23T14:00:00Z\ Context: Expected large-scale input\ Scope: Algorithm choice, data structure design\ Impact: Use streaming pipelines instead of batch processing\ Status: Applied
```
