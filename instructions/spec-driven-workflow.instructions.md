---
description: 'Specification-Driven Workflow v3 provides a robust, interactive approach to software development, ensuring requirements are clarified before implementation. It prioritizes safety and transparency through structured artifacts and clear protocols, with a proactive approach to edge case handling.'
applyTo: '**'
---

# Spec Driven Workflow v3

Specification-Driven Workflow v2 provides a robust, interactive approach to software development, ensuring requirements are clarified before implementation. It prioritizes safety and transparency through structured artifacts and clear protocols, with a proactive approach to edge case handling.

## Core Principles

### Ambiguity Resolution Protocol

The primary goal is to prevent errors by ensuring complete clarity *before* acting.

**If any ambiguity, inconsistency, or incomplete information is encountered in the request or during the process, you MUST stop and ask for clarification. Do not make assumptions or proceed until resolved.**

### Persistent Execution Protocol

Once a task begins, maintain ownership through all phases until completion, unless explicitly instructed otherwise.

- Do not pause for feedback unless ambiguity is encountered.
- Execution is complete only when all artifacts are produced, edge cases are mitigated, and handoff is finalized.

## Artifacts for Transparency

These artifacts ensure transparency and auditability for LLM-driven development.

### Required Artifacts

1. **`requirements.md`**  
   User stories, acceptance criteria, and edge case matrix in **EARS** notation.

2. **`design.md`**  
   Technical architecture, sequence diagrams, and edge case mitigations.

3. **`tasks.md`**  
   Detailed implementation plan with edge case handling tasks.

4. **`decision_records.md`**  
   Log of decisions with context, options, and rationale.

5. **`action_log.md`**  
   Activity log with actions, outcomes, logs, test results, and console outputs.

6. **`diagrams/`**  
   Directory for diagrams (e.g., sequence, data flow) if needed.

#### File Structure

```markdown
/spec/
  ├── requirements.md
  ├── design.md
  ├── tasks.md
  ├── decision_records.md
  ├── action_log.md
  └── diagrams/
```

### Maintenance Rules

- Update all relevant artifacts for any **new**, **updated**, or **obsolete** task.
- Do not create or modify other documentation unless explicitly instructed.

### Purpose

Artifacts ensure changes are transparent, traceable, and reviewable.

## Execution Workflow (6-Phase Loop)

**Never skip steps. Use consistent terminology. Minimize ambiguity.**

### Phase 1: ANALYZE

**Objective:** Understand the problem, produce testable requirements, and identify edge cases.

**Checklist:**

- Read provided code, documentation, tests, and logs; summarize findings.
- Define requirements in **EARS Notation** (e.g., `WHEN [condition], THE SYSTEM SHALL [behavior]`).
- Identify dependencies, constraints, and data flows.
- **Catalog edge cases** using input, state, user behavior, and environmental analysis.
  - **Edge Case Matrix** in `requirements.md`: `[Description], [Likelihood], [Impact], [Risk Score], [Mitigation]`.
- Assess **Confidence Score (0-100%)** based on requirement clarity and edge case coverage.

**Constraint:** Halt and request clarification if requirements or edge cases are ambiguous.

### Phase 2: DESIGN

**Objective:** Create a technical design and plan addressing edge cases.

**Checklist:**

- Define strategy based on Confidence Score:
  - **High (>85%)**: Comprehensive plan with edge case mitigations.
  - **Medium (66–85%)**: Build PoC/MVP to validate edge cases.
  - **Low (<66%)**: Research, simulate edge cases, and re-analyze.
- Document in `design.md`: architecture, data flow, interfaces, and edge case mitigations.
- Define unit tests for edge cases.
- Create implementation plan in `tasks.md` with edge case tasks.

**Constraint:** Do not implement until design and mitigations are complete.

### Phase 3: IMPLEMENT

**Objective:** Write production-quality code with edge case mitigations.

**Checklist:**

- Code in small, testable increments; document changes and tests.
- Implement from dependencies upward.
- Follow conventions, document deviations in `decision_records.md`.
- Add comments explaining intent.
- Update `tasks.md` with status and edge case outcomes.

**Constraint:** Do not merge/deploy until implementation and edge case mitigations are tested.

### Phase 4: VALIDATE

**Objective:** Verify implementation meets requirements, quality standards, and edge case mitigations.

**Checklist:**

- Run automated tests; document results, including edge case tests.
- Perform **linting** to enforce code style, quality, and security rules; document findings in `action_log.md`.
- Perform **type checking** (e.g., TypeScript, mypy) to ensure type safety; log type errors in `action_log.md`.
- Perform manual verification if needed; document results.
- Verify performance and log execution traces.

**Constraint:** Resolve all issues, including edge case failures, linting errors, and type errors, before proceeding.

### Phase 5: REFLECT

**Objective:** Improve code, update documentation, and evaluate edge case handling.

**Checklist:**

- Refactor for maintainability; document changes.
- Update all artifacts, including edge case documentation.
- Identify improvements and technical debt, including missed edge cases.
- Validate success criteria and edge case outcomes.

**Constraint:** Complete all documentation and improvements before closing.

### Phase 6: HANDOFF

**Objective:** Package work for review/deployment and transition to the next task.

**Checklist:**

- Generate **Executive Summary** (1-2 paragraphs):
  - Summarize task outcomes, key decisions, and edge case mitigations.
  - Highlight validation results and any unresolved issues.
- Prepare **Pull Request** (if applicable):
  - Include summary, changelog, validation links, and artifact links.
- Archive intermediate files to `.agent_work/`.
- Document transition or completion in `action_log.md`.

**Constraint:** Task is not complete until all handoff steps are documented.

## Troubleshooting & Retry Protocol

**If errors or ambiguities occur:**

1. Re-analyze requirements and edge cases.
2. Update design and tasks for new mitigations.
3. Retry execution with updated logic.
4. Escalate persistent issues, documenting in `decision_records.md`.

**Constraint:** Never proceed with unresolved issues; document all steps.

## Technical Debt Management

- **Identify**: Log code quality issues, shortcuts, and missed edge cases in `decision_records.md`.
- **Document**: Use template: `[Title], [Priority], [Location], [Reason], [Impact], [Remediation], [Effort]`.
- **Prioritize**: Based on risk and effort for remediation.

## Quality Assurance

### Continuous Monitoring

- **Static Analysis**: Monitor codebase for architectural rule adherence and potential vulnerabilities.
- **Dynamic Analysis**: Monitor runtime behavior and performance in a staging environment.
- **Documentation**: Check for documentation completeness and accuracy (e.g., linking, format).
- **Edge Case Coverage**: Track percentage of edge cases in the Edge Case Matrix with tests and mitigations.
- **Edge Case Risk Reduction**: Measure reduction in Risk Scores post-mitigation via validation results.

### Quality Metrics (Auto-Tracked)

- Code coverage percentage and gap analysis.
- Cyclomatic complexity score per function/method.
- Maintainability index assessment.
- Technical debt ratio (e.g., remediation time vs. development time).
- Documentation coverage percentage (e.g., public methods with comments).
- Edge case coverage percentage (e.g., edge cases with implemented mitigations).
- Linting error rate trend across the project.
- Type checking error rate trend across the project.

## Concrete "Few-Shot" Examples

These simplified examples guide artifact creation for LLMs and agents.

### EARS Requirement (`requirements.md`)

```markdown
### Requirements
- **Event-driven**: `WHEN the user submits a form, THE SYSTEM SHALL validate all fields and save the data.`
- **Unwanted behavior**: `IF the form is submitted with empty required fields, THEN THE SYSTEM SHALL display "Please fill all required fields."`
- **State-driven**: `WHILE the system is offline, THE SYSTEM SHALL queue form submissions for later processing.`

### Edge Case Matrix
| Description                           | Likelihood | Impact | Risk Score | Mitigation Strategy                                |
| ------------------------------------- | ---------- | ------ | ---------- | -------------------------------------------------- |
| Empty required fields                 | Frequent   | Medium | 70         | Validate fields; show error message.               |
| Offline submission                    | Rare       | High   | 80         | Queue submissions and sync when online.            |
| Malformed input (e.g., invalid email) | Occasional | Medium | 65         | Validate input format; reject with specific error. |
```

### Design Document Snippet (`design.md`)

```markdown
**Component**: `FormHandler`
**Function**: `submitForm(formData)`
**Logic**:
1. Validate `formData` for required fields and format.
2. Save valid data to local storage or queue if offline.
3. Return success or error message.

**Edge Case Handling**:
- **Empty Required Fields (Risk Score: 70)**:
  - **Mitigation**: Check for empty fields; return error message.
  - **Test Plan**: Test with empty and partial form submissions.
- **Offline Submission (Risk Score: 80)**:
  - **Mitigation**: Queue data in IndexedDB; sync on reconnect.
  - **Test Plan**: Simulate offline mode and verify queuing.

**Error Handling**: Return specific error messages for each validation failure.
```

### Task Entry (`tasks.md`)

```markdown
- **Task**: Implement `submitForm` in `FormHandler`.
  - **ID**: task-001
  - **Depends on**: `FormData` model.
  - **Status**: To Do
  - **Outcome**: Validates and saves form data or queues if offline.
  - **Edge Case Mitigation**: Handles empty fields and offline scenarios.

- **Task**: Add form validation UI feedback.
  - **ID**: task-002
  - **Depends on**: `FormHandler`.
  - **Status**: To Do
  - **Outcome**: Displays error messages for invalid inputs.
  - **Edge Case Mitigation**: Real-time validation for malformed inputs.
```

### Decision Record (`decision_records.md`)

```markdown
### Decision - 2025-07-21T15:00:00Z
**Decision**: Use IndexedDB for offline form storage.
**Context**: Need to store form submissions during offline mode.
**Options**:
1. **IndexedDB**: Pro: Native, efficient. Con: Browser compatibility.
2. **LocalStorage**: Pro: Simple. Con: Limited capacity.
**Rationale**: IndexedDB supports larger datasets and is widely supported.
**Impact**: Requires compatibility checks for older browsers.
**Review**: Reassess in 6 months.
```

### Action Log Record (`action_log.md`)

```markdown
- **Action**: Implemented `submitForm` function.
  - **Outcome**: Successfully validates and saves form data.
  - **Logs**: [Link to console output]
  - **Tests**: [Link to unit tests]
  - **Linting**: Ran ESLint; resolved 2 warnings (trailing commas, unused variables).
  - **Type Checking**: Ran TypeScript; fixed 1 type mismatch in `formData`.
  - **Issues**: None.
  - **Edge Case Outcome**: Handled empty fields and offline queuing.
- **Next Steps**: Test with malformed inputs and verify offline sync.
```
