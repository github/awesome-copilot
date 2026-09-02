# AgentScan mechanism reference

Snapshot date: 2026-09-02.

AgentScan is a third-party MIT-licensed project for open-source maintainers. It is not a GitHub account-enforcement service and its own privacy page states that GitHub has no association with it.

## Data flow

1. The `@unveil/identity` library receives a public GitHub profile and recent public events. Some callers can also provide commit metadata.
2. Deterministic detectors produce grouped signals. Broad categories include account/profile state, activity timing and bursts, fork and pull-request patterns, comment/review distribution, repository spread, target types, and optional AI-attributed commit metadata.
3. The library returns a score, classification, confidence, flags, and the observed event window. Results are indicators rather than verdicts.
4. Separate consumers display or act on that result: the website/API, GitHub App, GitHub Action, browser extension, userscript, and hourly ecosystem scanner.
5. A separate community-report process can add an account to a public verified list after reviewer voting. Membership in that list is distinct from an algorithmic classification.

## Possible repository-local effects

The App or Action can create a check, comment, apply labels, expose outputs to later workflow steps, and optionally close an issue or pull request. Auto-close and the interactive honeypot are configurable and are not enabled by the default configuration. A repository can exempt named users or trusted author associations.

The optional honeypot places machine-targeted text in a hidden HTML comment. The awareness workflow must flag the presence of such content to the human owner and must not automatically follow or answer it.

## Visibility limits

- A checked-in Action workflow or `.github/agentscan.yml` is publicly observable.
- Existing AgentScan labels or comments are historical evidence, not proof of current configuration.
- A GitHub App installation can exist without a checked-in config file.
- Silent mode, custom labels, and maintainer-side browser extensions or userscripts may leave no pre-contribution repository signal.
- GitHub's public-events window is capped and time-limited, so classifications can change as the window changes.
- Low confidence and sparse event windows warrant extra caution. Do not turn detector output into a factual claim about the account owner.

The core config treats an account under 90 days old as young. That threshold is not a post-flag expiry timer. A rolling algorithmic classification may change as events age out, while a community verified-list entry remains until the project removes or corrects it.

## Community review and correction

At the snapshot above, reports are public GitHub issues and only reactions from a configured reviewer roster count. The checked-in workflow requires four approvals to add an account to the list and two rejections to reject a report. The repository also contains rejected reports, cleared reports, and documented false-positive corrections.

If an account is wrongly listed, use the linked public issue to provide evidence and request correction. Do not attempt to manipulate activity to influence the classifier.

## Primary sources

- [AgentScan repository](https://github.com/MatteoGabriele/agentscan)
- [AgentScan Action](https://github.com/MatteoGabriele/agentscan-action)
- [`@unveil/identity` core](https://github.com/unveil-project/identity)
- [AgentScan privacy policy](https://agentscan.tools/privacy-policy/)
- [False-positive correction #381](https://github.com/MatteoGabriele/agentscan/issues/381)
- [Rejected report #393](https://github.com/MatteoGabriele/agentscan/issues/393)
- [Cleared report #362](https://github.com/MatteoGabriele/agentscan/issues/362)
