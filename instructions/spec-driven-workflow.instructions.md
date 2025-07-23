---
description: 'You must follow a robust, interactive approach to software development. Clarify all requirements before implementation to eliminate ambiguity. Prioritize safety and transparency by producing and maintaining structured artifacts and clear protocols. Proactively identify and handle edge cases rather than waiting for them to emerge.'
applyTo: '**'
---

# Spec Driven Workflow v5

You must follow a robust, interactive approach to software development. Clarify all requirements before implementation to eliminate ambiguity. Prioritize safety and transparency by producing and maintaining structured artifacts and clear protocols. Proactively identify and handle edge cases rather than waiting for them to emerge.

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

- `requirements.md`: Capture user stories and acceptance criteria in structured EARS notation.
- `design.md`: Document technical architecture, sequence diagrams, and implementation considerations.
- `tasks.md`: Provide detailed implementation plans with discrete, trackable tasks.
- `activity_log.md`: Log decisions and actions with context, options, rationale, and execution outcomes.
- `steering/*.md`: Store steering documents. Use multiple steering files to separate focused instructions.

### File Structure

```
/spec/
├── steering/*.md
├── requirements.md
├── design.md
├── tasks.md
└── activity_log.md
```

### Maintain Files

- Update artifacts for new, updated, or obsolete tasks.
- Update steering docs when decisions or user prompts indicate reusable patterns or global policies.
- Use concise language unless elaboration is requested.

---

## Execution Workflow (6 Phases)

1. **ANALYZE**
   - Read code, docs, tests, and logs. Summarize findings.
   - Define requirements using EARS notation.
   - Identify dependencies, constraints, and data flows.
   - Catalog edge cases in a matrix with description, likelihood, impact, risk score, and mitigation.
   - Assess confidence score (0–100%).
   - Halt if ambiguous. Request clarification.

2. **DESIGN**
   - Use high confidence (>85%) to plan with edge case mitigations.
   - Use medium confidence (66–85%) to build PoC/MVP.
   - Use low confidence (<66%) to research and simulate edge cases.
   - Document architecture, interfaces, and mitigations in `design.md`.
   - Define unit tests for edge cases.
   - Plan tasks in `tasks.md`.
   - Apply available steering instructions.

3. **IMPLEMENT**
   - Code in small, testable increments.
   - Build from dependencies upward.
   - Follow conventions and log deviations in `activity_log.md`.
   - Add intent comments.
   - Update `tasks.md` with status and edge case outcomes.

4. **VALIDATE**
   - Run tests and log results, including edge cases.
   - Perform linting and type checking; log results.
   - Verify performance and log traces.
   - Resolve all issues before proceeding.

5. **REFLECT**
   - Refactor for maintainability and document changes.
   - Update artifacts, including edge case documentation.
   - Update task status in `tasks.md`.
   - Log reflections in `activity_log.md`.
   - Identify improvements, technical debt, and missed edge cases.
   - Validate success criteria and edge case outcomes.

6. **HANDOFF**
   - Generate executive summary: task outcomes, decisions, edge case mitigations, and validation results.
   - Prepare pull request: summary, changelog, and validation/artifact links.
   - Archive intermediate files to `/spec/agent_work/`.
   - Document completion in `activity_log.md`.

---

## Interruption/Resume

- Reassess system impact.
- Update artifacts (`design.md`, `tasks.md`, `activity_log.md`).
- Log event in `activity_log.md`.

## Troubleshooting

- Reanalyze requirements and edge cases.
- Update design and tasks for new mitigations.
- Retry with updated logic.
- Escalate persistent issues and log them.

## Technical Debt

- Log technical debt in `activity_log.md` with title, priority, location, reason, impact, remediation, and effort.
- Prioritize by risk and effort.

## Quality Assurance

- Perform static analysis: check architecture and vulnerabilities.
- Perform dynamic analysis: monitor runtime and performance.
- Verify documentation for completeness and accuracy.
- Track edge case mitigations in matrix.
- Measure edge case risk reduction after mitigation.
- Validate steering instructions in `steering/*.md` and log their outcomes.
- Ensure global decisions propagate to `steering/*.md` and not only to `activity_log.md`.

## Few-Shot Examples for Artifacts

### requirements.md

```md
**Functional Requirements**

- req-001: WHEN user submits web form for code generation, AGENT SHALL validate input and generate code (HTML/JS/CSS). Priority: High, Status: Active
- req-002: IF input has invalid syntax, AGENT SHALL return error with specific hints. Priority: High, Status: Active
- req-003: WHILE session storage is active, AGENT SHALL persist command context in browser. Priority: Medium, Status: Active

**Edge Case Matrix**

| ID       | Description                                 | Likelihood | Impact | Risk Score | Mitigation                                  |
| -------- | ------------------------------------------- | ---------- | ------ | ---------- | ------------------------------------------- |
| edge-001 | Invalid syntax in form (e.g., bad JSON/CSS) | Frequent   | High   | 85         | Validate input; return clear error messages |
| edge-002 | Session storage mismatch (e.g., expired)    | Occasional | High   | 75         | Verify storage; prompt re-authentication    |
| edge-003 | Vague form input (e.g., "make webpage")     | Occasional | Medium | 60         | Prompt for specific details in UI           |
```

### design.md

```md
**Function**: `submitForm(formData)`\ **Inputs**: `formData: { key: string, value: any }`\ **Outputs**: `{ status: "success" | "error", message: string }`

**Logic Flow**

1. Validate formData format
2. Save to IndexedDB or queue if offline
3. Return success/error

**Dependencies**

- IndexedDB API
- FormData model

**Edge Cases**

- edge-001: Empty fields (Risk: 70)
  - Mitigation: Check empty fields; return error
  - Test: Empty/partial submissions
- edge-002: Offline submission (Risk: 80)
  - Mitigation: Queue in IndexedDB; sync on reconnect
  - Test: Simulate offline mode

**Error Handling**

- Return specific error messages
- Log with timestamps
```

### tasks.md

```md
**task-001**: Implement submitForm

- Depends: FormData model
- Status: To Do
- Outcome: Validates/saves form data or queues offline
- Edge Cases: Empty fields, offline scenarios
- Priority: High

**task-002**: Add form validation UI feedback

- Depends: FormHandler
- Status: To Do
- Outcome: Show error messages for invalid inputs
- Edge Cases: Real-time validation for malformed inputs
- Priority: Medium
```

### activity\_log.md

```md
**Decision**

- Date: 2025-07-23
- Title: Use IndexedDB for offline storage
- Context: Persistent client-side data
- Options: IndexedDB, LocalStorage
- Rationale: IndexedDB handles larger data sets
- Status: Approved

**Action**

- Date: 2025-07-23T14:00:00Z
- Action: Implement submitForm
- Outcome: Validates and saves form data
- Edge Cases: Empty fields, offline queuing
- Logs: 3 unit tests passed
- Issues: None
- Next Steps: Offline sync testing
```

### steering/performance.tuning.md

```md
**Steering: Performance Tuning**\ Date: 2025-07-23T14:00:00Z\ Context: Expected large-scale input\ Scope: Algorithm choice, data structure design\ Impact: Use streaming pipelines instead of batch processing\ Status: Applied
```
