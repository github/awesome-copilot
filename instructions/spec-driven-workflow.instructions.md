---
description: 'A robust, interactive approach to software development, ensuring requirements are clarified before implementation. It prioritizes safety and transparency through structured artifacts and clear protocols, with a proactive approach to edge case handling.'
applyTo: '**'
---

# Spec Driven Workflow v3

A robust, interactive approach to software development, ensuring requirements are clarified before implementation. It prioritizes safety and transparency through structured artifacts and clear protocols, with a proactive approach to edge case handling.

## Core Principles

### 1. Ambiguity Resolution Protocol

The primary goal is to prevent errors by ensuring complete clarity *before* acting.

**Critical Constraint**: If any ambiguity, inconsistency, or incomplete information is encountered in the request or during the process, you MUST stop and ask for clarification. Do not make assumptions or proceed until resolved.

### 2. Persistent Execution Protocol

Once a task begins, maintain ownership through all phases until completion, unless explicitly instructed otherwise.

- Do not pause for feedback unless ambiguity is encountered
- Execution is complete only when all artifacts are produced, edge cases are mitigated, and handoff is finalized

## Artifacts for Transparency

These artifacts ensure transparency and auditability for LLM-driven development.

### Required Artifacts

| Artifact | Purpose | Content |
|----------|---------|---------|
| `requirements.md` | User stories, acceptance criteria, and edge case matrix | EARS notation |
| `design.md` | Technical architecture, sequence diagrams, and edge case mitigations | Architecture docs |
| `tasks.md` | Detailed implementation plan with edge case handling tasks | Implementation tasks |
| `decision_records.md` | Log of decisions with context, options, and rationale | Decision history |
| `action_log.md` | Activity log with actions, outcomes, logs, test results, and console outputs | Execution records |
| `diagrams/` | Directory for diagrams (e.g., sequence, data flow) if needed | Visual documentation |

### File Structure

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

1. Update all relevant artifacts for any **new**, **updated**, or **obsolete** task
2. Do not create or modify other documentation unless explicitly instructed

### Purpose

Artifacts ensure changes are transparent, traceable, and reviewable.

## Concrete "Few-Shot" Examples

These simplified examples guide artifacts maintenance.

### requirements.md

#### Functional Requirements
- **req-001**: WHEN user issues code generation command, AGENT SHALL validate command and generate code. Priority: High, Status: Active
- **req-002**: IF command has unsupported syntax, AGENT SHALL return error with resolution hints. Priority: High, Status: Active
- **req-003**: WHILE memory enabled, AGENT SHALL persist command context across interactions. Priority: Medium, Status: Active

#### Edge Case Matrix

| ID | Description | Likelihood | Impact | Risk Score | Mitigation |
|----|-------------|------------|--------|------------|------------|
| edge-001 | Unsupported syntax/prompt | Frequent | High | 85 | Parse/validate; return actionable error |
| edge-002 | Memory context mismatch | Occasional | High | 75 | Validate memory; prompt user if unclear |
| edge-003 | Ambiguous instruction interpretation | Occasional | Medium | 60 | Ask clarifying question before execution |

### design.md

#### Function Specification
- **Function**: `submitForm(formData)`
- **Inputs**: `formData: { key: string, value: any }`
- **Outputs**: `{ status: "success" | "error", message: string }`

#### Logic Flow
1. Validate formData for required fields/format
2. Save to IndexedDB or queue if offline
3. Return success/error

#### Dependencies
- IndexedDB API
- FormData model

#### Edge Cases
- **edge-001**: Empty Fields (Risk: 70)
  - Mitigation: Check empty fields; return error
  - Test: Empty/partial submissions
- **edge-002**: Offline Submission (Risk: 80)
  - Mitigation: Queue in IndexedDB; sync on reconnect
  - Test: Simulate offline mode

#### Error Handling
- Return specific error messages
- Log with timestamps

### tasks.md

> Note: This is an illustrative fast path assuming Confidence Score >85%

#### Implementation Tasks
- **task-001**: Implement submitForm
  - **Depends**: FormData model
  - **Status**: To Do
  - **Outcome**: Validates/saves form data or queues offline
  - **Edge Cases**: Empty fields, offline scenarios
  - **Priority**: High

- **task-002**: Add form validation UI feedback
  - **Depends**: FormHandler
  - **Status**: To Do
  - **Outcome**: Show error messages for invalid inputs
  - **Edge Cases**: Real-time validation for malformed inputs
  - **Priority**: Medium

### decision_records.md

#### Decision 001
- **Date**: 2025-07-21T15:00:00Z
- **Decision**: Use IndexedDB for offline form storage
- **Context**: Store form submissions offline
- **Options**:
  1. **IndexedDB**: Pros - Efficient; Cons - Browser compatibility
  2. **LocalStorage**: Pros - Simple; Cons - Limited capacity
- **Rationale**: IndexedDB supports larger datasets
- **Impact**: Needs compatibility checks for older browsers
- **Review**: 2026-01-21
- **Status**: Approved

### action_log.md

#### Activity 001
- **Action**: Implemented submitForm
- **Date**: 2025-07-21T14:00:00Z
- **Outcome**: Validates/saves form data
- **Logs**: [Console output]
- **Tests**: [Unit tests]
- **Linting**: ESLint, fixed 2 warnings (trailing commas, unused variables)
- **Type Checking**: TypeScript, fixed 1 formData type mismatch
- **Issues**: None
- **Edge Cases**: Handled empty fields, offline queuing
- **Next Steps**: Test malformed inputs, verify offline sync

## Execution Workflow (6-Phase Loop)

**Critical Constraint**: Never skip steps. Use consistent terminology. Minimize ambiguity.

### Phase 1: ANALYZE

**Objective**: Understand the problem, produce testable requirements, and identify edge cases.

#### Checklist
- [ ] Read provided code, documentation, tests, and logs; summarize findings
- [ ] Define requirements in **EARS Notation** (e.g., `WHEN [condition], THE SYSTEM SHALL [behavior]`)
- [ ] Identify dependencies, constraints, and data flows
- [ ] **Catalog edge cases** using input, state, user behavior, and environmental analysis
  - [ ] **Edge Case Matrix** in `requirements.md`: `[Description], [Likelihood], [Impact], [Risk Score], [Mitigation]`
- [ ] Assess **Confidence Score (0-100%)** based on requirement clarity and edge case coverage

**Critical Constraint**: Halt and request clarification if requirements or edge cases are ambiguous.

### Phase 2: DESIGN

**Objective**: Create a technical design and plan addressing edge cases.

#### Strategy Selection
- **High Confidence (>85%)**: Comprehensive plan with edge case mitigations
- **Medium Confidence (66–85%)**: Build PoC/MVP to validate edge cases
- **Low Confidence (<66%)**: Research, simulate edge cases, and re-analyze

#### Checklist
- [ ] Document in `design.md`: architecture, data flow, interfaces, and edge case mitigations
- [ ] Define unit tests for edge cases
- [ ] Create implementation plan in `tasks.md` with edge case tasks

**Critical Constraint**: Do not implement until design and mitigations are complete.

### Phase 3: IMPLEMENT

**Objective**: Write production-quality code with edge case mitigations.

#### Checklist
- [ ] Code in small, testable increments; document changes and tests
- [ ] Implement from dependencies upward
- [ ] Follow conventions; document deviations in `decision_records.md`
- [ ] Add comments explaining intent
- [ ] Update `tasks.md` with status and edge case outcomes

**Critical Constraint**: Do not merge/deploy until implementation and edge case mitigations are tested.

### Phase 4: VALIDATE

**Objective**: Verify implementation meets requirements, quality standards, and edge case mitigations.

#### Checklist
- [ ] Run automated tests; document results including edge case tests
- [ ] Perform **linting** to enforce code style, quality, and security rules; document findings in `action_log.md`
- [ ] Perform **type checking** (e.g., TypeScript, mypy) to ensure type safety; log type errors in `action_log.md`
- [ ] Perform manual verification if needed; document results
- [ ] Verify performance and log execution traces

**Critical Constraint**: Resolve all issues, including edge case failures, linting errors, and type errors, before proceeding.

### Phase 5: REFLECT

**Objective**: Improve code, update documentation, and evaluate edge case handling.

#### Checklist
- [ ] Refactor for maintainability; document changes
- [ ] Update all artifacts, including edge case documentation
- [ ] Identify improvements and technical debt, including missed edge cases
- [ ] Validate success criteria and edge case outcomes

**Critical Constraint**: Complete all documentation and improvements before closing.

### Phase 6: HANDOFF

**Objective**: Package work for review/deployment and transition to the next task.

#### Checklist
- [ ] Generate **Executive Summary** (1-2 paragraphs):
  - [ ] Summarize task outcomes, key decisions, and edge case mitigations
  - [ ] Highlight validation results and any unresolved issues
- [ ] Prepare **Pull Request** (if applicable):
  - [ ] Include summary, changelog, validation links, and artifact links
- [ ] Archive intermediate files to `.agent_work/`
- [ ] Document transition or completion in `action_log.md`

**Critical Constraint**: Task is not complete until all handoff steps are documented.

## Interruption / Resume Protocol

If scope changes, inputs shift mid-phase, or work resumes after interruption:

1. Reassess impact across the system
2. Update all relevant artifacts (`design.md`, `tasks.md`, etc.)
3. Log the event and rationale in `decision_records.md`

## Troubleshooting & Retry Protocol

### Error Handling Steps
1. Re-analyze requirements and edge cases
2. Update design and tasks for new mitigations
3. Retry execution with updated logic
4. Escalate persistent issues, documenting in `decision_records.md`

**Critical Constraint**: Never proceed with unresolved issues; document all steps.

## Technical Debt Management

### Identification
Log code quality issues, shortcuts, and missed edge cases in `decision_records.md`.

### Documentation Template
- **Title**: [Brief description]
- **Priority**: [High/Medium/Low]
- **Location**: [File/module reference]
- **Reason**: [Why this is technical debt]
- **Impact**: [Effect on system]
- **Remediation**: [Proposed solution]
- **Effort**: [Estimated time/complexity]

### Prioritization
Based on risk and effort for remediation.

## Quality Assurance

### Continuous Monitoring

#### Monitoring Areas
- **Static Analysis**: Monitor codebase for architectural rule adherence and potential vulnerabilities
- **Dynamic Analysis**: Monitor runtime behavior and performance in staging environment
- **Documentation**: Check for documentation completeness and accuracy (e.g., linking, format)
- **Edge Case Coverage**: Track percentage of edge cases in Edge Case Matrix with tests and mitigations
- **Edge Case Risk Reduction**: Measure reduction in Risk Scores post-mitigation via validation results

### Quality Metrics (Auto-Tracked)

| Metric | Description | Target |
|--------|-------------|--------|
| Code Coverage | Percentage and gap analysis | >80% |
| Cyclomatic Complexity | Score per function/method | <10 |
| Maintainability Index | Overall assessment | >70 |
| Technical Debt Ratio | Remediation time vs. development time | <20% |
| Documentation Coverage | Public methods with comments | >90% |
| Edge Case Coverage | Edge cases with implemented mitigations | >95% |
| Linting Error Rate | Trend across project | Decreasing |
| Type Checking Error Rate | Trend across project | Decreasing |
