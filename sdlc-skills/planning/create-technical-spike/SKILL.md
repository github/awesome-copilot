---
name: create-technical-spike
description: 'Create time-boxed technical spike documents for researching and resolving critical development decisions before implementation.'
---

# Create Technical Spike Document

Create time-boxed technical spike documents for researching critical questions that must be answered before development can proceed. Each spike focuses on a specific technical decision with clear deliverables and timelines.

## Document Structure

Create individual files in `${input:FolderPath|docs/spikes}` directory. Name each file using the pattern: `[category]-[short-description]-spike.md` (e.g., `api-copilot-integration-spike.md`, `performance-realtime-audio-spike.md`).

```md
---
title: "${input:SpikeTitle}"
category: "${input:Category|Technical}"
status: "🔴 Not Started"
priority: "${input:Priority|High}"
timebox: "${input:Timebox|1 week}"
created: [YYYY-MM-DD]
updated: [YYYY-MM-DD]
owner: "${input:Owner}"
tags: ["technical-spike", "${input:Category|technical}", "research"]
---

# ${input:SpikeTitle}

## Summary

**Spike Objective:** [Clear, specific question or decision that needs resolution]

**Why This Matters:** [Impact on development/architecture decisions]

**Timebox:** [How much time allocated to this spike]

**Decision Deadline:** [When this must be resolved to avoid blocking development]

## Research Question(s)

**Primary Question:** [Main technical question that needs answering]

**Secondary Questions:**

- [Related question 1]
- [Related question 2]
- [Related question 3]

## Investigation Plan

### Research Tasks

- [ ] [Specific research task 1]
- [ ] [Specific research task 2]
- [ ] [Specific research task 3]
- [ ] [Create proof of concept/prototype]
- [ ] [Document findings and recommendations]

### Success Criteria

**This spike is complete when:**

- [ ] [Specific criteria 1]
- [ ] [Specific criteria 2]
- [ ] [Clear recommendation documented]
- [ ] [Proof of concept completed (if applicable)]

## Technical Context

**Related Components:** [List system components affected by this decision]

**Dependencies:** [What other spikes or decisions depend on resolving this]

**Constraints:** [Known limitations or requirements that affect the solution]

## Research Findings

### Investigation Results

[Document research findings, test results, and evidence gathered]

### Prototype/Testing Notes

[Results from any prototypes, spikes, or technical experiments]

### External Resources

- [Link to relevant documentation]
- [Link to API references]
- [Link to community discussions]
- [Link to examples/tutorials]

## Decision

### Recommendation

[Clear recommendation based on research findings]

### Rationale

[Why this approach was chosen over alternatives]

### Implementation Notes

[Key considerations for implementation]

### Follow-up Actions

- [ ] [Action item 1]
- [ ] [Action item 2]
- [ ] [Update architecture documents]
- [ ] [Create implementation tasks]

## Status History

| Date   | Status         | Notes                      |
| ------ | -------------- | -------------------------- |
| [Date] | 🔴 Not Started | Spike created and scoped   |
| [Date] | 🟡 In Progress | Research commenced         |
| [Date] | 🟢 Complete    | [Resolution summary]       |

---

_Last updated: [Date] by [Name]_
```

## Categories for Technical Spikes

### API Integration

- Third-party API capabilities and limitations
- Integration patterns and authentication
- Rate limits and performance characteristics

### Architecture & Design

- System architecture decisions
- Design pattern applicability
- Component interaction models

### Performance & Scalability

- Performance requirements and constraints
- Scalability bottlenecks and solutions
- Resource utilization patterns

### Platform & Infrastructure

- Platform capabilities and limitations
- Infrastructure requirements
- Deployment and hosting considerations

### Security & Compliance

- Security requirements and implementations
- Compliance constraints
- Authentication and authorization approaches

### User Experience

- User interaction patterns
- Accessibility requirements
- Interface design decisions

## File Naming Conventions

Use descriptive, kebab-case names that indicate the category and specific unknown:

**API/Integration Examples:**

- `api-copilot-chat-integration-spike.md`
- `api-azure-speech-realtime-spike.md`
- `api-vscode-extension-capabilities-spike.md`

**Performance Examples:**

- `performance-audio-processing-latency-spike.md`
- `performance-extension-host-limitations-spike.md`
- `performance-webrtc-reliability-spike.md`

**Architecture Examples:**

- `architecture-voice-pipeline-design-spike.md`
- `architecture-state-management-spike.md`
- `architecture-error-handling-strategy-spike.md`

## Best Practices for AI Agents

1. **One Question Per Spike:** Each document focuses on a single technical decision or research question

2. **Time-Boxed Research:** Define specific time limits and deliverables for each spike

3. **Evidence-Based Decisions:** Require concrete evidence (tests, prototypes, documentation) before marking as complete

4. **Clear Recommendations:** Document specific recommendations and rationale for implementation

5. **Dependency Tracking:** Identify how spikes relate to each other and impact project decisions

6. **Outcome-Focused:** Every spike must result in an actionable decision or recommendation

## Research Strategy

### Phase 1: Information Gathering

1. **Search existing documentation** using search/fetch tools
2. **Analyze codebase** for existing patterns and constraints
3. **Research external resources** (APIs, libraries, examples)

### Phase 2: Validation & Testing

1. **Create focused prototypes** to test specific hypotheses
2. **Run targeted experiments** to validate assumptions
3. **Document test results** with supporting evidence

### Phase 3: Decision & Documentation

1. **Synthesize findings** into clear recommendations
2. **Document implementation guidance** for development team
3. **Create follow-up tasks** for implementation

## Tools Usage

- **search/searchResults:** Research existing solutions and documentation
- **fetch/githubRepo:** Analyze external APIs, libraries, and examples
- **codebase:** Understand existing system constraints and patterns
- **runTasks:** Execute prototypes and validation tests
- **editFiles:** Update research progress and findings
- **vscodeAPI:** Test VS Code extension capabilities and limitations

Focus on time-boxed research that resolves critical technical decisions and unblocks development progress.
