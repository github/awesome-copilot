# Operational Runbook: [Service Name]

## 1. Incident Overview
* **Service:** Name of the affected component/service.
* **Severity:** P1 (Critical) / P2 (Major) / P3 (Minor)
* **Target Audience:** SREs, DevOps Engineers, On-Call Engineers.

## 2. Diagnosis Checklist
Follow these steps systematically to isolate the root cause:

- [ ] **Check Service Status:** Run the following command to check if the instances are healthy:
  ```bash
  # Example command (adapt to stack, e.g., kubectl get pods or docker ps)