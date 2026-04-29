# Scoring Rubric — Anchoring Examples

Anchor examples for each criterion at scores **1**, **5**, and **10**. Use these to calibrate estimates. Interpolate for intermediate scores.

All scales are 1–10. See the main [SKILL.md](../SKILL.md) for formal definitions and the prioritization formula.

Anchors are drawn from multiple domains — pick the row closest to your countermeasure's character and adjust. If your domain isn't represented, reason by analogy.

---

## Return on Investment (ROI)

*1 = low efficiency gain to the step and value stream. 10 = high efficiency gain.*

| Score | Platform / DevEx | Security | SRE / Ops | App Dev / Governance |
|-------|------------------|----------|-----------|----------------------|
| **1** | Cosmetic repo metadata cleanup (description, topics) on low-traffic repos. | Rotating a credential no service actually uses. | Renaming a dashboard widget. | Renaming variables to fix a lint warning nobody reads. |
| **5** | Adding CODEOWNERS to the top-20 most-active repos — targeted review coverage. | Enabling MFA for a single high-privilege admin group. | Adding SLO alerting to one tier-2 service. | Documenting API contracts for one service via OpenAPI. |
| **10** | Enforcing 2FA org-wide, enabling secret scanning + push protection, or shipping a CI pipeline to a team that previously merged untested. | Enforcing SSO + MFA enterprise-wide; removing standing admin rights. | Auto-remediating the top-2 pager-driving alert classes. | Replacing a failing manual approval gate with automated policy-as-code. |

## Cost to Implement

*1 = inexpensive (minutes of admin time). 10 = very expensive (multi-quarter program, new licenses, dedicated headcount).*

| Score | Platform / DevEx | Security | SRE / Ops | App Dev / Governance |
|-------|------------------|----------|-----------|----------------------|
| **1** | Flipping an org-level toggle — single admin, < 1 hour, no purchase. | Enabling a free advisory scanner in alert-only mode. | Adjusting an alert threshold. | Adding a `CONTRIBUTING.md`. |
| **5** | Rolling out org-wide rulesets across 50–200 repos — cross-team coordination, a week of engineering, no new SKU. | Implementing a secrets manager for one business unit. | Standing up centralized logging for a mid-size estate. | Refactoring a shared library used by ~10 services. |
| **10** | Enterprise-wide GHAS rollout on unlicensed repos — new seat purchase, procurement, security-team ownership, training funded for months. | Replacing identity provider; zero-trust program. | Multi-region active/active rearchitecture. | Re-platforming a monolith to services; multi-quarter, funded team. |

## Ease of Deployment

*1 = extremely hard to deploy. 10 = very easy to deploy.*

| Score | Platform / DevEx | Security | SRE / Ops | App Dev / Governance |
|-------|------------------|----------|-----------|----------------------|
| **1** | GHES → GHEC migration with custom SAML, self-hosted runners, LFS. Deep cut-over planning, downtime windows. | Enforcing SSO for the first time on a large enterprise without a grace period. | Live database engine swap with zero downtime. | Breaking API change across hundreds of downstream consumers. |
| **5** | Enabling Dependabot across all active repos — technically simple, operationally non-trivial (PR triage capacity, owner education). | Rolling out EDR agents to a mid-size fleet. | Adding distributed tracing to existing services — library upgrades + coordination. | Moving a shared config to a feature-flag service across ~20 services. |
| **10** | Adding a `CODEOWNERS` file or enabling auto-delete head branches on a single repo — one commit / one checkbox, immediate effect, trivial rollback. | Toggling secret scanning alerts on one repo. | Adjusting a retry policy in one service. | Adding a README section or a single lint rule. |

## Risk Factor

*1 = low risk to the value stream. 10 = very high risk.*

| Score | Platform / DevEx | Security | SRE / Ops | App Dev / Governance |
|-------|------------------|----------|-----------|----------------------|
| **1** | Enabling secret scanning in **alerts-only** mode. No developer-facing block; worst case is noisy alerts. | Adding a passive audit log export. | Adding a new dashboard; read-only. | Adding optional documentation. |
| **5** | Rolling out required status checks on default branches — can block releases if CI is flaky; recoverable by loosening rules or fixing CI. | Enforcing MFA on a subset of admins with a grace period. | Changing autoscaling thresholds — could over/under-provision temporarily. | Introducing a new required review policy. |
| **10** | Changing SAML SSO provider or enforcing SSO estate-wide without a grace period. Can lock users out and halt merges across the value stream. | Rotating all production secrets simultaneously without staged cutover. | Cut-over migration of the primary datastore with no parallel run. | Removing a widely-used public API version with no deprecation window. |

---

## Calibration Tips

- **Cross-check**: If ROI is 10 but Cost is also 10, the Priority formula still rewards it when Ease is high and Risk is low. That's intentional — high-leverage, high-investment work remains visible.
- **Don't anchor Cost on license price alone.** Human-capital time (security triage, onboarding, change management, review burden) dominates most rollouts.
- **Risk ≠ Cost.** A cheap change (toggle enforcement) can carry very high Risk if staged poorly.
- **Ease ≠ ROI.** A one-click change with low ROI still ranks modestly; the formula only pushes it up if Risk is also very low.
- **Estimate explicitly.** When you don't have data or user-confirmed context, score against the anchor and mark the rationale `(estimated)`.
- **Domain mapping.** If your item doesn't match any column, pick the closest analog (scale of blast radius, reversibility, and human-hours is what matters — not the technology).
