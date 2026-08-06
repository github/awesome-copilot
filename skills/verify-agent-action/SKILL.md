---
name: verify-agent-action
description: 'Review a proposed AI-agent action or human-approval packet before execution. Use when an agent wants to run a consequential tool, command, deployment, message, purchase, credential operation, or data mutation; when checking whether approval still matches the exact action; or when auditing action evidence for forged results, parameter swaps, replay, correlated reviewers, missing evidence, expiry, or stale monitoring. Produce an evidence-based review only—never execute or authorize the action.'
---

# Verify Agent Action

Treat a plausible approval screen as a claim, not proof. Verify the complete
decision path before a human or an external enforcement point decides whether
to act.

## Preserve the safety boundary

- Never execute, approve, sign, send, purchase, deploy, or mutate anything.
- Never convert this review into execution authority.
- Never infer missing evidence, identities, timestamps, or parameters.
- Treat a valid schema, checksum, or signature as insufficient by itself.
- Treat signatures as evidence of attribution and integrity, not factual truth.
- Keep supporting and refuting evidence separate; do not average conflict away.
- Fail closed on a material mismatch. Use `INCONCLUSIVE` when required evidence
  is unavailable.

Set this field in every final result:

```json
{"execution_authorized": false}
```

## Collect the review packet

Request only the artifacts needed for the review:

1. The original user or system request.
2. The exact proposed action:
   - operation or tool name
   - target resource
   - complete parameters
   - filesystem and network scope
   - maximum execution count
   - not-before and expiry times
3. The assessment that claims the action is justified.
4. The source evidence and policy used by that assessment.
5. The approval record, including approver identity, role, action digest, nonce,
   audience, issue time, expiry, and use count.
6. The latest monitoring events and expected heartbeat interval.
7. The current trusted time and any prior nonce-use record.

List missing fields before analysis. Do not silently substitute defaults.

## Build the exact action identity

Create one normalized action object without dropping fields:

```json
{
  "operation": "git.push",
  "target": "owner/repository",
  "parameters": {
    "branch": "fix/example",
    "commit": "40-character-sha",
    "remote": "origin"
  },
  "filesystem_scope": [],
  "network_scope": ["github.com:443"],
  "execution_count": 1,
  "not_before": "RFC3339 timestamp",
  "expires_at": "RFC3339 timestamp"
}
```

Use a project-specified canonicalization and digest algorithm when provided.
Otherwise, report that cryptographic identity cannot be independently verified;
still compare every field structurally.

Never normalize away a security-relevant distinction such as:

- branch, commit, repository, environment, recipient, amount, currency, or host
- recursive, force, overwrite, privileged, destructive, or dry-run flags
- filesystem roots, CIDRs, ports, domains, execution counts, or expiry

## Run the six controls

Evaluate every control as `PASS`, `FAIL`, `INCONCLUSIVE`, or `NOT_APPLICABLE`.

### 1. Recompute the assessment

- Re-run the declared deterministic evaluator from the declared source inputs
  when its implementation is available.
- Compare the complete canonical result, not selected fields.
- Mark `FAIL` if the received result differs from recomputation.
- Mark `INCONCLUSIVE` when only schema validation, an internal checksum, or an
  unverifiable evaluator claim is available.

### 2. Match the exact approved action

- Compare the proposed action with the action bound into the approval.
- Compare the complete normalized object and its digest.
- Mark `FAIL` if any material field changed after approval.
- Treat a broad target or scope as a mismatch when the evidence justifies only
  a narrower action.

### 3. Reject replay and identity ambiguity

- Verify the nonce is unique and unused.
- Verify subject, audience, issuer, approver role, issue time, not-before time,
  expiry, and maximum use count.
- Mark `FAIL` for a reused nonce, wrong audience, expired approval, future-dated
  approval, excessive use count, revoked identity, or role mismatch.
- Mark `INCONCLUSIVE` if no trustworthy replay store or time source exists.

### 4. Test reviewer independence

Build a dependence table for every reviewer or evaluator:

| Dimension | Compare |
|---|---|
| Model | family, version, fine-tune |
| Provider | account and control plane |
| Prompt | shared template or ancestry |
| Retrieval | overlapping sources and indexes |
| Tools | shared evaluator code and runtime |
| Operator | common owner or approval authority |

Do not count correlated reviewers as independent quorum members. Mark `FAIL` if
the policy requires independent approval and the remaining independent set is
too small.

### 5. Preserve evidence and contradiction

- Inventory every evidence identifier referenced by the assessment.
- Confirm each item is present, authenticatable, within its validity window,
  and relevant to the claim.
- Record support and refutation independently:

| Support | Refutation | Epistemic state |
|---|---|---|
| absent | absent | `UNDETERMINED` |
| present | absent | `SUPPORTED_ONLY` |
| absent | present | `REFUTED_ONLY` |
| present | present | `CONFLICTED` |

- Mark `FAIL` if evidence was removed, altered, expired, or concealed in a way
  that changes the result.
- Never convert `CONFLICTED` into a numeric average that appears safe.

### 6. Verify lifecycle and monitoring

- Confirm the action is inside its validity window.
- Verify monitoring-event signatures or integrity evidence when available.
- Check sequence numbers, previous-event digests, and expected heartbeat
  cadence.
- Treat missing, stale, reordered, or broken-chain telemetry as a failure when
  policy requires continuous monitoring.
- Do not interpret silence as health.

## Challenge convenient conclusions

Before producing the final result, attempt these mutations mentally or with
project-provided test fixtures:

1. Replace a blocked assessment with an allowed result.
2. Change one approved target, parameter, scope, amount, or commit.
3. Reuse an otherwise valid approval nonce.
4. Replace independent reviewers with correlated copies.
5. Remove one refuting evidence item.
6. Stop the monitoring heartbeat after approval.

If any mutation would pass the reviewed controls, record the affected control
as `FAIL`; do not merely recommend future hardening.

## Determine the review result

Use exactly one result:

- `ELIGIBLE_FOR_HUMAN_DECISION`: all required controls pass.
- `ELIGIBLE_WITH_CONTROLS`: no required control fails, and explicit external
  controls can resolve the listed conditions before execution.
- `BLOCKED`: at least one required control fails or the action exceeds the
  justified scope.
- `INCONCLUSIVE`: no required control is proven false, but evidence needed for
  a safe decision is missing or unverifiable.

`ELIGIBLE_FOR_HUMAN_DECISION` is not approval. A human authority and a separate
enforcement point remain responsible for any real action.

## Report in this format

```markdown
# Agent Action Review

## Result
- Review result: BLOCKED | INCONCLUSIVE | ELIGIBLE_WITH_CONTROLS |
  ELIGIBLE_FOR_HUMAN_DECISION
- Execution authorized: false
- Exact action digest: <verified value or NOT_VERIFIED>

## Action
- Operation:
- Target:
- Material parameters:
- Scope:
- Validity window:
- Maximum uses:

## Control matrix
| Control | Status | Evidence | Reason |
|---|---|---|---|
| Recomputed assessment | PASS/FAIL/INCONCLUSIVE/N/A | ... | ... |
| Exact action binding | ... | ... | ... |
| Replay and identity | ... | ... | ... |
| Reviewer independence | ... | ... | ... |
| Evidence completeness | ... | ... | ... |
| Monitoring freshness | ... | ... | ... |

## Supporting evidence
- ...

## Refuting evidence and defeaters
- ...

## Required next action
- State the smallest concrete step that could change the result.

## Boundaries
- State what this review did not prove.
```

Lead with the result and the exact reason. Prefer a reproducible blocker over a
confidence score.
