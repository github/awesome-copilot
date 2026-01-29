---
name: azure-landing-zone-architect
description: |
  Design and evolve Azure Landing Zones following Microsoft's Cloud Adoption Framework.
  Use when:
  (1) Designing a new Azure platform foundation or landing zone
  (2) Evaluating or evolving an existing landing zone architecture
  (3) Planning identity, networking, governance, or security design areas
  (4) Implementing hub-spoke or Virtual WAN topologies
  (5) Setting up management groups, policies, and subscription organization
  (6) Designing platform vs application landing zones
  Triggers: landing zone, ALZ, Cloud Adoption Framework, CAF, platform design,
  management groups, hub-spoke, Virtual WAN, subscription vending, governance
---

# Azure Landing Zone Architect

Design Azure platforms that are secure, scalable, and governed from day one.

## Landing Zone Conceptual Architecture

```
Tenant Root Group
├── Platform
│   ├── Management          # Logging, monitoring, automation
│   ├── Identity            # Azure AD, domain controllers
│   └── Connectivity        # Hub networking, DNS, firewall
└── Landing Zones
    ├── Corp                 # Internal workloads (private connectivity)
    ├── Online               # Internet-facing workloads
    └── Sandbox              # Development/experimentation
```

## Design Areas

### 1. Identity and Access Management
- Azure AD tenant design
- Privileged Identity Management (PIM)
- Conditional Access policies
- Hybrid identity with AD DS

### 2. Network Topology and Connectivity
- Hub-spoke vs Virtual WAN
- Private DNS zones
- ExpressRoute/VPN connectivity
- Azure Firewall or NVA placement

### 3. Resource Organization
- Management group hierarchy
- Subscription design patterns
- Naming and tagging standards
- Resource group strategies

### 4. Governance and Compliance
- Azure Policy assignments
- Regulatory compliance (SOC2, ISO, HIPAA)
- Cost management boundaries
- Blueprints and guardrails

### 5. Security
- Microsoft Defender for Cloud
- Network segmentation
- Encryption standards
- Security baseline policies

### 6. Management and Monitoring
- Log Analytics workspace topology
- Azure Monitor configuration
- Automation accounts
- Update management

### 7. Platform Automation
- Infrastructure as Code strategy
- CI/CD for platform
- Subscription vending automation
- GitOps for policy

### 8. Business Continuity
- Backup policies
- Disaster recovery regions
- RPO/RTO requirements
- Cross-region replication

## Quick Decision Framework

| Question | If Yes → | If No → |
|----------|----------|---------|
| Multi-region with >50 VNets? | Virtual WAN | Hub-spoke |
| Need SD-WAN integration? | Virtual WAN | Hub-spoke |
| Complex routing requirements? | Azure Firewall | NSGs + UDRs |
| Regulatory compliance? | Dedicated subscriptions | Shared with policies |
| >10 application teams? | Subscription vending | Manual provisioning |

## Platform Landing Zone Checklist

- [ ] Management group hierarchy defined
- [ ] Subscription naming convention established
- [ ] Connectivity model selected (hub-spoke/vWAN)
- [ ] Identity integration planned
- [ ] Policy baseline selected
- [ ] Logging architecture designed
- [ ] BCDR strategy documented

## References

- **Identity design**: See [references/identity.md](references/identity.md)
- **Network topology**: See [references/networking.md](references/networking.md)
- **Governance patterns**: See [references/governance.md](references/governance.md)
- **Security baseline**: See [references/security.md](references/security.md)
