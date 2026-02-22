---
name: azure-waf-review
description: |
  Review Azure architectures using the Well-Architected Framework (WAF) pillars.
  Use when:
  (1) Conducting architecture reviews for Azure workloads
  (2) Identifying reliability, security, cost, or performance gaps
  (3) Preparing for Azure Well-Architected Review assessments
  (4) Evaluating existing architectures against best practices
  (5) Creating remediation plans for architecture improvements
  (6) Comparing design options using WAF principles
  Triggers: Well-Architected, WAF, architecture review, reliability review,
  security review, cost optimization, performance review, operational excellence
---

# Azure Architecture WAF Review

Evaluate Azure architectures against the five pillars of the Well-Architected Framework.

## The Five Pillars

| Pillar | Focus | Key Question |
|--------|-------|--------------|
| **Reliability** | Resiliency, availability, recovery | Can the workload recover from failures? |
| **Security** | Protect data, systems, assets | Is the workload protected against threats? |
| **Cost Optimization** | Manage costs, maximize value | Is spending efficient and justified? |
| **Operational Excellence** | Operations, monitoring, DevOps | Can the team operate and improve the workload? |
| **Performance Efficiency** | Scalability, load handling | Does the workload meet performance demands? |

## Review Process

### 1. Scope Definition
- Identify workload boundaries
- Document current architecture (diagram)
- List dependencies and integrations
- Define business requirements (SLA, RTO, RPO)

### 2. Pillar Assessment
For each pillar, evaluate:
- Current state against best practices
- Gaps and risks identified
- Impact (High/Medium/Low)
- Remediation complexity

### 3. Prioritization
Use impact vs effort matrix:
```
         High Impact
              │
   Quick Wins │ Major Projects
              │
Low Effort ───┼─── High Effort
              │
      Fill-ins│ Deprioritize
              │
         Low Impact
```

### 4. Recommendations
- Specific, actionable improvements
- Linked to WAF guidance
- Estimated effort and impact
- Implementation sequence

## Quick Assessment Checklist

### Reliability
- [ ] Multi-region or availability zone deployment?
- [ ] Defined RTO and RPO targets?
- [ ] Automated failover configured?
- [ ] Health probes and self-healing?
- [ ] Backup strategy tested?
- [ ] Chaos engineering practiced?

### Security
- [ ] Zero-trust network model?
- [ ] Managed identities used?
- [ ] Secrets in Key Vault?
- [ ] Encryption at rest and in transit?
- [ ] WAF for internet-facing apps?
- [ ] Defender for Cloud enabled?

### Cost Optimization
- [ ] Right-sized resources?
- [ ] Reserved instances for steady workloads?
- [ ] Auto-scaling configured?
- [ ] Orphaned resources cleaned up?
- [ ] Cost alerts and budgets set?
- [ ] Storage lifecycle policies?

### Operational Excellence
- [ ] Infrastructure as Code?
- [ ] CI/CD pipelines?
- [ ] Centralized logging?
- [ ] Alerts and dashboards?
- [ ] Runbooks for common issues?
- [ ] Post-incident reviews conducted?

### Performance Efficiency
- [ ] Appropriate service tiers?
- [ ] Caching strategy implemented?
- [ ] CDN for static content?
- [ ] Database query optimization?
- [ ] Load testing performed?
- [ ] Auto-scaling rules defined?

## Severity Classification

| Severity | Criteria | Action |
|----------|----------|--------|
| Critical | Active security risk or outage likely | Immediate remediation |
| High | Significant gap in WAF compliance | Remediate within 30 days |
| Medium | Best practice not followed | Plan for next quarter |
| Low | Optimization opportunity | Backlog for future |

## Review Output Template

```markdown
## Architecture Review: [Workload Name]

**Date**: [Review Date]
**Reviewer**: [Name]
**Stakeholders**: [List]

### Executive Summary
[2-3 sentence overview of findings]

### Architecture Diagram
[Link to diagram]

### Findings by Pillar

#### Reliability (Score: X/5)
| Finding | Severity | Recommendation |
|---------|----------|----------------|
| [Gap] | [H/M/L] | [Action] |

#### Security (Score: X/5)
...

### Prioritized Recommendations
1. [Highest priority item]
2. [Second priority]
3. [Third priority]

### Next Steps
- [Action items with owners and dates]
```

## References

- **Reliability pillar**: See [references/reliability.md](references/reliability.md)
- **Security pillar**: See [references/security.md](references/security.md)
- **Cost optimization**: See [references/cost.md](references/cost.md)
- **Operational excellence**: See [references/operations.md](references/operations.md)
- **Performance efficiency**: See [references/performance.md](references/performance.md)
