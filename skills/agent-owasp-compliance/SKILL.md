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

Evaluate AI agent systems against the OWASP Top 10 for Agentic Applications 2026, published in December 2025 by the OWASP GenAI Security Project's Agentic Security Initiative (ASI).

## Overview

The OWASP Top 10 for Agentic Applications defines the highest-impact security risks specific to autonomous AI agents — not LLMs, not chatbots, but agents that call tools, access systems, and act on behalf of users. This skill checks whether your agent implementation has controls for each risk. The IDs and names below are the published ones; use them as written in reports so each finding traces back to the OWASP entry.

```
Codebase → Scan for controls against each ASI risk:
  ASI01: Agent Goal Hijack
  ASI02: Tool Misuse and Exploitation
  ASI03: Identity and Privilege Abuse
  ASI04: Agentic Supply Chain Vulnerabilities
  ASI05: Unexpected Code Execution (RCE)
  ASI06: Memory & Context Poisoning
  ASI07: Insecure Inter-Agent Communication
  ASI08: Cascading Failures
  ASI09: Human-Agent Trust Exploitation
  ASI10: Rogue Agents
→ Generate Compliance Report (X/10 covered)
```

## The 10 Risks

| Risk | Name | What to Look For |
|------|------|-----------------|
| ASI01 | Agent Goal Hijack | Untrusted input (prompts, documents, retrieved content, tool output) validated before it can change goals, plans or tool calls |
| ASI02 | Tool Misuse and Exploitation | Tool allowlists, per-tool least privilege, argument validation, rate and cost limits |
| ASI03 | Identity and Privilege Abuse | Per-agent identity, short-lived scoped credentials, no self-promotion, no unscoped privilege inheritance on delegation |
| ASI04 | Agentic Supply Chain Vulnerabilities | Signed or hash-pinned plugins, tools, prompts and MCP servers, dependency pinning, SBOM |
| ASI05 | Unexpected Code Execution (RCE) | No `eval()`/`exec()` or `shell=True` on agent-generated input, generated code run in a sandbox |
| ASI06 | Memory & Context Poisoning | Validated memory and RAG writes, per-user or per-tenant segmentation, provenance, expiry of unverified entries |
| ASI07 | Insecure Inter-Agent Communication | Authenticated and signed inter-agent messages, replay protection, no blind trust of peer agents |
| ASI08 | Cascading Failures | Circuit breakers and quotas between agents, deterministic policy enforcement outside the planner, fail-closed |
| ASI09 | Human-Agent Trust Exploitation | Explicit confirmation for sensitive actions, risk summaries not written by the model, previews with no side effects |
| ASI10 | Rogue Agents | Tamper-evident audit trail, behavioral monitoring against a baseline, kill switch and credential revocation |

---

## Check ASI01: Agent Goal Hijack

Look for input validation that runs **before** tool execution, not after LLM generation. OWASP treats all natural-language input, including uploaded documents and retrieved content, as untrusted until it has been validated.

```python
from pathlib import Path

def check_asi_01(project_path: str) -> dict:
    """ASI01: Is user input validated before reaching tool execution?"""
    positive_patterns = [
        "input_validation", "validate_input", "sanitize",
        "classify_intent", "prompt_injection", "threat_detect",
        "PolicyEvaluator", "PolicyEngine", "check_content",
    ]
    # eval/exec/shell=True patterns belong to ASI05 (Unexpected Code Execution)

    # Scan Python files for signals
    root = Path(project_path)
    positive_matches = []

    for py_file in root.rglob("*.py"):
        content = py_file.read_text(errors="ignore")
        for pattern in positive_patterns:
            if pattern in content:
                positive_matches.append(f"{py_file.name}: {pattern}")

    positive_found = len(positive_matches) > 0

    return {
        "risk": "ASI01",
        "name": "Agent Goal Hijack",
        "status": "pass" if positive_found else "fail",
        "controls_found": positive_matches,
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

## Check ASI02: Tool Misuse and Exploitation

Verify tools have allowlists, argument validation, and bounded scope, so a legitimate tool cannot be used in an unsafe or unintended way.

**What to search for:**
- Tool registration with explicit allowlists (not open-ended)
- Argument validation before tool execution
- Per-tool least privilege: read-only where possible, no send or delete rights a tool does not need
- Rate, cost or token budgets on tool calls

**Failing:** Agent has access to all tools by default.
**Passing:** Agent capabilities defined as a fixed allowlist, unknown tools denied.

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

## Check ASI03: Identity and Privilege Abuse

Verify each agent has its own identity and cannot gain privileges it was not granted, directly or through delegation.

**What to search for:**
- Per-agent credentials, not shared credentials or string names (`agent_name = "my-agent"`)
- Cryptographic identity (DID-based `did:web:` / `did:key:`, Ed25519 or similar signing) bound to specific capabilities
- Short-lived, task-scoped credentials with rotation
- Privilege level checks before sensitive operations
- No self-promotion patterns (agent changing its own trust score or role)
- Delegation narrowing (child scope <= parent scope)
- Escalation requires external attestation (human or SRE witness)

**Failing:** Agent can modify its own configuration or permissions, or all agents share one credential.
**Passing:** Each agent holds its own scoped credential, and privilege changes require out-of-band approval (e.g., Ring 0 requires SRE attestation).

---

## Check ASI04: Agentic Supply Chain Vulnerabilities

Verify agent plugins, tools, prompts and MCP servers have integrity verification.

**What to search for:**
- `INTEGRITY.json` or manifest files with SHA-256 hashes
- Signature verification on plugin installation
- Dependency pinning (no `@latest`, `>=` without upper bound)
- Prompts and tool definitions pinned by content hash or commit, not fetched unpinned at runtime
- SBOM generation

---

## Check ASI05: Unexpected Code Execution (RCE)

Verify that agent-generated code or model-influenced input cannot reach an interpreter or shell unchecked.

**What to search for:**
- No `eval()` or `exec()` on agent-generated code or content
- No `subprocess.run(shell=True)` or `os.system()` with model- or user-controlled input
- Generated code runs in a sandbox (container, non-root, restricted network and filesystem)
- Human approval or an allowlist for auto-executed commands

**Failing:** `exec()` called on model output inside the agent loop.
**Passing:** Generated code is statically checked, then run in an isolated sandbox with no network by default.

---

## Check ASI06: Memory & Context Poisoning

Verify that what the agent stores and later retrieves (conversation memory, summaries, embeddings, RAG stores) cannot be silently poisoned.

**What to search for:**
- Validation of new memory and RAG writes before they are committed
- Memory segmented per user, session or tenant (separate namespaces in vector stores)
- Source attribution stored with each entry
- The agent's own outputs not written back into trusted memory automatically
- Expiry or decay of unverified entries

**Failing:** One shared vector store with no namespaces, and any chat message can be persisted as long-term memory.
**Passing:** Per-tenant namespaces, writes validated and tagged with provenance, unverified entries expire.

---

## Check ASI07: Insecure Inter-Agent Communication

In multi-agent systems, verify that agents authenticate each other and the messages they exchange before acting on them.

**What to search for:**
- Agent identity verification (DIDs, signed tokens, mutual TLS)
- Message signing and signature verification
- Nonces or timestamps so replayed messages are rejected
- Trust score checks before accepting delegated tasks
- No blind trust of inter-agent messages

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

## Check ASI08: Cascading Failures

Verify that a single fault in one agent (a hallucination, a poisoned input, a compromised tool) cannot propagate unchecked across agents and workflows.

**What to search for:**
- Circuit breakers that trip on repeated failures, and quotas between planner and executor
- Policy enforcement outside the planner, using deterministic logic (YAML rules, code predicates)
- No LLM calls in the enforcement path
- Policy checks cannot be skipped or overridden by the agent
- Fail-closed behavior (if policy check errors, action is denied)

**Failing:** Agent decides its own permissions via prompt ("Am I allowed to...?"), and downstream agents execute whatever the planner emits.
**Passing:** PolicyEvaluator.evaluate() returns allow/deny in <0.1ms with no LLM involved, and a circuit breaker stops the chain after N failures.

---

## Check ASI09: Human-Agent Trust Exploitation

Verify that a confident or persuasive agent explanation cannot stand in for human verification of a sensitive action.

**What to search for:**
- Explicit confirmation step before sensitive or irreversible actions (payments, deletions, privilege changes)
- Risk summaries for approvals generated by the application, not by the model
- Preview views that make no network or state-changing calls
- A way for users to flag suspicious agent behavior

**Failing:** A single "Approve" button under a model-written justification triggers a payment.
**Passing:** High-risk actions show a fixed, application-generated risk summary and require a separate confirmation.

---

## Check ASI10: Rogue Agents

Verify the system can detect an agent that deviates from its intended function or scope, and stop it.

**What to search for:**
- Structured logging for every tool call (not just print statements)
- Audit entries include: timestamp, agent ID, tool name, args, result, policy decision
- Append-only or hash-chained log format, stored separately from agent-writable directories
- Anomaly detection on tool call patterns (frequency, targets, timing)
- Trust score decay over time (temporal decay)
- Kill switch or emergency stop capability, with credential revocation

**Failing:** Agent actions logged via `print()` or not at all, and no mechanism to stop a misbehaving agent.
**Passing:** Structured JSONL audit trail with chain hashes, drift alerts, trust decays without activity, kill switch available.

---

## Compliance Report Format

```markdown
# OWASP ASI Compliance Report
Generated: 2026-04-01
Project: my-agent-system

## Summary: 6/10 Risks Covered

| Risk | Status | Finding |
|------|--------|---------|
| ASI01 Agent Goal Hijack | PASS | PolicyEngine validates input before tool calls |
| ASI02 Tool Misuse and Exploitation | PASS | Tool allowlist enforced in governance.py |
| ASI03 Identity and Privilege Abuse | FAIL | Ring promotion requires attestation, but agents use string names and share credentials |
| ASI04 Agentic Supply Chain Vulnerabilities | FAIL | No integrity manifests or plugin signing |
| ASI05 Unexpected Code Execution (RCE) | PASS | No eval/exec on model output, generated code runs in a sandbox |
| ASI06 Memory & Context Poisoning | FAIL | Shared vector store with no per-tenant namespaces |
| ASI07 Insecure Inter-Agent Communication | FAIL | No identity verification between agents |
| ASI08 Cascading Failures | PASS | Deterministic PolicyEvaluator, circuit breakers between agents |
| ASI09 Human-Agent Trust Exploitation | PASS | Payments require a separate confirmation step |
| ASI10 Rogue Agents | PASS | AuditChain with SHA-256 chain hashes, trust decay, kill switch |

## Critical Gaps
- ASI03: Replace string agent names with per-agent cryptographic identity and scoped credentials
- ASI04: Generate INTEGRITY.json manifests for all plugins
- ASI06: Segment memory per tenant and validate writes before commit
- ASI07: Add agent identity verification using DIDs or signed tokens

## Recommendation
Install agent-governance-toolkit for reference implementations of these controls:
pip install agent-governance-toolkit
```

---

## Quick Assessment Questions

Use these to rapidly assess an agent system:

1. **Does untrusted input (prompts, documents, retrieved content) pass through validation before it can change the agent's goal or reach any tool?** (ASI01)
2. **Is there an explicit list of what tools the agent can call, each with least privilege?** (ASI02)
3. **Does each agent have its own scoped credential, with no way to promote its own privileges?** (ASI03)
4. **Are plugins, tools and prompts integrity-verified before use?** (ASI04)
5. **Is model output kept away from `eval()`, `exec()` and the shell, with generated code run only in a sandbox?** (ASI05)
6. **Is agent memory validated on write and segmented per user or tenant?** (ASI06)
7. **Do agents authenticate each other and verify messages before acting on them?** (ASI07)
8. **Is policy enforcement deterministic, and is there a circuit breaker between agents?** (ASI08)
9. **Do sensitive actions need a human confirmation that does not rely on the model's own explanation?** (ASI09)
10. **Is every tool call logged with enough detail to replay it, and is there a kill switch?** (ASI10)

If you answer "no" to any of these, that's a gap to address.

---

## Related Resources

- [OWASP Top 10 for Agentic Applications 2026](https://genai.owasp.org/resource/owasp-top-10-for-agentic-applications-for-2026/)
- [Agent Governance Toolkit](https://github.com/microsoft/agent-governance-toolkit) — Reference implementation of the policy, identity and audit patterns used in this skill
- [agent-governance skill](https://github.com/github/awesome-copilot/tree/main/skills/agent-governance) — Governance patterns for agent systems
