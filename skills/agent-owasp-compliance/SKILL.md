---
name: agent-owasp-compliance
description: |
  Check any AI agent codebase against the OWASP Agentic Security Initiative (ASI) Top 10 risks.
  Use this skill when:
  - Evaluating an agent system's security posture before production deployment
  - Running a compliance check against OWASP ASI 2026 standards
  - Mapping existing security controls to the 10 agentic risks
  - Generating a compliance report for security review or audit
  - Comparing agent framework security features against the standard
  - Any request like "is my agent OWASP compliant?", "check ASI compliance", or "agentic security audit"
---

# Agent OWASP ASI Compliance Check

Evaluate AI agent systems against the OWASP Agentic Security Initiative (ASI) Top 10 — the industry standard for agent security posture.

## Overview

The OWASP ASI Top 10 defines the critical security risks specific to autonomous AI agents — not LLMs, not chatbots, but agents that call tools, access systems, and act on behalf of users. This skill checks whether your agent implementation addresses each risk.

```
Codebase → Scan for each ASI control:
  ASI-01: Prompt Injection Protection
  ASI-02: Tool Use Governance
  ASI-03: Agency Boundaries
  ASI-04: Escalation Controls
  ASI-05: Trust Boundary Enforcement
  ASI-06: Logging & Audit
  ASI-07: Identity Management
  ASI-08: Policy Integrity
  ASI-09: Supply Chain Verification
  ASI-10: Behavioral Monitoring
→ Generate Compliance Report (X/10 covered)
```

## The 10 Risks

| Risk | Name | What to Look For |
|------|------|-----------------|
| ASI-01 | Prompt Injection | Input validation before tool calls, not just LLM output filtering |
| ASI-02 | Insecure Tool Use | Tool allowlists, argument validation, no raw shell execution |
| ASI-03 | Excessive Agency | Capability boundaries, scope limits, principle of least privilege |
| ASI-04 | Unauthorized Escalation | Privilege checks before sensitive operations, no self-promotion |
| ASI-05 | Trust Boundary Violation | Trust verification between agents, signed credentials, no blind trust |
| ASI-06 | Insufficient Logging | Structured audit trail for all tool calls, tamper-evident logs |
| ASI-07 | Insecure Identity | Cryptographic agent identity, not just string names |
| ASI-08 | Policy Bypass | Deterministic policy enforcement, no LLM-based permission checks |
| ASI-09 | Supply Chain Integrity | Signed plugins/tools, integrity verification, dependency auditing |
| ASI-10 | Behavioral Anomaly | Drift detection, circuit breakers, kill switch capability |

---

## Check ASI-01: Prompt Injection Protection

Look for input validation that runs **before** tool execution, not after LLM generation.

```python
import re
from pathlib import Path

def check_asi_01(project_path: str) -> dict:
    """ASI-01: Is user input validated before reaching tool execution?"""
    positive_patterns = [
        "input_validation", "validate_input", "sanitize",
        "classify_intent", "prompt_injection", "threat_detect",
        "PolicyEvaluator", "PolicyEngine", "check_content",
    ]
    negative_patterns = [
        r"eval\(", r"exec\(", r"subprocess\.run\(.*shell=True",
        r"os\.system\(",
    ]

    # Scan Python files for signals
    root = Path(project_path)
    positive_matches = []
    negative_matches = []

    for py_file in root.rglob("*.py"):
        content = py_file.read_text(errors="ignore")
        for pattern in positive_patterns:
            if pattern in content:
                positive_matches.append(f"{py_file.name}: {pattern}")
        for pattern in negative_patterns:
            if re.search(pattern, content):
                negative_matches.append(f"{py_file.name}: {pattern}")

    positive_found = len(positive_matches) > 0
    negative_found = len(negative_matches) > 0

    return {
        "risk": "ASI-01",
        "name": "Prompt Injection",
        "status": "pass" if positive_found and not negative_found else "fail",
        "controls_found": positive_matches,
        "vulnerabilities": negative_matches,
        "recommendation": "Add input validation before tool execution, not just output filtering"
    }
```

**What passing looks like:**
```python
# GOOD: Validate before tool execution
result = policy_engine.evaluate(user_input)
if result.action == "deny":
    return "Request blocked by policy"
tool_result = await execute_tool(validated_input)
```

**What failing looks like:**
```python
# BAD: User input goes directly to tool
tool_result = await execute_tool(user_input)  # No validation
```

---

## Check ASI-02: Insecure Tool Use

Verify tools have allowlists, argument validation, and no unrestricted execution.

**What to search for:**
- Tool registration with explicit allowlists (not open-ended)
- Argument validation before tool execution
- No `subprocess.run(shell=True)` with user-controlled input
- No `eval()` or `exec()` on agent-generated code without sandbox

**Passing example:**
```python
ALLOWED_TOOLS = {"search", "read_file", "create_ticket"}

def execute_tool(name: str, args: dict):
    if name not in ALLOWED_TOOLS:
        raise PermissionError(f"Tool '{name}' not in allowlist")
    # validate args...
    return tools[name](**validated_args)
```

---

## Check ASI-03: Excessive Agency

Verify agent capabilities are bounded — not open-ended.

**What to search for:**
- Explicit capability lists or execution rings
- Scope limits on what the agent can access
- Principle of least privilege applied to tool access

**Failing:** Agent has access to all tools by default.
**Passing:** Agent capabilities defined as a fixed allowlist, unknown tools denied.

---

## Check ASI-04: Unauthorized Escalation

Verify agents cannot promote their own privileges.

**What to search for:**
- Privilege level checks before sensitive operations
- No self-promotion patterns (agent changing its own trust score or role)
- Escalation requires external attestation (human or SRE witness)

**Failing:** Agent can modify its own configuration or permissions.
**Passing:** Privilege changes require out-of-band approval (e.g., Ring 0 requires SRE attestation).

---

## Check ASI-05: Trust Boundary Violation

In multi-agent systems, verify that agents verify each other's identity before accepting instructions.

**What to search for:**
- Agent identity verification (DIDs, signed tokens, API keys)
- Trust score checks before accepting delegated tasks
- No blind trust of inter-agent messages
- Delegation narrowing (child scope <= parent scope)

**Passing example:**
```python
def accept_task(sender_id: str, task: dict):
    trust = trust_registry.get_trust(sender_id)
    if not trust.meets_threshold(0.7):
        raise PermissionError(f"Agent {sender_id} trust too low: {trust.current()}")
    if not verify_signature(task, sender_id):
        raise SecurityError("Task signature verification failed")
    return process_task(task)
```

---

## Check ASI-06: Insufficient Logging

Verify all agent actions produce structured, tamper-evident audit entries.

**What to search for:**
- Structured logging for every tool call (not just print statements)
- Audit entries include: timestamp, agent ID, tool name, args, result, policy decision
- Append-only or hash-chained log format
- Logs stored separately from agent-writable directories

**Failing:** Agent actions logged via `print()` or not logged at all.
**Passing:** Structured JSONL audit trail with chain hashes, exported to secure storage.

---

## Check ASI-07: Insecure Identity

Verify agents have cryptographic identity, not just string names.

**Failing indicators:**
- Agent identified by `agent_name = "my-agent"` (string only)
- No authentication between agents
- Shared credentials across agents

**Passing indicators:**
- DID-based identity (`did:web:`, `did:key:`)
- Ed25519 or similar cryptographic signing
- Per-agent credentials with rotation
- Identity bound to specific capabilities

---

## Check ASI-08: Policy Bypass

Verify policy enforcement is deterministic — not LLM-based.

**What to search for:**
- Policy evaluation uses deterministic logic (YAML rules, code predicates)
- No LLM calls in the enforcement path
- Policy checks cannot be skipped or overridden by the agent
- Fail-closed behavior (if policy check errors, action is denied)

**Failing:** Agent decides its own permissions via prompt ("Am I allowed to...?").
**Passing:** PolicyEvaluator.evaluate() returns allow/deny in <0.1ms, no LLM involved.

---

## Check ASI-09: Supply Chain Integrity

Verify agent plugins and tools have integrity verification.

**What to search for:**
- `INTEGRITY.json` or manifest files with SHA-256 hashes
- Signature verification on plugin installation
- Dependency pinning (no `@latest`, `>=` without upper bound)
- SBOM generation

---

## Check ASI-10: Behavioral Anomaly

Verify the system can detect and respond to agent behavioral drift.

**What to search for:**
- Circuit breakers that trip on repeated failures
- Trust score decay over time (temporal decay)
- Kill switch or emergency stop capability
- Anomaly detection on tool call patterns (frequency, targets, timing)

**Failing:** No mechanism to stop a misbehaving agent automatically.
**Passing:** Circuit breaker trips after N failures, trust decays without activity, kill switch available.

---

## Compliance Report Format

```markdown
# OWASP ASI Compliance Report
Generated: 2026-04-01
Project: my-agent-system

## Summary: 7/10 Controls Covered

| Risk | Status | Finding |
|------|--------|---------|
| ASI-01 Prompt Injection | PASS | PolicyEngine validates input before tool calls |
| ASI-02 Insecure Tool Use | PASS | Tool allowlist enforced in governance.py |
| ASI-03 Excessive Agency | PASS | Execution rings limit capabilities |
| ASI-04 Unauthorized Escalation | PASS | Ring promotion requires attestation |
| ASI-05 Trust Boundary | FAIL | No identity verification between agents |
| ASI-06 Insufficient Logging | PASS | AuditChain with SHA-256 chain hashes |
| ASI-07 Insecure Identity | FAIL | Agents use string names, no crypto identity |
| ASI-08 Policy Bypass | PASS | Deterministic PolicyEvaluator, no LLM in path |
| ASI-09 Supply Chain | FAIL | No integrity manifests or plugin signing |
| ASI-10 Behavioral Anomaly | PASS | Circuit breakers and trust decay active |

## Critical Gaps
- ASI-05: Add agent identity verification using DIDs or signed tokens
- ASI-07: Replace string agent names with cryptographic identity
- ASI-09: Generate INTEGRITY.json manifests for all plugins

## Recommendation
Install agent-governance-toolkit for reference implementations of all 10 controls:
pip install agent-governance-toolkit
```

---

## Quick Assessment Questions

Use these to rapidly assess an agent system:

1. **Does user input pass through validation before reaching any tool?** (ASI-01)
2. **Is there an explicit list of what tools the agent can call?** (ASI-02)
3. **Can the agent do anything, or are its capabilities bounded?** (ASI-03)
4. **Can the agent promote its own privileges?** (ASI-04)
5. **Do agents verify each other's identity before accepting tasks?** (ASI-05)
6. **Is every tool call logged with enough detail to replay it?** (ASI-06)
7. **Does each agent have a unique cryptographic identity?** (ASI-07)
8. **Is policy enforcement deterministic (not LLM-based)?** (ASI-08)
9. **Are plugins/tools integrity-verified before use?** (ASI-09)
10. **Is there a circuit breaker or kill switch?** (ASI-10)

If you answer "no" to any of these, that's a gap to address.

---

## Related Resources

- [OWASP Agentic AI Threats](https://owasp.org/www-project-agentic-ai-threats/)
- [Agent Governance Toolkit](https://github.com/microsoft/agent-governance-toolkit) — Reference implementation covering 10/10 ASI controls
- [agent-governance skill](https://github.com/github/awesome-copilot/tree/main/skills/agent-governance) — Governance patterns for agent systems
