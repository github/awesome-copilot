---
name: recover-ambiguous-external-writes
description: 'Recover uncertain results from application-facing external actions—such as payments, tickets, messages, deployments, or CRUD API calls—without blindly repeating a duplicate-sensitive mutation. Use when a tool may have committed a side effect but the agent did not receive a trustworthy result.'
---

# Recover Ambiguous External Writes

Treat a lost response as an unknown outcome, not a failed operation. Reconcile the
destination before deciding whether to retry.

## Scope: application actions, not database recovery

Use this skill when an agent invokes an **external application service** whose
side effect matters outside the current process: for example, creating a
customer-support ticket, sending an email or chat message, charging or
refunding a payment, provisioning or deploying infrastructure, updating a SaaS
record, or invoking a domain API through an SDK, CLI, webhook, or MCP tool.

The destination may use a database internally, but this skill does **not**
prescribe database transactions, replication recovery, or a generic network
retry policy. It is a workflow pattern for a caller that needs a provider
idempotency key and/or an authoritative way to look up the business result
after a timeout or dropped response.

Do not use it for a read-only request, a purely local calculation, or an action
whose provider has already conclusively reported that it never started. In
those cases, follow the service's ordinary retry guidance instead.

## Non-negotiable rules

- Persist the logical operation identity before starting the external write.
- Reuse one provider idempotency key for every attempt at that logical operation.
- Never classify a timeout, disconnect, or malformed response as proof of failure.
- Never retry a duplicate-sensitive write until absence is proven or the provider
  guarantees idempotency for the reused key.
- Prefer destination state over client logs when the two disagree.
- Keep credentials, personal data, and destination payloads out of shared
  checkpoints. Store only opaque identifiers and evidence fingerprints.
- Do not claim exactly-once execution unless the destination provides that
  guarantee.

## Recovery workflow

### 1. Classify the operation

Record:

- operation type: create, send, update, delete, payment, deployment, or batch;
- duplicate harm: harmless, reversible, costly, destructive, or unknown;
- provider idempotency contract, including key lifetime and request matching rules;
- stable destination marker or lookup key;
- read-after-write, status, audit-log, or webhook evidence available;
- compensation action and whether it requires approval.

Use the ordinary path for a one-time, low-risk operation when recovery machinery
would add no useful protection. State that decision explicitly.

### 2. Establish a stable identity

Create one opaque `operation_id` for the intended logical effect. Before the first
write, durably record:

```text
operation_id
provider_idempotency_key
destination_marker
expected_invariant
stage = planned
```

Do not generate a new identity merely because a process restarted or a response
was lost.

### 3. Preflight the destination

Search by the stable marker or query the provider status API. If the intended
effect already exists and matches the expected invariant, record it as verified
and do not write again.

If multiple workers may act on the same operation, acquire a lease or compare-and-
swap claim before proceeding. A lease prevents concurrent attempts; it does not
prove what happened at the destination.

### 4. Record intent before the write

Transition the durable checkpoint to:

```text
stage = external_attempt_started
attempt = N
started_at = <timestamp>
```

Persist this transition before invoking the mutating tool. Then make at most one
unprotected attempt.

### 5. Handle the response

- **Trusted success:** verify the destination, then record `caller_verified`.
- **Trusted rejection before execution:** record `failed`; retry only if the
  operation remains authorized and the error is retryable.
- **Timeout, disconnect, cancellation, or invalid response:** record
  `external_result_uncertain`; do not immediately retry.

The checkpoint records the caller's knowledge. It is not external proof by itself.

### 6. Reconcile an uncertain result

Use the strongest available evidence in this order:

1. provider operation-status lookup using the original idempotency or request key;
2. destination read-back using the stable marker;
3. destination audit log, event, receipt, or webhook;
4. a domain invariant that uniquely establishes the intended effect.

Classify the result:

| Finding | Next action |
| --- | --- |
| Matching effect found | Record `caller_verified`; do not retry |
| Conclusive proof of absence | Retry only if still authorized |
| Conflicting or partial evidence | Keep `external_result_uncertain`; stop for review |
| No trustworthy evidence | Keep `external_result_uncertain`; stop for review |

When retrying after proven absence, reuse the original provider idempotency key.
When the provider rejects expired keys, treat the retry as a new risk decision and
obtain approval if duplicate harm is material.

### 7. Verify completion

Verification must identify the destination result and check the expected invariant.
Store an opaque result identifier, evidence type, observation timestamp, and
optional keyed fingerprint. Do not store sensitive response bodies merely to make
the checkpoint look complete.

### 8. Report the honest guarantee

Use one of these labels:

- `provider-idempotent`: the provider contract deduplicates the stable key;
- `duplicate-resistant`: read-back or fencing reduces duplicate risk;
- `concurrency-safe`: one valid worker can attempt the operation at a time;
- `best-effort`: the outcome cannot be conclusively reconciled.

Report the operation identity strategy, attempts made, evidence observed, final
stage, guarantee label, remaining uncertainty, and any human follow-up.

## Reference state machine

```text
planned
  -> external_attempt_started
      -> caller_verified
      -> failed
      -> external_result_uncertain
          -> caller_verified
          -> failed        # only with conclusive proof of absence/rejection
          -> compensated   # only after an authorized compensation
```

Never transition `external_result_uncertain` directly back to
`external_attempt_started` solely because time passed.

## Pseudocode

```text
checkpoint = load_or_create(operation_id)

if checkpoint.stage == caller_verified:
    return checkpoint.verified_result

evidence = reconcile(destination_marker, provider_idempotency_key)
if evidence.matches_expected_effect:
    save(caller_verified, evidence)
    return evidence.result

if checkpoint.stage == external_result_uncertain and not evidence.proves_absence:
    stop_for_review(evidence)

claim(operation_id)
save(external_attempt_started)

try:
    response = write_once(idempotency_key=provider_idempotency_key)
except LostResponse:
    save(external_result_uncertain)
    evidence = reconcile(destination_marker, provider_idempotency_key)
    if evidence.matches_expected_effect:
        save(caller_verified, evidence)
        return evidence.result
    stop_for_review(evidence)

evidence = verify(response, destination_marker)
save(caller_verified, evidence)
return evidence.result
```

## Stop conditions

Stop and request human review when:

- the operation could be destructive and the destination cannot prove presence or
  absence;
- the stable marker is not unique;
- the provider's idempotency behavior is undocumented or the key expired;
- observed state conflicts across provider status, read-back, and audit evidence;
- compensation would create another irreversible effect;
- required authorization has expired or changed.
