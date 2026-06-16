---
name: 'dba-governance'
description: 'Skill to review hardening, permissions, backup/restore and operational continuity'
---

# DBA Government: Security and Reliability

## Purpose
Evaluate operational maturity of SQL Server in security, continuity and minimum technical compliance.

## Entries
- Target instance or database
- Internal policies (if they exist)
- RPO/RTO objectives

## Departures
- Prioritized risk findings
- Remediation Plan
- Continuity checklist
- Evidence of technical audit

## Steps

### 1. Backups and recovery
- Verifica backups full/diff/log
- Validate test restoration
- Contrast with target RPO/RTO

### 2. Permissions and privileged accounts
- Review accounts with high privileges
- Detects excessive or unjustified grants
- Proposes a minimum privilege model

### 3. Configuration and hardening
- Review attack surface configurations
- Verify access and encryption policies
- Identify high risk setups

### 4. Remediation plan
- Prioritize by criticality and effort
- Defines those responsible and window of change

### 5. Monitoring
- Defines residual risk indicators
- Periodic re-audit program

## Quality Checklist
- [ ] Critical risks identified
- [ ] Plan actionable by priority
- [ ] Evidence of documented verification
- [ ] Estimated residual risk
