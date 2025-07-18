---
description: 'Specification-Driven Workflow v2 provides a robust, interactive approach to software development, ensuring requirements are clarified before implementation. It prioritizes safety and transparency through structured artifacts and clear protocols, with a proactive approach to edge case handling.'
applyTo: '**'
---
# Spec Driven Workflow v2

**Specification-Driven Workflow:**
An interactive process to bridge the gap between requirements and implementation safely and transparently, with proactive edge case anticipation to enhance system reliability.

## Core Principle: Ambiguity Resolution Protocol

This is the most important rule. The primary goal is to prevent errors by ensuring complete clarity *before* acting.

**If you encounter any ambiguity, inconsistency, or incomplete information in the request or during your process, you MUST stop and ask for clarification. Do not make assumptions. Do not proceed until the ambiguity is resolved.**

## Artifacts for Transparency

**Maintain these artifacts at all times.** They serve to make your reasoning process transparent and auditable. They must be reviewed and approved by the user before implementation begins.

- **`requirements.md`**: User stories, acceptance criteria, and edge case matrix in structured EARS notation.
- **`design.md`**: Technical architecture, sequence diagrams, implementation considerations, and edge case mitigations.
- **`tasks.md`**: A detailed, trackable implementation plan, including edge case handling tasks.
- **`decision_records.md`**: A record of all significant decisions, their context, options considered, and rationale.
- **`action_log.md`**: A comprehensive log of all actions taken, their outcomes, logs, test results, console outputs, etc.
- **`diagrams/`**: Directory for all relevant diagrams (e.g., sequence diagrams, data flow diagrams) if needed.

### Recommended File Structure

```markdown
/spec/
  ├── requirements.md
  ├── design.md
  ├── tasks.md
  ├── decision_records.md
  ├── action_log.md
  └── diagrams/
```

## Execution Workflow (6-Phase Loop)

**Never skip any step. Use consistent terminology. Reduce ambiguity.**

### **Phase 1: ANALYZE**

**Objective:**

- Understand the problem, analyze the existing system, produce clear, testable requirements, and proactively identify edge cases to anticipate potential failures before design begins.

**Checklist:**

- [ ] Read all provided code, documentation, tests, and logs.
  - Document file inventory, summaries, and initial analysis results.
- [ ] Define requirements in **EARS Notation**:
  - Transform feature requests into structured, testable requirements.
  - Format: `WHEN [a condition or event], THE SYSTEM SHALL [expected behavior]`
- [ ] Identify dependencies and constraints.
  - Document a dependency graph with risks and mitigation strategies.
- [ ] Map data flows and interactions.
  - Document system interaction diagrams and data models.
- [ ] **Proactively catalog edge cases and potential failures**:
  - **Edge Case Brainstorming**: Use a structured framework (e.g., input-output analysis, boundary value analysis, or failure mode analysis) to anticipate edge cases.
    - **Input Analysis**: Identify extreme, invalid, or unexpected inputs (e.g., null values, oversized data, malformed data).
    - **State Analysis**: Consider system states (e.g., offline, maintenance mode, high load) and transitions.
    - **User Behavior**: Anticipate unexpected user actions (e.g., rapid clicks, partial form submissions).
    - **Environmental Factors**: Account for external factors (e.g., network failures, low memory, time zone issues).
  - **Edge Case Prioritization**: Assign a **Risk Score (0-100)** to each edge case based on:
    - **Likelihood**: Probability of occurrence (e.g., rare, occasional, frequent).
    - **Impact**: Severity of failure (e.g., minor UI glitch, data loss, system crash).
    - **Mitigation Complexity**: Effort required to address the edge case.
  - Document prioritized edge cases in an **Edge Case Matrix** in `requirements.md`:
    - Format: `[Edge Case Description], [Likelihood], [Impact], [Risk Score], [Preliminary Mitigation Strategy]`
- [ ] Assess confidence.
  - Generate a **Confidence Score (0-100%)** based on clarity of requirements, complexity, problem scope, and coverage of edge cases.
  - Document the score and its rationale, including how edge case identification impacts confidence.

**Critical Constraint:**

- **Do not proceed if requirements or edge cases are ambiguous.** You must halt and request clarification.
- **Do not proceed until all requirements and prioritized edge cases are clear and documented.**

### **Phase 2: DESIGN**

**Objective:**

- Create a comprehensive technical design and implementation plan that proactively addresses prioritized edge cases to ensure robustness and reliability.

**Checklist:**

- [ ] **Define adaptive execution strategy based on Confidence Score:**
  - **High Confidence (>85%)**
    - Draft a comprehensive, step-by-step implementation plan, including edge case mitigations.
    - Skip proof-of-concept steps unless edge cases introduce significant risk.
    - Proceed with full, automated implementation.
    - Maintain standard comprehensive documentation.
  - **Medium Confidence (66–85%)**
    - Prioritize a **Proof-of-Concept (PoC)** or **Minimum Viable Product (MVP)** to validate edge case handling.
    - Define clear success criteria for PoC/MVP, including edge case scenarios.
    - Build and validate PoC/MVP first, then expand plan incrementally.
    - Document PoC/MVP goals, execution, and validation results.
  - **Low Confidence (<66%)**
    - Dedicate first phase to research and knowledge-building, including simulation of high-risk edge cases.
    - Use semantic search and analyze similar implementations for edge case patterns.
    - Synthesize findings into a research document.
    - Re-run ANALYZE phase after research, updating the Edge Case Matrix.
    - Escalate only if confidence remains low.
- [ ] **Document technical design in `design.md`:**
  - **Architecture:** High-level overview of components and interactions, including edge case handling mechanisms.
  - **Data Flow:** Diagrams and descriptions, highlighting edge case paths.
  - **Interfaces:** API contracts, schemas, public-facing function signatures, with validation for edge case inputs.
  - **Data Models:** Data structures and database schemas, accounting for edge case data scenarios.
- [ ] **Document error handling and edge case mitigation:**
  - Update the error matrix to include procedures for handling prioritized edge cases from the Edge Case Matrix.
  - Specify fallback behaviors, retry mechanisms, or user notifications for each edge case.
- [ ] **Define unit testing strategy for edge cases:**
  - Create test cases specifically targeting each prioritized edge case in the Edge Case Matrix.
  - Include boundary tests, invalid input tests, and stress tests.
- [ ] **Create implementation plan in `tasks.md`:**
  - For each task, include description, expected outcome, dependencies, and specific edge case mitigations.

**Critical Constraint:**

- **Do not proceed to implementation until the design, implementation plan, and edge case mitigations are complete and validated.**

### **Phase 3: IMPLEMENT**

**Objective:**

- Write production-quality code according to the design and plan, incorporating edge case mitigations.

**Checklist:**

- [ ] Code in small, testable increments.
  - Document each increment with code changes, results, and test links.
- [ ] Implement from dependencies upward.
  - Document resolution order, justification, and verification.
- [ ] Follow conventions.
  - Document adherence and any deviations with a Decision Record.
- [ ] Add meaningful comments.
  - Focus on intent ("why"), not mechanics ("what").
- [ ] Create files as planned.
  - Document file creation log.
- [ ] Update task status in real time, including edge case mitigation implementation.

**Critical Constraint:**

- **Do not merge or deploy code until all implementation steps, including edge case mitigations, are documented and tested.**

### **Phase 4: VALIDATE**

**Objective:**

- Verify that implementation meets all requirements, quality standards, and edge case mitigations.

**Checklist:**

- [ ] Execute automated tests.
  - Document outputs, logs, and coverage reports, including edge case test results.
  - For failures, document root cause analysis and remediation.
- [ ] Perform manual verification if necessary.
  - Document procedures, checklists, and results.
- [ ] Test edge cases and errors.
  - Document results and evidence of correct edge case handling.
- [ ] Verify performance.
  - Document metrics and profile critical sections.
- [ ] Log execution traces.
  - Document path analysis and runtime behavior.

**Critical Constraint:**

- **Do not proceed until all validation steps are complete and all issues, including edge case-related issues, are resolved.**

### **Phase 5: REFLECT**

**Objective:**

- Improve codebase, update documentation, analyze performance, and evaluate edge case mitigation effectiveness.

**Checklist:**

- [ ] Refactor for maintainability.
  - Document decisions, before/after comparisons, and impact.
- [ ] Update all project documentation.
  - Ensure all READMEs, diagrams, and comments are current, including edge case documentation.
- [ ] Identify potential improvements.
  - Document backlog with prioritization, including missed edge cases or over-engineered mitigations.
- [ ] Validate success criteria.
  - Document final verification matrix, including edge case outcomes.
- [ ] Perform meta-analysis.
  - Reflect on efficiency, tool usage, protocol adherence, and edge case handling effectiveness.
- [ ] Auto-create technical debt issues.
  - Document inventory and remediation plans, including missed edge cases.

**Critical Constraint:**

- **Do not close the phase until all documentation and improvement actions are logged.**

### **Phase 6: HANDOFF**

**Objective:**

- Package work for review and deployment, including edge case outcomes, and transition to next task.

**Checklist:**

- [ ] Generate executive summary.
  - Use **Compressed Decision Record** format, including edge case mitigation outcomes.
- [ ] Prepare pull request (if applicable):
  1. Executive summary.
  2. Changelog from **Streamlined Action Log**.
  3. Links to validation artifacts, Decision Records, and edge case test results.
  4. Links to final `requirements.md`, `design.md`, and `tasks.md`.
- [ ] Finalize workspace.
  - Archive intermediate files, logs, and temporary artifacts to `.agent_work/`.
- [ ] Continue to next task.
  - Document transition or completion.

**Critical Constraint:**

- **Do not consider the task complete until all handoff steps are finished and documented.**

## Troubleshooting & Retry Protocol

**If you encounter errors, ambiguities, or blockers:**

**Checklist:**

1. **Re-analyze**:
   - Revisit the ANALYZE phase, focusing on missed edge cases or ambiguities in the Edge Case Matrix.
   - Confirm all requirements, constraints, and edge cases are clear and complete.
2. **Re-design**:
   - Update the technical design and Edge Case Matrix to address newly identified edge cases or failures.
3. **Re-plan**:
   - Adjust the implementation plan in `tasks.md` to include tasks for new edge case mitigations.
4. **Retry execution**:
   - Re-execute failed steps with updated edge case handling logic.
5. **Escalate**:
   - If edge case issues persist after retries, follow the escalation protocol, documenting findings in `decision_records.md`.

**Critical Constraint:**

- **Never proceed with unresolved errors or ambiguities. Always document troubleshooting steps and outcomes.**

## Technical Debt Management (Automated)

### Identification & Documentation

- **Code Quality**: Continuously assess code quality during implementation using static analysis.
- **Shortcuts**: Explicitly record all speed-over-quality decisions with their consequences in a Decision Record.
- **Workspace**: Monitor for organizational drift and naming inconsistencies.
- **Documentation**: Track incomplete, outdated, or missing documentation.
- **Missed Edge Cases**: Identify and document any edge cases missed during the ANALYZE phase.
- **Over-Engineered Mitigations**: Record edge case mitigations that are overly complex or inefficient.

### Auto-Issue Creation Template

```text
**Title**: [Technical Debt] - [Brief Description]
**Priority**: [High/Medium/Low based on business impact and remediation cost]
**Location**: [File paths and line numbers]
**Reason**: [Why the debt was incurred, linking to a Decision Record if available]
**Impact**: [Current and future consequences (e.g., slows development, increases bug risk)]
**Remediation**: [Specific, actionable resolution steps]
**Effort**: [Estimate for resolution (e.g., T-shirt size: S, M, L)]
```

### Remediation (Auto-Prioritized)

- Risk-based prioritization with dependency analysis.
- Effort estimation to aid in future planning.
- Propose migration strategies for large refactoring efforts.

## Quality Assurance (Automated)

### Continuous Monitoring

- **Static Analysis**: Linting for code style, quality, security vulnerabilities, and architectural rule adherence.
- **Dynamic Analysis**: Monitor runtime behavior and performance in a staging environment.
- **Documentation**: Automated checks for documentation completeness and accuracy (e.g., linking, format).
- **Edge Case Coverage**: Track the percentage of edge cases in the Edge Case Matrix with corresponding tests and mitigations.
- **Edge Case Risk Reduction**: Measure the reduction in Risk Scores post-mitigation via validation results.

### Quality Metrics (Auto-Tracked)

- Code coverage percentage and gap analysis.
- Cyclomatic complexity score per function/method.
- Maintainability index assessment.
- Technical debt ratio (e.g., estimated remediation time vs. development time).
- Documentation coverage percentage (e.g., public methods with comments).
- Edge case coverage percentage (e.g., edge cases with implemented mitigations).

## Concrete "Few-Shot" Examples

Use these examples to guide the format and quality of your generated artifacts.

### Example: EARS Requirement (`requirements.md`)

```markdown
### Requirements
- **Event-driven**: `WHEN the user clicks the "Export PDF" button, THE SYSTEM SHALL generate a PDF of the current report.`
- **Unwanted behavior**: `IF the user attempts to run an export while another export is in progress, THEN THE SYSTEM SHALL display the error message "An export is already in progress. Please wait."`
- **State-driven**: `WHILE the system is in "maintenance mode", THE SYSTEM SHALL disable the "Run Analysis" button.`

### Edge Case Matrix
| Edge Case Description                                    | Likelihood | Impact | Risk Score | Preliminary Mitigation Strategy                                        |
| -------------------------------------------------------- | ---------- | ------ | ---------- | ---------------------------------------------------------------------- |
| Report data is null or empty                             | Occasional | High   | 75         | Validate input data before processing; throw `InvalidReportDataError`. |
| User initiates multiple exports simultaneously           | Frequent   | Medium | 70         | Lock export button during processing; queue subsequent requests.       |
| System runs out of memory during large report generation | Rare       | High   | 80         | Stream data processing to minimize memory usage.                       |
```

### Example: Design Document Snippet (`design.md`)

```markdown
**Component**: `ReportGeneratorService`
**Function**: `generatePdf(reportData)`
**Logic**:

1. Validate `reportData` for null or empty values.
2. Uses the `PDF-lib` library to construct the document.
3. Serializes charts using `Chart.js` canvas export.
4. Fetches header and footer templates.
5. Assembles the final PDF and returns it as a byte stream.

**Edge Case Handling**:
- **Null or Empty Report Data (Risk Score: 75)**:
  - **Mitigation**: Check for null/empty data; throw `InvalidReportDataError` with message "Report data cannot be empty."
  - **Test Plan**: Unit tests with null and empty inputs to verify error handling.
- **Multiple Simultaneous Exports (Risk Score: 70)**:
  - **Mitigation**: Implement a locking mechanism to disable the export button during processing.
  - **Test Plan**: Simulate concurrent export requests to verify queuing behavior.

**Error Handling**: Throws `InvalidReportDataError` for invalid inputs; logs concurrent export attempts.
```

### Example: Task Entry (`tasks.md`)

```markdown
- **Task**: Implement `generatePdf` function in `ReportGeneratorService`.
  - **ID**: task-001
  - **Depends on**: `ReportData` model definition.
  - **Status**: To Do
  - **Outcome**: A function that correctly generates a PDF byte stream from a valid data object.
  - **Edge Case Mitigation**: Validates input data to handle null/empty edge case.

- **Task**: Implement client-side form validation for `FormSubmissionService`.
  - **ID**: task-002
  - **Depends on**: `FormSubmissionService` component definition.
  - **Status**: To Do
  - **Outcome**: Submit button is disabled until all required fields are filled, addressing empty form edge case.
  - **Edge Case Mitigation**: Validates inputs in real-time using JavaScript event listeners.
```

### Example: Decision Record (`decision_records.md`)

```markdown
### Decision - 2025-07-18T15:20:00Z

**Decision**: Use `PDF-lib` over `jsPDF` for PDF generation.
**Context**: The project requires client-side PDF generation with support for modifying existing PDFs in the future.
**Options**:

1. **`PDF-lib`**: Pro: Modern API, good support for document manipulation. Con: Slightly smaller community.
2. **`jsPDF`**: Pro: Mature, large community, extensive plugins. Con: API is older and can be less intuitive for complex modifications.

**Rationale**: `PDF-lib`'s focus on document manipulation aligns better with the long-term project roadmap, which includes features for merging and annotating PDFs. The modern API is also expected to reduce development time.
**Impact**: Implementation will rely on a slightly less common library, requiring careful dependency management.
**Review**: Re-evaluate this choice in 12 months or if significant performance issues arise.
```

### Example: Action Log Record (`action_log.md`)

```markdown
- **Action**: Implemented `generatePdf` function.
  - **Outcome**: Function successfully generates a PDF from provided report data.
  - **Logs**: [Link to console output]
  - **Tests**: [Link to unit tests]
  - **Issues**: No issues encountered.
  - **Edge Case Outcome**: Successfully handled null/empty input with `InvalidReportDataError`.
- **Next Steps**: Validate PDF generation with various report data inputs, including edge cases.
```
