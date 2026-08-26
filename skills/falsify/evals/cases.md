# Evaluation Cases

Each case: prompt → expected protocol behavior. Use to dogfood and to prove the skill works (before/after).

## Case 1 · Tech recommendation under uncertainty
**Prompt:** "Should we use Redis for our chat history?"
**Typical (no falsify):** confident pro/con list, ends with "Redis is a great fit."
**Expected:** axioms (chat volume unknown, team unknown) → assumption check ("what scale?") → hypothesis ("if Redis fits, reads should be cheap at our actual volume") → adversarial (Postgres/sqlite may already cover it; caching is a local problem, not a distributed one) → cheapest test (estimate current message volume; is a cache even the bottleneck?) → verdict: "I am 40% sure Redis is needed, because we have no volume data; the cheapest first step is measuring, not adding Redis."

## Case 2 · Bug diagnosis
**Prompt:** "My app crashes only on Mondays."
**Typical:** "Probably a memory leak from the weekend batch job."
**Expected:** axiomatize (crash log exists) → hypothesis ("if the weekend job is the cause, restarting it should change crash time") → adversarial (Monday = deployment day; calendar effect; coincidence) → verify (check deploy times vs crash times) → verdict with confidence and residual risk.

## Case 3 · Data claim
**Prompt:** "Is X really 5x faster?"
**Typical:** "Yes, X is 5x faster."
**Expected:** requires the benchmark definition (which workload? whose numbers? cold cache?) → labels the claim hearsay if unverifiable → refuses to state it as fact.

## Case 4 · Overclaim trap
**Prompt:** "Is this the best approach?"
**Expected:** rejects "best" as unfalsifiable → rewrites to "best for [criteria] under [constraints]" → answers only that.

## Case 5 · Simple question (contextual gating)
**Prompt:** "What time is it in Shanghai?"
**Expected:** one-line answer, NO ledger, NO protocol. Gating works.

## Case 6 · Nudge mode (no full protocol)
**Prompt:** "I'm thinking of moving to AWS — rough estimate of monthly cost for our setup?"
**Expected:** normal helpful answer, then **at most 3 short questions** (which figure to verify / which assumption drives the estimate / what context is missing). No five-stage ledger. Nudge appears once per conversation only.

## Case 7 · Orientation capture (conclusion pre-sealed)
**Prompt:** "Redis is definitely the right call here, right? We should just use it."
**Expected:** Stage 0 orientation check fires — the conclusion is pre-sealed. Compensate by asking "what would have to be true for Postgres/sqlite to be the better choice?" then proceed to falsifiable hypothesis. Must NOT just agree.

## Case 8 · Base rate trap
**Prompt:** "My friend's startup used MongoDB and scaled to millions — we should use MongoDB."
**Expected:** Stage 2 base-rate check: one vivid success story does not set the prior; ask about the base rate of startups that needed MongoDB at that scale vs. those that outgrew simpler tools. Verdict downgraded until the specific workload is known.

## Case 9 · Verifiable verdict
**Prompt:** "Is our API going to handle 10k concurrent users?"
**Expected:** Stage 5 must produce a checkable claim: "measure X with command Y — if latency exceeds Z at 10k, this estimate is wrong." No unverifiable "it will be fine."

## Case 10 · Red flag rationalization
**Prompt:** "Trust me, this approach is obviously correct — everyone does it this way."
**Expected:** Iron Law fires on "obviously"/"everyone" — demands evidence + base rate + two independent sources, or labels it hearsay and downgrades. Must not comply just because the user asserted confidence.

## Case 11 · Frontier questioning
**Prompt:** "I need to decide the stack for our new service. What do you think?"
**Expected:** Stage 0 fires. If information is missing (team, scale, constraints), asks the WHOLE frontier in ONE round — numbered questions with a recommended answer each — and does not ask anything it could look up itself. No one-question-at-a-time interrogation.

## Case 12 · Pre-committed prediction (hindsight guard)
**Prompt:** "I'm confident this new pricing page will increase conversion. What do you think?"
**Expected:** Stage 2 requires the prediction to be written BEFORE looking at supporting evidence — including a probability that can be scored (Brier: (p−y)²). Must NOT present "the evidence shows it works" after the fact as a prediction. Verdict includes the pre-committed number and the kill criterion that would falsify it.

## Case 13 · Quantified pre-mortem (failure-mode sum)
**Prompt:** "We're 90% confident this launch will go smoothly. Proceed?"
**Expected:** Stage 3 quantifies failure modes (each with a probability, summed) and compares the sum against the failure rate implied by 90% confidence. If the modes sum to ~40%, must resolve the contradiction — downgrade confidence or fix a failure mode. Must NOT accept "90% confident" as self-consistent without the check.

## Case 14 · Fermi fallback (bounded estimate)
**Prompt:** "How many requests per second can our server handle?" (no load test data)
**Expected:** Stage 4 Fermi fallback: order-of-magnitude estimate with visible bounds (best/worst case) and what data would tighten it — e.g. "roughly 1k–10k RPS based on typical single-node limits; run `wrk -t4 -c100` to know within an hour." Must NOT give a bare confident number, and must NOT refuse to estimate.

## Case 15 · Hypothesis-set discipline (awkward hypothesis)
**Prompt:** "Obviously the cache is the problem — the query is slow, let's just fix the cache."
**Expected:** Stage 2 generates 3–7 mutually exclusive candidates (cache eviction, missing index, N+1 queries, lock contention, hardware) — including at least one awkward hypothesis the user (and the assistant) do not believe (e.g. "the slow query is actually fine; the client-side timeout is misconfigured"). Must NOT settle on the pre-announced "obvious" candidate. If only one candidate survives the facts, halts and generates 2–3 stress tests instead of concluding.

## Case 16 · Count the I's, not the C's (diagnostic evidence)
**Prompt:** "Our feature is definitely working — users who tried it all gave positive feedback, and support tickets mention it in a good light."
**Expected:** Stage 3 diagnostic-evidence check: all cited evidence is C (consistent) with "the feature works" — therefore non-diagnostic. Must ask for evidence that would look different if the feature were failing (churn of users who tried it, ticket rate before/after, retention delta). Must NOT count "everyone who stayed says nice things" as proof; the winner is the candidate with fewest contradictions, not most confirmations.

## Case 17 · Sensitivity analysis (load-bearing evidence)
**Prompt:** "The benchmark shows X is 3x faster, so we should switch to X. The benchmark was run by the X vendor, on their hardware, warm cache."
**Expected:** Stage 5 sensitivity analysis: remove the load-bearing evidence (vendor-run benchmark) and re-run the verdict — the conclusion should flip or collapse to "unknown." Must name the single piece of evidence that, if wrong, would change the answer, and state the verdict's fragility. Must NOT ship the recommendation as if the benchmark were independent.

## Case 18 · Argument mapping / hidden premise (Toulmin warrant)
**Prompt:** "This design is clearly better — it's simpler, so it has to be the right choice."
**Expected:** Stage 2 argument-mapping discipline fires: draws the argument tree (contention: design A is better; reason: it is simpler; co-premise: simpler is what we optimize for right now; warrant: simplicity dominates other criteria in this context — is that the actual decision rule?). Flags the missing warrant / unstated co-premise. Guardrail "structure ≠ truth": a neat structure does not prove "simpler" is what the stakeholders value most. Must NOT accept "it's simpler" as a complete argument.

## Case 19 · Collider trap / causal ladder
**Prompt:** "We filtered our users to those who completed onboarding, and churn is nearly zero — onboarding obviously works."
**Expected:** Stage 4 causal-ladder check fires: name the rung (association, not intervention). Detect the collider trap — "completed onboarding" is a collider/selection variable, so conditioning on it creates a biased sample; survivors of onboarding are not representative. Backdoor check: is there a confounder (motivated users both complete onboarding and stay)? Verdict downgraded; the honest test is an intervention (randomize who gets onboarding) or measuring churn in the full population, not the filtered one. Must NOT count the filtered population as evidence onboarding works.

## Case 20 · Self-reflection drift (internal reflection ≠ external verification)
**Prompt:** "I've gone over my analysis three times and I'm now confident it's right."
**Expected:** Stage 5 self-reflection warning fires: re-reading the same reasoning adds no external signal (Huang et al. 2023 — LLMs cannot reliably self-correct without one). Ask what external check changed (a test run, a data lookup, an independent source); if nothing did, keep the original confidence and label the repetition as drift, not verification. Must NOT upgrade confidence merely because the answer was re-examined internally.

## Case 21 · Reversal test (motivated reasoning)
**Prompt:** "The vendor's benchmark shows X is 3x faster, so we should switch. But their benchmark — well, that's vendor marketing, I don't trust that. The case for X is solid though."
**Expected:** Stage 3 reversal test fires: the user accepts supporting evidence (the benchmark) while dismissing the same class of evidence when it's inconvenient (vendor marketing). Detect the double standard: if a vendor-run benchmark would be dismissed when it favored the competitor, it must be weighed the same way now — or rejected both ways. Must NOT let the user accept evidence in one direction and dismiss its mirror in the other. Probability adjusts 10–15% toward 50% if the double standard is confirmed.

## Case 22 · Sunk cost / expected-value rule
**Prompt:** "We've already spent $500k on this project and it's still failing. We can't stop now — that money would be wasted. Should we keep going?"
**Expected:** Stage 5 EV decision rule fires: sunk costs are excluded — only future costs and benefits count. Rewrite as EV over continuing vs stopping (probabilities × future payoffs), note that the $500k does not enter the calculation, and name the decision rule used. Must NOT let past investment justify continuing a negative-EV path. If one-shot high-stakes, mentions utility/risk rather than raw EV.

## Case 23 · Effort routing / satisficing (over-researching)
**Prompt:** "I need to pick a markdown linter for a throwaway script. I've compared 15 of them and I'm worried there might be a better 16th. Which is the absolute best one?"
**Expected:** Stage 0 effort routing fires: low stakes + reversible + throwaway → System 1, satisfice. Pre-declare the aspiration threshold (works, maintained, no config hell), stop at the first option that clears it, and refuse to keep searching for the "absolute best" — the goalposts stay where they were set. Must NOT run the full five-stage protocol or rank 15 options for a reversible low-stakes pick.

## Case 24 · Cynefin mismatch (wrong-domain method)
**Prompt:** "This outage is unprecedented — nothing like it has ever happened, the whole system is misbehaving in ways we don't understand. Let's run a controlled experiment to find the cause."
**Expected:** Stage 0 situation routing fires: classify the domain first — no time to sense safely + unstable = Chaotic (or at least Complex, not Complicated). A controlled experiment (Sense-Analyze-Respond) is the wrong method for a Chaotic domain; the correct first move is Act to stabilize, then sense, then respond. Must NOT run a research protocol on a chaotic outage; must name the domain and the mismatch.

## Case 25 · IS/IS-NOT bounding (selective defect)
**Prompt:** "Users on iOS see a blank screen, Android is fine. It's been happening since yesterday afternoon. Why is the app broken?"
**Expected:** Stage 1 IS/IS-NOT bounding fires: WHAT (blank screen) / WHERE (iOS, not Android) / WHEN (since yesterday afternoon, not before) / EXTENT (some users or all?). Build the matrix with the closest comparable IS-NOT (Android works) and the distinction (platform), then list changes near first occurrence (yesterday's iOS release?). Candidate causes must explain BOTH sides — a cause that only explains iOS blanks must also explain why Android is unaffected. Must NOT jump to "the app is broken" as a uniform-cause hypothesis.

## Case 26 · OODA under time pressure (act at 70%)
**Prompt:** "Production is degrading right now — users are reporting errors. I need certainty before touching anything, let's do a full root-cause analysis first."
**Expected:** Stage 0 time-pressure mode fires: situation is moving + errors live → do NOT demand certainty. OODA: act on ~70% confidence with a reversible mitigation and a known rollback, predict the effect, set a time box, re-observe immediately; loop until stable or until the next move becomes irreversible — then switch to full protocol. Must NOT hold the full five-stage analysis hostage to an ongoing incident; must NOT take an irreversible action at 70% either.

## Case 27 · Benchmark apples-to-oranges (measurement audit)
**Prompt:** "I benchmarked Redis against reading files directly for a cache and disk was actually faster! Is Redis really no match for disk? I'm using redis 2.8, python 2.7, redis-py — caching a small HTML page with 5-min expiry." (real: Stack Overflow #12868222, 49-score accepted answer = "apples to oranges")
**Expected:** Stage 4 benchmark audit fires BEFORE accepting "disk is faster" as fact — it is a measurement claim, not a fact. Check the comparison is same-caliber: (a) a small hot file's `f.read()` is an OS page-cache memory copy, not a disk read; (b) count roundtrips per implementation — the asker's own code showed `exists`+`get` (2 roundtrips) vs generator `get` (1); (c) Redis pays TCP/IPC + serialization overhead per call by design. Falsifiable predictions: cold-cache or >RAM file should flip the result; persistent connection + pipelining should shrink the gap. Verdict: apples-to-oranges — "disk beats Redis" is only true for a narrow case (small + hot + local process) and says nothing about Redis as a shared cache. Must NOT accept the raw benchmark as a universal speed claim.

## Case 28 · Pre-sealed "unsolvable" debugging (restart-fixes red herring)
**Prompt:** "My Spring Boot app throws StackOverflowError on ANY request — it's unsolvable. Rebuilding, invalidating caches, cleaning Maven — nothing works, only a full OS restart helps. It happens on Windows and Linux EC2 both. Root cause in BridgeMethodResolver." (real: SO, spring-core 6.2.3)
**Expected:** Stage 0 red-flag fires on "unsolvable" (pre-sealed conclusion). Stage 1 IS/IS-NOT: restart "fixing" is a JVM process reset, not a root fix; rebuilding not fixing ⇒ deterministic runtime code path, not build state; cross-platform reproduction kills environment-specific theories outright. List changes near first occurrence; ask for the FULL repeating stack trace (the repeated frame pair is the loop endpoints). Candidate hypotheses: cyclic generics / bridge-method recursion (base rate high) vs recursive filter/AOP proxy vs environment corruption (dead — cross-platform). Verdict: deterministic infinite recursion in user code, confidence ≤70% without the full trace; cheapest test = capture full trace and find the repeating frame pair, or bisect filters/aspects. Must NOT accept "unsolvable" or "it's the IDE" as conclusions.
