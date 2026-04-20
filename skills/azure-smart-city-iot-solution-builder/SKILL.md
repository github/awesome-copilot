---
name: azure-smart-city-iot-solution-builder
description: 'Design and plan end-to-end Azure IoT and Smart City solutions: requirements, architecture, security, operations, cost, and a phased delivery plan with concrete implementation artifacts.'
---

# Azure Smart City IoT Solution Builder

Use this skill to rebuild and standardize a complete workflow for Azure IoT and Smart City solutions.

## When to use it

Use this skill when the user asks for things like:

- "I want to build an IoT solution on Azure"
- "Smart City architecture for traffic, lighting, or waste"
- "How do I connect devices, analytics, and alerts?"
- "I need a roadmap and backlog for an urban platform"

## Objectives

- Convert a high-level idea into a deployable architecture.
- Reuse existing Azure-focused skills whenever possible.
- Produce concrete artifacts the team can implement.

## Workflow

### 0) Mandatory documentation review (before any architecture)

Before proposing architecture or technology decisions that involve edge computing, review Azure IoT Edge documentation first:

- https://learn.microsoft.com/azure/iot-edge/

Minimum pages to review:

- What is Azure IoT Edge
- Runtime architecture
- Supported systems
- Version history/release notes
- Relevant Linux/Windows quickstarts for the scenario

If documentation cannot be consulted, state this explicitly and continue with clearly marked assumptions.

### 1) Scope and constraints

Collect and confirm:

- City domain: mobility, parking, air quality, water, energy, public safety, waste, etc.
- Scale: number of devices, telemetry frequency, retention, regions.
- Latency and availability objectives.
- Regulatory and privacy constraints.
- Existing systems to integrate (SCADA, GIS, ERP, ticketing, APIs).

### 2) Capability map

Split the platform into layers:

- Device and edge: onboarding, identity, firmware, OTA, edge processing.
- Ingestion and messaging: command and control, event routing, buffering.
- Data and analytics: hot path vs cold path, dashboards, historical analysis.
- Operations: observability, incident flow, SLOs.
- Governance: RBAC, secrets, policies, network isolation.

### 3) Azure service selection (reference)

- Device connectivity: Azure IoT Hub, Azure IoT Operations, IoT Edge.
- Event streaming: Event Hubs, Service Bus, Event Grid.
- Storage: Blob Storage, Data Lake, Cosmos DB, SQL.
- Analytics: Azure Data Explorer, Stream Analytics, Fabric/Synapse.
- APIs and applications: API Management, App Service, Container Apps, Functions.
- Monitoring: Azure Monitor, Application Insights, Log Analytics.
- Security: Key Vault, Defender for IoT, Private Endpoints, Managed Identity.

### 4) Non-functional design

Define and document:

- Reliability model (zones/regions, retries, dead-letter handling, replay).
- Security controls (zero trust, encryption, secret rotation, least privilege).
- Cost controls (retention tiers, rightsizing, autoscaling, workload scheduling).
- Data lifecycle (raw, curated, aggregated, archived).

### 5) Delivery plan

Create a phased execution:

- Phase 1: Pilot district or single use case.
- Phase 2: Multi-domain integration.
- Phase 3: City-scale rollout and optimization.

For each phase, include:

- Exit criteria
- Dependencies
- Risks and mitigations
- KPI set

## Reuse other skills first

There are two sources of skills:

- Runtime-provided skills (external to this repository): only available when the Copilot host environment exposes them.
- Local repository skills (this repository): available as local files under `skills/`.

### Runtime-provided Azure skills (optional)

If they are available in the execution environment, delegate to these specialized skills for deeper guidance:

- `azure-kubernetes`
- `azure-messaging`
- `azure-observability`
- `azure-storage`
- `azure-rbac`
- `azure-cost`
- `azure-validate`
- `azure-deploy`

### Local repository alternatives (use in this repo)

When runtime skills are not available, prioritize existing local skills in this repository:

- `azure-architecture-autopilot` for architecture generation and refinement.
- `azure-resource-visualizer` for resource relationship diagrams.
- `azure-role-selector` for role selection guidance.
- `az-cost-optimize` and `azure-pricing` for cost and pricing analysis.
- `azure-deployment-preflight` for pre-deployment checks.
- `appinsights-instrumentation` for telemetry instrumentation patterns.

If no specialized skill is available, continue with this skill and keep assumptions explicit.

## Required output artifacts

Always provide these outputs:

1. Smart City solution summary (scope, assumptions, constraints).
2. Reference architecture (components and data flow).
3. Security and governance checklist.
4. Cost and scaling strategy.
5. Phased implementation backlog (epics and milestones).

## Output template

Use this response structure:

1. Context and objectives
2. Proposed architecture
3. Technology decisions and trade-offs
4. Security, operations, and cost controls
5. Phased implementation plan
6. Risks and open questions

## Guidelines

- Do not jump to deployment before validating prerequisites.
- Do not recommend single-region production for critical city workloads.
- Do not omit operational ownership (who handles incidents, SLAs, change windows).
- Clearly separate assumptions from confirmed facts.
