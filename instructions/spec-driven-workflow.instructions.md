---
description: 'A robust, interactive approach to software development, ensuring requirements are clarified before implementation. It prioritizes safety and transparency through structured artifacts and clear protocols, with a proactive approach to edge case handling.'
applyTo: '**'
---

# Spec Driven Workflow v4

Structured, transparent software development process ensuring clarity before action, prioritizing safety and edge case handling.

## Core Principles

1. **Ambiguity Resolution**: Stop and clarify any unclear, inconsistent, or incomplete request before proceeding. No assumptions allowed.
2. **Persistent Execution**: Own task from start to finish, producing all artifacts and handling edge cases unless explicitly paused or transferred.
3. **Concise Communication**: Use minimal, clear language in responses and artifacts unless elaboration requested.

## Artifacts

Ensure transparency and auditability with minimal, clear documentation.

### Required Artifacts
- `requirements.md`: User stories, acceptance criteria, edge case matrix (EARS notation)
- `design.md`: Architecture, sequence diagrams, edge case mitigations
- `tasks.md`: Implementation plan with edge case tasks
- `decision_records.md`: Decision log with context, options, rationale
- `action_log.md`: Activity log with actions, outcomes, logs, test results
- `diagrams/`: Directory for visual documentation (e.g., sequence, data flow)

### File Structure
```
/spec/
├── requirements.md
├── design.md
├── tasks.md
├── decision_records.md
├── action_log.md
└── diagrams/
```

### Maintenance
- Update artifacts for new, updated, or obsolete tasks.
- Modify documentation only if instructed.
- Use concise language unless elaboration requested.

## Examples

### requirements.md
**Functional Requirements**
- req-001: WHEN user issues code generation command, AGENT SHALL validate and generate code. Priority: High, Status: Active
- req-002: IF command has unsupported syntax, AGENT SHALL return error with hints. Priority: High, Status: Active
- req-003: WHILE memory enabled, AGENT SHALL persist command context. Priority: Medium, Status: Active

**Edge Case Matrix**
| ID       | Description                          | Likelihood | Impact | Risk Score | Mitigation                              |
| -------- | ------------------------------------ | ---------- | ------ | ---------- | --------------------------------------- |
| edge-001 | Unsupported syntax/prompt            | Frequent   | High   | 85         | Parse/validate; return actionable error |
| edge-002 | Memory context mismatch              | Occasional | High   | 75         | Validate memory; prompt user if unclear |
| edge-003 | Ambiguous instruction interpretation | Occasional | Medium | 60         | Ask clarifying question                 |

### design.md
**Function**: `submitForm(formData)`  
**Inputs**: `formData: { key: string, value: any }`  
**Outputs**: `{ status: "success" | "error", message: string }`  

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

### tasks.md
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

### decision_records.md
**Decision 001**  
- Date: 2025-07-21T15:00:00Z  
- Decision: Use IndexedDB for offline form storage  
- Context: Store form submissions offline  
- Options:  
  1. IndexedDB: Pros - Efficient; Cons - Browser compatibility  
  2. LocalStorage: Pros - Simple; Cons - Limited capacity  
- Rationale: IndexedDB supports larger datasets  
- Impact: Needs compatibility checks for older browsers  
- Review: 2026-01-21  
- Status: Approved  

### action_log.md
**Activity 001**  
- Action: Implemented submitForm  
- Date: 2025-07-21T14:00:00Z  
- Outcome: Validates/saves form data  
- Logs: [Console output]  
- Tests: [Unit tests]  
- Linting: ESLint, fixed 2 warnings (trailing commas, unused variables)  
- Type Checking: TypeScript, fixed 1 formData type mismatch  
- Issues: None  
- Edge Cases: Handled empty fields, offline queuing  
- Next Steps: Test malformed inputs, verify offline sync  

## Execution Workflow (6 Phases)

1. **ANALYZE**  
   - Read code, docs, tests, logs; summarize findings  
   - Define requirements in EARS notation  
   - Identify dependencies, constraints, data flows  
   - Catalog edge cases in matrix: [Description], [Likelihood], [Impact], [Risk Score], [Mitigation]  
   - Assess Confidence Score (0-100%)  
   - Halt if ambiguous; request clarification  

2. **DESIGN**  
   - High Confidence (>85%): Plan with edge case mitigations  
   - Medium Confidence (66–85%): Build PoC/MVP  
   - Low Confidence (<66%): Research, simulate edge cases  
   - Document in `design.md`: architecture, interfaces, mitigations  
   - Define unit tests for edge cases  
   - Plan tasks in `tasks.md`  

3. **IMPLEMENT**  
   - Code in small, testable increments  
   - Build from dependencies upward  
   - Follow conventions; log deviations in `decision_records.md`  
   - Add comments for intent  
   - Update `tasks.md` with status, edge case outcomes  

4. **VALIDATE**  
   - Run tests; log results including edge cases  
   - Perform linting; log in `action_log.md`  
   - Perform type checking; log in `action_log.md`  
   - Verify performance; log traces  
   - Resolve all issues before proceeding  

5. **REFLECT**  
   - Refactor for maintainability; document changes  
   - Update artifacts, including edge case docs  
   - Identify improvements, technical debt, missed edge cases  
   - Validate success criteria, edge case outcomes  

6. **HANDOFF**  
   - Generate Executive Summary: Task outcomes, decisions, edge case mitigations, validation results  
   - Prepare Pull Request: Summary, changelog, validation/artifact links  
   - Archive intermediate files to `.agent_work/`  
   - Document completion in `action_log.md`  

## Interruption/Resume
- Reassess system impact  
- Update artifacts (`design.md`, `tasks.md`, etc.)  
- Log event in `decision_records.md`  

## Troubleshooting
- Re-analyze requirements, edge cases  
- Update design, tasks for new mitigations  
- Retry with updated logic  
- Escalate persistent issues; log in `decision_records.md`  

## Technical Debt
- Log in `decision_records.md`: [Title], [Priority], [Location], [Reason], [Impact], [Remediation], [Effort]  
- Prioritize by risk and effort  

## Quality Assurance
**Monitoring**  
- Static Analysis: Check architecture, vulnerabilities  
- Dynamic Analysis: Monitor runtime, performance  
- Documentation: Verify completeness, accuracy  
- Edge Case Coverage: Track mitigations in matrix  
- Edge Case Risk Reduction: Measure post-mitigation  
