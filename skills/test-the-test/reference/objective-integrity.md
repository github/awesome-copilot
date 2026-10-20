# test-the-test/reference/objective-integrity.md

Loaded only at Level B, when escalation conditions fire or a reviewer asks
for it. This is documentation guidance. It carries no runtime authority, no
persistence, no product surface, no execution control, and no verdict of its
own.

## When this reference applies

Level A, naming the true objective, the strongest apparent-success shortcut,
and the discriminating check, is the normal case and is owned by the
"Objective integrity, Level A" section of `../SKILL.md`. Stop there when the
discriminating check is already mandatory, independent of the change, and
capable of failing that shortcut.

This reference applies only when the Level A check is inadequate **and** a
material condition from that section holds.

**The materiality gate is load-bearing.** Technical editability alone never
escalates. Escalate on a specific observable condition, not on the general
possibility of one.

## The decision model

At Level B, map these five as **separate** objects.

1. **True objective and invariants.** What must hold even if every check
   passes.
2. **Proxy or measure.** The stand-in signal, and its known blind spots.
3. **Evaluator or acceptance surface.** What interprets the proxy and
   declares pass.
4. **Environment and observation channel.** Fixtures, configuration, clocks,
   sampling, discovery, logs: what determines *what the evaluator can see*.
5. **Evidence channel.** Command output, exit status, diffs, receipts,
   captures.

## Access, stated in existing vocabulary

For each of the evaluator, the environment, and the evidence channel, state
who controls it, reusing the vocabulary the orchestrator seat already owns:

- `EXECUTOR_OWNED`: the executing seat may change it under current scope;
- `METHOD_LOCKED`: locked by safety, privacy, authority, or irreversibility;
- **independently controlled**: owned by another seat, service, or surface;
  or
- **unknown**: not established, and therefore not yet evidence.

Technical capability is not authority. No new authority token exists here, and
none may be invented. `unknown` is a real answer and is preferable to a guess;
where a load-bearing surface cannot be inspected well enough to judge, that is
an existing blocked return naming the missing evidence and a reopen condition,
not a finding of breach.

## The strongest shortcut

Name one concrete route by which this candidate could pass without satisfying
the objective, possible on the current surface, not hypothetical. This mirrors
the orchestrator seat's required pressure-test field at the executing seat; it
does not replace or outrank it.

Routes already governed elsewhere are referenced, not re-listed: deleted
assertions, excluded discovery, false-success exit codes, swallowed errors, and
mock substitution.

Routes needing attention here:

- threshold, expected-value, or sample-set changes;
- model-judge biasing through executor-controlled text;
- run or window cherry-picking; and
- truncated, stale, or re-used evidence.

## Evaluator-change classes and non-equivalent evidence

Both are owned by `../SKILL.md`: the six-class classification table, the
separate-inspectability requirement, the positive and negative control
comparison, and the non-equivalent check families. Apply them from there
rather than restating them.

## Outcomes route through existing vocabulary

No status enum, verdict, seat, gate, or context-impact token is defined here.

| Observed condition | Existing governed treatment |
|---|---|
| No observed breach | No objective-integrity finding; the surrounding review governs. |
| Residual risk, no established breach | Existing non-blocking finding; `CONTEXT IMPACT: ADVISORY`. |
| Observed proxy gaming, evaluator or environment tampering, evidence shaping | Existing blocking finding: pressure-test `FAIL`; reviewer `NEEDS_REVISION`. |
| Objective and acceptance conditions not all legitimately satisfiable | Existing reconvergence: `CONTEXT IMPACT: CONTRACT_RECONVERGENCE_REQUIRED`, or `RECONVERGENCE_REQUIRED` where used. |
| Load-bearing surface not inspectable enough to judge | Existing blocked return naming the missing evidence and a reopen condition. |

`AUTHORITY_STOP` applies only where existing governance independently
establishes that a named gate lacks authority. An integrity concern does not by
itself create an authority event.

Where the requirements genuinely cannot all be satisfied, route through existing
reconvergence. **Proving the contradiction is the successful outcome.** A false
green is not, and the request is never to be read as wanting a loophole.

## Structural pressure is a signal, not a diagnosis

Repeated failure together with a shrinking budget may raise scrutiny **only**
when paired with a load-bearing evaluator the executor can modify. All three
conditions are required.

Emotional or urgent wording is not a detector. Its absence is not exculpatory.
No claim about an internal state is licensed by any of this.

## Non-claim boundary

This reference governs **observable structural risk only**. It does not:

- infer hidden internal states, latent representations, motives, or goals;
- read emotion, desperation, or intent from wording;
- diagnose deception, model alignment, or model honesty generally;
- classify every hallucination, verbose answer, refusal, cautious answer, or
  evaluator change as gaming;
- turn self-review into independent review; or
- prove that no subtle shortcut exists merely because none was observed.

Applying this reference produces no claim of behavioral efficacy, no claim of
reduced false positives or false negatives, no claim of reduced process burden,
and no model-safety performance claim. None of those has been measured here.

**Inoculation boundary.** Published training-time inoculation-prompting results
must never be read as runtime permission to manipulate an evaluator. Those are
training-intervention findings; ordinary governed work continues to prohibit
evaluator manipulation outright. Any experiment on the mechanism itself requires
a separate operator-approved research protocol with its own subject,
containment, authority, and evidence contract. No external research text is
reproduced here, only this operational boundary.

## Routing

- Evaluator-change classes, control comparison, non-equivalent evidence:
  `../SKILL.md`.
- Where the Level B block is recorded: the builder's return.
- Independent confirmation of separation and challenge of the block: the
  reviewing seat.
- Method ownership, `metric-gaming`, and pressure-test posture: the
  orchestrating seat, unchanged by this reference.
