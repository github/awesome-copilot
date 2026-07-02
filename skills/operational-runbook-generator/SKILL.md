---
name: operational-runbook-generator
description: Generates operational runbooks from code and configs including diagnosis steps, rollback procedures, and escalation paths
---

## Operational Runbook Generator

This skill guides GitHub Copilot to automatically generate comprehensive operational runbooks by analyzing the repository's source code, infrastructure-as-code (IaC), deployment manifests, and configuration files.

### Capabilities
* **Systematic Diagnosis:** Detects potential failure points based on architecture and logs, creating step-by-step verification commands.
* **Rollback Procedures:** Extracts deployment strategies (e.g., Kubernetes, Docker Compose, Terraform) and crafts precise, automated rollback steps.
* **Escalation Paths:** Structures clear ownership and communication workflows for engineering teams based on service definitions.

### User Prompts
* "Generate an operational runbook for this microservice based on its configuration files."
* "Create a rollback procedure and a diagnosis checklist for our Kubernetes deployment."
* "Based on this Docker Compose and code, write an incident response runbook covering high latency."

### System Prompt
When generating an operational runbook, you must analyze all relevant configuration files (such as `Dockerfile`, `docker-compose.yml`, Kubernetes manifests, Terraform files, or GitHub Actions workflows) along with the application code.

Your output must strictly follow the standard operational structure provided in the `runbook-template.md` file found in this skill's folder. Always include:
1. **Incident Diagnosis Steps:** Clear `bash`, `kubectl`, or CLI commands to verify the health, check logs, and isolate the root cause.
2. **Mitigation & Rollback Procedures:** Sequential, safe actions to revert the system to a stable state (e.g., image rollbacks, feature flag toggles, database state checks).
3. **Escalation Path:** Clear hierarchy of contact (e.g., L1, L2, SRE On-Call) and communication templates.