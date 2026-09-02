# Contribution risk methodology

This methodology protects an account by reducing unreviewable maintainer load and preserving evidence of human responsibility. It must not be converted into detector-threshold tuning.

Run it before every external repository contribution. The cost being managed is practical: personal account reputation, maintainer trust, time lost to closed work, and the wider effect of a community-list entry across adopting repositories.

Use perspective-taking as part of the risk model. The owner expects the agent to protect a valuable account without needing to know every maintainer-side tool. The maintainer expects each public action to justify its review cost and to have an accountable human behind it. A good preflight protects both expectations.

## Repository attention levels

Assess live state immediately before contributing; checked-in workflows and policies can change.

- **High attention:** the repository publicly enables AgentScan auto-close or honeypot behavior, prohibits AI-generated contributions, or has recently rejected similar contributions. Human review and explicit maintainer alignment are required before any write.
- **Elevated attention:** the repository runs AgentScan in label/comment/check mode, has AgentScan-related labels, or has a strict AI disclosure policy. Prepare a complete evidence packet and ask the owner before every write.
- **Policy attention:** no AgentScan signal is visible, but the repository has contribution or AI rules. Follow those rules and maintain the same human approval gate.
- **Unknown:** no public signal is visible. Do not infer safety; App installations, silent mode, custom labels, browser tools, and changing policies may be invisible.

The public adopter list is a discovery lead, not an enforcement list. Confirm each repository's current workflow, configuration, labels, and contribution policy before classifying it.

For a dated set of verified examples, read [current-repository-examples.md](current-repository-examples.md), then re-run the live inspector before relying on it.

## Healthy contribution pattern

A legitimate contribution should be explainable without reference to AgentScan:

1. The owner can state why the problem matters and how it was discovered.
2. The work follows the target repository's contribution and AI policies.
3. The change has one coherent scope, a reproduction or motivating evidence, and tests appropriate to the project.
4. The owner has read the diff, can explain the design, and accepts responsibility for the result.
5. The pull-request text is specific to the repository and accurately states tests, limitations, provenance, and AI assistance when required.
6. Review feedback is answered by the owner or by an agent drafting for owner approval; no autonomous argument or outreach occurs.
7. Concurrent work stays within what maintainers explicitly invited and can reasonably review.

## Risky behavior

Treat these as stop-and-review signals because they impose cost or obscure accountability:

- many unsolicited pull requests across unrelated repositories;
- bursts of forks, branches, pull requests, comments, reviews, stars, or repository creation;
- continuous around-the-clock external activity under a personal account;
- comments that claim an issue followed almost immediately by a finished patch without credible investigation evidence;
- repeated rejected or closed contributions with no learning or maintainer agreement;
- generic, templated, promotional, coercive, or confrontational messages;
- a patch without a minimal reproduction, tests, project-specific rationale, or evidence that the owner understands it;
- targeting beginner or bounty issues at scale;
- hiding AI assistance where disclosure is requested;
- changing timing, wording, branch names, profile fields, or metadata solely to influence a detector.

## Legitimate repetitive work

Large migrations and mechanical changes can be valid. Before starting them:

- open or locate a planning issue and obtain maintainer agreement on scope;
- define batch size and review cadence with the maintainers rather than deriving it from a detector;
- use a clearly identified bot or GitHub App if execution is autonomous;
- make runs idempotent and stop automatically on rejection, changed policy, or failed validation;
- keep an auditable ledger connecting every external write to owner approval and test evidence.

## When a contribution is flagged

Do not reply automatically. Treat the flag as a state transition, not as another conversational prompt:

1. freeze queued comments and external actions for that repository;
2. capture the exact check, label, closing comment, report URL, current diff, and test evidence;
3. explain to the owner whether this is an algorithmic classification, a repository-local action, or a community-list report;
4. identify the repository's documented appeal or reopening path;
5. let the owner decide whether silence, withdrawal, maintainer contact, or one evidence-based correction best protects the contribution and account.

An agent repeatedly denying that it is an agent creates noise, consumes reviewer time, and can strengthen the very inference it is trying to contest.

Neither automatic self-defence nor automatic exclusion should be treated as the ideal endpoint. Prefer a reversible pause, human context, a bounded correction, and a documented removal or reopening path when evidence supports it.

If the owner was unaware of the mechanism, the agent should recommend the lowest-risk choice and may decline the external write until the owner makes an informed decision. This is not a claim that the detector is morally correct; it is stewardship of an account asset whose reputation is difficult to rebuild.

Declining an external write does not end local assistance. Repository rules do not become agent instructions and do not override the owner. Switch to the broadest locally useful mode the policy permits: comprehension, reproduction, debugging, research, review, test execution, or private experimentation. Distinguish strict no-generated-content policies from conditional human-in-the-loop policies; the latter may permit drafted code after owner verification and disclosure, while the former requires the owner to independently author submitted material.

## Message quality

Use wording that improves review, not wording designed to appear human. A useful issue or pull request says what changed, why it belongs in this project, how it was validated, what remains uncertain, and who takes responsibility. Avoid generic praise, fabricated personal experience, pressure to merge, repeated follow-ups, and claims the owner cannot substantiate.
