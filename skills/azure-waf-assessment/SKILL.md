---
name: azure-waf-assessment
description: |
  Guided Q&A workflow for conducting Azure Well-Architected Framework assessments.
  Use this skill when:
  - Running interactive architecture assessments with stakeholders
  - Gathering structured input about Azure workloads
  - Conducting WAF pillar-specific deep dives
  - Documenting assessment findings systematically
  This skill provides the conversation structure, question frameworks, and output templates
  for assessments. For interpretation of findings, use azure-architecture-waf-review.
---

# Azure Architecture Assessment Runner

Conduct structured Well-Architected Framework assessments through guided Q&A sessions.

## Assessment Types

1. **Full WAF Assessment** - All 5 pillars, 60-90 minutes
2. **Pillar Deep Dive** - Single pillar focus, 30-45 minutes
3. **Quick Health Check** - Key questions only, 15-20 minutes
4. **Pre-Production Review** - Launch readiness, 45-60 minutes

## Starting an Assessment

Before beginning, gather:
- Workload name and business purpose
- Architecture diagram (if available)
- Current Azure services in use
- Team roles participating

## Assessment Flow

```
1. Context Gathering (5 min)
   └── Workload overview, criticality, current state

2. Pillar Assessment (varies)
   ├── Reliability Questions
   ├── Security Questions
   ├── Cost Optimization Questions
   ├── Operational Excellence Questions
   └── Performance Efficiency Questions

3. Finding Synthesis (10 min)
   └── Summarize gaps, prioritize recommendations

4. Action Planning (10 min)
   └── Assign owners, set timelines
```

## Question Framework

For each question:
1. Ask the question clearly
2. Listen to the response
3. Probe for details if answer is vague
4. Note the maturity level (1-5)
5. Record specific gaps or risks

### Maturity Levels
- **1 - Ad Hoc**: No process, reactive only
- **2 - Developing**: Some awareness, inconsistent
- **3 - Defined**: Documented process exists
- **4 - Managed**: Metrics tracked, continuous improvement
- **5 - Optimized**: Industry-leading practices

## Core Questions by Pillar

See [references/questions.md](references/questions.md) for the complete question bank.

### Quick Health Check Questions (1-2 per pillar)

**Reliability**
> "If your primary region became unavailable right now, what would happen to this workload?"

**Security**
> "How do you manage access credentials and secrets for this application?"

**Cost**
> "Do you have visibility into what this workload costs monthly, and who reviews it?"

**Operations**
> "How do you deploy changes to production, and how would you roll back a bad deployment?"

**Performance**
> "How do you know when this application is performing well vs. struggling?"

## Documenting Findings

### Finding Template
```markdown
## Finding: [Short Title]

**Pillar**: [Reliability|Security|Cost|Operations|Performance]
**Severity**: [Critical|High|Medium|Low]
**Current State**: [What exists today]
**Gap**: [What's missing or inadequate]
**Risk**: [What could go wrong]
**Recommendation**: [What to do]
**Effort**: [S/M/L]
**Priority**: [P1/P2/P3]
```

### Assessment Report Structure

See [references/report-template.md](references/report-template.md) for the full template.

```markdown
# WAF Assessment Report: [Workload Name]

## Executive Summary
- Assessment date and participants
- Overall maturity score
- Top 3-5 priority recommendations

## Pillar Scores
| Pillar | Score (1-5) | Key Gap |
|--------|-------------|---------|
| Reliability | X | ... |
| Security | X | ... |
| Cost | X | ... |
| Operations | X | ... |
| Performance | X | ... |

## Detailed Findings
[Organized by pillar]

## Recommendations Roadmap
[Prioritized action items with owners]

## Appendix
- Full question responses
- Architecture diagrams
- Reference links
```

## Probing Techniques

When answers are vague:
- "Can you walk me through what happens when...?"
- "Who is responsible for that, and how do they know it's working?"
- "When was the last time you tested that?"
- "What would you do if that failed at 2 AM?"
- "How would a new team member learn about this?"

## Session Management

### Opening Script
> "Today we're going to review [workload] against the Azure Well-Architected Framework. This isn't an audit—it's a collaborative discussion to identify improvement opportunities. I'll ask questions across five areas: reliability, security, cost, operations, and performance. There are no wrong answers; I'm trying to understand your current state. Let's start with an overview of the workload."

### Closing Script
> "Thank you for your time. Based on our discussion, I've identified [N] findings across the five pillars. The top priorities appear to be [1, 2, 3]. I'll compile a detailed report with recommendations and share it by [date]. Any questions before we wrap up?"

## References

- [questions.md](references/questions.md) - Complete question bank by pillar
- [report-template.md](references/report-template.md) - Full assessment report template
- [scoring-guide.md](references/scoring-guide.md) - Maturity scoring criteria
