# Requirements Gathering

Collect project requirements through conversation before making architecture decisions.

## Categories

### 1. Classification

| Type | Description | Implications |
|------|-------------|--------------|
| POC | Proof of concept | Minimal infra, cost-optimized |
| Development | Internal tooling | Balanced, team-focused |
| Production | Customer-facing | Full reliability, monitoring |

### 2. Scale

| Scale | Users | Considerations |
|-------|-------|----------------|
| Small | <1K | Single region, basic SKUs |
| Medium | 1K-100K | Auto-scaling, multi-zone |
| Large | 100K+ | Multi-region, premium SKUs |

### 3. Budget

| Profile | Focus |
|---------|-------|
| Cost-Optimized | Minimize spend, lower SKUs |
| Balanced | Value for money, standard SKUs |
| Performance | Maximum capability, premium SKUs |

### 4. Compliance

| Requirement | Impact |
|-------------|--------|
| Data residency | Region constraints |
| Industry regulations | Security controls |
| Internal policies | Approval workflows |

## Gather via Conversation

Use `ask_user` tool to confirm each of these with the user:

1. Project classification (POC/Dev/Prod)
2. Expected scale
3. Budget constraints
4. Compliance requirements (including data residency preferences)
5. Architecture preferences (if any)

## Document in Plan

Record all requirements in `.azure/plan.md` immediately after gathering.
