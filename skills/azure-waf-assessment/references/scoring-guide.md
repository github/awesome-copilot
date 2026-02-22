# Maturity Scoring Guide

Consistent scoring criteria for Well-Architected Framework assessments.

## Scoring Scale Overview

| Level | Name | Description |
|-------|------|-------------|
| 1 | Ad Hoc | No defined process; reactive and inconsistent |
| 2 | Developing | Awareness exists; some practices emerging |
| 3 | Defined | Documented processes; consistently followed |
| 4 | Managed | Metrics tracked; continuous improvement |
| 5 | Optimized | Industry-leading; automated and proactive |

---

## Reliability Scoring

### Level 1 - Ad Hoc
- No defined SLA/SLO
- Single region deployment without redundancy
- No documented DR plan
- Backups not tested
- No resilience patterns implemented

### Level 2 - Developing
- SLA defined but not measured
- Some redundancy within single region
- Basic backup in place
- DR plan exists but not tested
- Manual failover procedures

### Level 3 - Defined
- SLA measured and reported
- Multi-AZ deployment for critical components
- Regular backup verification
- DR plan tested annually
- Retry policies implemented

### Level 4 - Managed
- SLO tracking with automated alerts
- Active-passive multi-region for critical workloads
- Automated DR testing quarterly
- Circuit breakers and bulkheads in place
- Chaos engineering experiments conducted

### Level 5 - Optimized
- Error budgets actively managed
- Active-active multi-region with automatic failover
- Continuous DR validation
- Self-healing architectures
- Proactive capacity management

---

## Security Scoring

### Level 1 - Ad Hoc
- Shared credentials or long-lived keys
- No network segmentation
- Secrets in code or config files
- No security monitoring
- Ad-hoc access grants

### Level 2 - Developing
- Individual accounts but broad permissions
- Basic NSGs in place
- Secrets in Key Vault (some)
- Defender for Cloud enabled but not monitored
- Manual access reviews

### Level 3 - Defined
- RBAC with principle of least privilege
- Network segmentation with NSGs and subnets
- All secrets in Key Vault
- Security alerts monitored during business hours
- Regular access reviews conducted

### Level 4 - Managed
- Managed identities for all service-to-service auth
- Private endpoints for all PaaS services
- Automated secret rotation
- 24/7 security monitoring with defined SLAs
- Privileged Identity Management (PIM) enabled

### Level 5 - Optimized
- Zero-trust architecture fully implemented
- Micro-segmentation with application-level controls
- Hardware security modules for critical keys
- Automated threat response
- Continuous compliance validation

---

## Cost Optimization Scoring

### Level 1 - Ad Hoc
- No visibility into workload costs
- No tagging strategy
- Resources provisioned without size justification
- No budgets defined
- Unused resources accumulate

### Level 2 - Developing
- Total spend known but not by workload
- Basic tagging in place
- Some right-sizing done reactively
- Budgets defined but not monitored
- Occasional cleanup of unused resources

### Level 3 - Defined
- Cost allocation by workload via tags
- Regular cost reviews (monthly)
- Right-sizing performed quarterly
- Budget alerts configured
- Reserved instances for stable workloads

### Level 4 - Managed
- Real-time cost dashboards
- Automated anomaly detection
- Continuous right-sizing recommendations acted upon
- Showback/chargeback to business units
- Savings plans and RIs optimized

### Level 5 - Optimized
- Cost integrated into architecture decisions
- FinOps practice established
- Automated resource lifecycle management
- Spot instances for appropriate workloads
- Continuous cost optimization culture

---

## Operational Excellence Scoring

### Level 1 - Ad Hoc
- Manual deployments via portal
- No source control for infrastructure
- No monitoring beyond basic Azure metrics
- No documented runbooks
- Ad-hoc incident response

### Level 2 - Developing
- Some automation scripts
- Infrastructure partially in source control
- Basic alerting on availability
- Some documentation exists
- Defined escalation path

### Level 3 - Defined
- IaC for all new deployments
- CI/CD pipelines for applications
- Comprehensive monitoring with dashboards
- Runbooks for common operations
- Incident management process defined

### Level 4 - Managed
- All infrastructure as code
- Automated testing in CI/CD
- SLI/SLO tracking with automated alerts
- Post-incident reviews conducted
- Documentation kept current

### Level 5 - Optimized
- GitOps with drift detection
- Continuous delivery with feature flags
- AIOps for proactive issue detection
- Learning culture with blameless post-mortems
- Self-service platforms for developers

---

## Performance Efficiency Scoring

### Level 1 - Ad Hoc
- No performance requirements defined
- Resources sized by guess
- No performance testing
- No caching strategy
- Synchronous processing everywhere

### Level 2 - Developing
- Basic performance expectations
- Resources sized based on similar workloads
- Occasional load testing
- Some caching implemented
- Awareness of async patterns

### Level 3 - Defined
- Performance SLOs defined
- Resources sized based on testing
- Load testing before major releases
- Caching strategy documented
- Async processing for long operations

### Level 4 - Managed
- Performance monitored continuously
- Auto-scaling based on demand
- Regular performance testing in CI/CD
- CDN for static content
- Database query optimization regular

### Level 5 - Optimized
- Performance engineering culture
- Predictive scaling based on patterns
- Performance budgets in development
- Edge computing where beneficial
- Continuous performance optimization

---

## Calculating Overall Scores

### Pillar Score
Average of individual finding scores within the pillar, weighted by severity:
- Critical findings: 0.5x multiplier on score
- High findings: 0.75x multiplier
- Medium findings: 1.0x multiplier
- Low findings: 1.0x multiplier

### Overall Score
Average of all pillar scores, optionally weighted by business priority:
- Mission Critical: Weight reliability and security higher
- Cost Sensitive: Weight cost optimization higher
- High Velocity: Weight operational excellence higher

### Score Interpretation
| Score Range | Assessment | Action |
|-------------|------------|--------|
| 1.0 - 1.9 | Critical gaps | Immediate remediation needed |
| 2.0 - 2.9 | Significant gaps | Prioritize improvements |
| 3.0 - 3.9 | Moderate maturity | Continuous improvement |
| 4.0 - 4.9 | High maturity | Fine-tuning and optimization |
| 5.0 | Exceptional | Maintain and share best practices |
