# WAF Assessment Question Bank

Complete question set for Azure Well-Architected Framework assessments, organized by pillar.

## Reliability Questions

### Availability Design
1. What is the target SLA/SLO for this workload?
2. What availability zones or regions does this workload span?
3. How do critical components handle zone or region failures?
4. What single points of failure exist in the architecture?
5. How is state managed if a component fails mid-transaction?

### Disaster Recovery
6. What is the defined RPO (Recovery Point Objective)?
7. What is the defined RTO (Recovery Time Objective)?
8. Where are backups stored, and how often are they tested?
9. Is there a documented DR runbook?
10. When was the last DR test, and what was the outcome?

### Resilience
11. How does the application handle downstream service failures?
12. Are retry policies and circuit breakers implemented?
13. How do you handle transient failures (network blips, throttling)?
14. What happens if the database becomes temporarily unavailable?
15. How does the system degrade gracefully under partial failure?

### Testing
16. Do you perform chaos engineering or fault injection testing?
17. How do you validate that failover mechanisms work?
18. Are load tests run to verify behavior under stress?

## Security Questions

### Identity & Access
1. How do users authenticate to this application?
2. How do services authenticate to each other and to Azure resources?
3. Are managed identities used where possible?
4. What is the process for granting access to production?
5. How often are access permissions reviewed?
6. Is privileged access time-bound (PIM/JIT)?

### Data Protection
7. How is data classified (public, internal, confidential, restricted)?
8. Is data encrypted at rest? What mechanisms?
9. Is data encrypted in transit? TLS version?
10. How are encryption keys managed and rotated?
11. Where are secrets stored, and how are they accessed?

### Network Security
12. Is the workload deployed in a VNet?
13. Are private endpoints used for PaaS services?
14. What network segmentation exists (NSGs, subnets)?
15. Is there a WAF in front of public endpoints?
16. How is egress traffic controlled and monitored?

### Threat Detection
17. Is Microsoft Defender for Cloud enabled?
18. How are security alerts monitored and responded to?
19. Is there a defined incident response process?
20. How do you track vulnerabilities in dependencies?

## Cost Optimization Questions

### Visibility
1. Do you know what this workload costs monthly?
2. How are costs tracked and allocated (tags, subscriptions)?
3. Who reviews cost reports, and how often?
4. Are cost anomaly alerts configured?
5. Are there defined budgets with alerts?

### Right-Sizing
6. When were compute resources last right-sized?
7. Are auto-scaling policies in place?
8. How do you identify underutilized resources?
9. Are dev/test environments scaled down after hours?

### Commitment Discounts
10. Are Reserved Instances used for predictable workloads?
11. Are Savings Plans used for compute?
12. Are Spot VMs used where appropriate?

### Architecture Efficiency
13. Are PaaS services used where possible vs. IaaS?
14. Is there unnecessary data duplication or redundancy?
15. Are there zombie resources (unused disks, IPs, etc.)?
16. Could serverless options reduce cost for variable workloads?

## Operational Excellence Questions

### DevOps Practices
1. Is all infrastructure defined as code (Bicep/Terraform)?
2. What percentage of infrastructure is managed via IaC?
3. How are changes deployed to production?
4. How long does a typical deployment take?
5. How do you roll back a failed deployment?

### Source Control
6. Is all code in source control?
7. Are pull requests required for changes?
8. Is there a branch protection strategy?

### Monitoring
9. What metrics are collected for this workload?
10. What is alerted on, and who receives alerts?
11. How do you know when the system is healthy vs. degraded?
12. Is there a dashboard for operational visibility?
13. Are logs centralized? Where?

### Incident Management
14. Is there an on-call rotation?
15. Is there a defined incident response process?
16. How are incidents documented and reviewed (post-mortems)?
17. What was the last major incident, and what did you learn?

### Documentation
18. Is there a runbook for common operational tasks?
19. How does a new team member get onboarded?
20. Is the architecture documented and kept current?

## Performance Efficiency Questions

### Baseline
1. What are the key performance metrics for this workload?
2. What are the defined performance targets (latency, throughput)?
3. How do you know if performance is acceptable?
4. When did you last performance test this workload?

### Compute Tier
5. How was the current compute tier selected?
6. Is auto-scaling enabled? What triggers scaling?
7. What is the typical CPU/memory utilization?
8. Are there known compute bottlenecks?

### Data Tier
9. What database technology is used, and why?
10. Is the database tier appropriately sized?
11. Are queries optimized? When were they last reviewed?
12. Is caching used to reduce database load?
13. Are indexes optimized for query patterns?

### Network
14. What is the typical latency for key operations?
15. Is CDN used for static content?
16. Is traffic routed to the nearest region?
17. Are there known network bottlenecks?

### Optimization
18. Is asynchronous processing used for long-running tasks?
19. Are batch operations used where appropriate?
20. Is content compressed for transfer?
