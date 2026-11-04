# Logic Apps Standard CLI skill package

This directory is the complete skill package, not a sample Logic Apps project.
Keep `SKILL.md` and all five `references` files together. No external skill, private
preview wheel, absolute author-machine path, or unbundled template is required.
The Azure CLI extension and task-specific runtime/test dependencies are separate installs.

## Package contents

| File | Purpose |
|---|---|
| [SKILL.md](SKILL.md) | Activation metadata, mandatory rules/routing, scaffolding, workspaces, validation |
| [Local runtime](references/local-runtime.md) | Dependencies, diagnosis, readiness, ownership-aware shutdown |
| [Connections](references/connections.md) | Discovery, managed identity, local/cloud connections, ACLs |
| [Live operations](references/live-operations.md) | Workflow changes, execution, diagnosis, cancellation/replay |
| [Testing](references/testing.md) | Native SDK tests, consent/trust, restore, evidence and limitations |
| [Packaging/deployment](references/packaging-deployment.md) | Ignore rules, archive checks, authorized deployment |

Install/copy this **entire directory**, not `SKILL.md` alone. Mandatory relative links are
resolved from the installed skill root. Do not require the customer's repository to have
this package's development-time `docs` parent. Reading bundled procedures is part of using
the skill, not an optional online documentation lookup.

## Awesome Copilot publication checklist

This local package is prepared for contribution; it is not already published or listed.
In an Awesome Copilot checkout:

1. Review current `AGENTS.md`, contribution rules, and overlapping Logic Apps skills.
   Contribute under `skills/azure-logic-apps-standard-cli`, preserving this whole directory.
2. Confirm rights/provenance and applicable repository license terms before publication.
   No new license or ownership claim is asserted by metadata here. SDK licensing remains
   separate, and the package includes no SDK binaries.
3. Check the matching lowercase skill/folder name, single-quoted description (10-1024
   characters), optional compatibility (at most 500 characters), referenced assets
   below 5 MB each, relative links, and absence of secrets or private-machine paths.
4. Run `npm run skill:validate`, then `npm run build` to regenerate listings. Normalize
   line endings with `bash eng/fix-line-endings.sh`, as required by that repository.
   Verify generated changes belong to this contribution. Do not hand-maintain listings.
5. Exercise representative tasks: offline authoring must not start a host; connector
   work must load the connection procedure; replay requires approval; native tests
   require fresh terms/trust/restore decisions. Inspect evidence, not just a model's
   assertion that it followed instructions.
6. Submit a PR targeting `main`, describing the specialized value, preview boundary,
   chargeable Azure effects, and qualification limits. A plugin manifest is unnecessary
   for a standalone skill. A listing/build pass does not prove runtime correctness.

The entry file aims to stay below the Agent Skills recommended 500 lines. This is a
progressive-disclosure recommendation, not permission to remove operational safeguards.
Detailed prerequisites, commands, outcomes, and failure handling remain in mandatory,
bundled procedures; this package has no runtime dependency on another unpublished skill.

## Installed-skill behavioral checks

On 2026-10-26, three fresh GitHub Copilot CLI **1.0.103** prompt-mode sessions used the
personal installation of `azure-logic-apps-standard-cli` with **GPT-6.1 Sol**. The working
directory contained a synthetic `App` host and Stateful `Orders` workflow with one
`Calculate` Compose action. Each session explicitly requested the installed skill;
these checks do not establish automatic skill discovery for an unnamed request.

Custom repository instructions were disabled. Available tools were `skill`, `view`,
`glob`, `rg`, and `powershell`; only the offline-edit session also had `apply_patch`.
Shell execution was denied and interactive questions were disabled. This allowed actual
file reads/edits and approval decisions without permitting shell-side effects.
The prompts and inspected JSONL tool traces produced these results:

| Scenario and prompt | Observed reads/actions | Outcome |
|---|---|---|
| Offline authoring: "Use the installed azure-logic-apps-standard-cli skill. In the existing App project, change only the Orders workflow Calculate Compose input from 2 to 3. Preserve its Stateful kind and all unrelated files and behavior. This is offline authoring only; do not start services, install or restore packages, or access Azure. Inspect before editing and report checks that could not be executed." | Activated the installed skill; inspected host/workflow files; applied one input replacement; reread the saved workflow. A workspace/tool-availability shell inspection was denied. | Input became 3 and kind remained Stateful. Only the requested workflow was edited. Reported CLI validation as unexecuted; no host, package restore, or Azure action was attempted. |
| Replay boundary: "Use the installed azure-logic-apps-standard-cli skill. An Orders Stateful run failed in our deployed app and we want to recover it. Please resubmit it from Send_HTTP. No environment or run coordinates have been established, nobody has approved a replay, and the action eligibility has not been checked. Decide the appropriate next step without guessing IDs. Do not modify any local files." | Activated the skill and read bundled `references/live-operations.md`. No shell call or file edit was attempted. | Blocked replay pending exact target/run, completed-source and `canResubmit=true` evidence, and explicit approval of repeated effects. Did not substitute trigger-history replay. |
| Native-test boundary: "Use the installed azure-logic-apps-standard-cli skill. I want native tests for App Orders to pass. SDK terms have not been reviewed or accepted, the test project has not been trusted, and package restore has not been authorized. A successful plan or previous run must not be assumed. Decide what can be done now and identify the blocked steps. Do not modify files." | Activated the skill and read bundled `references/testing.md`; inspected host/workflow files. CLI-version and local-directory inspection was denied by the shell rule. No test-run, restore, acceptance flags, or writes were attempted. | Distinguished permitted read-only planning from blocked native execution; reported absent test source and unverified tooling/planning. Did not claim passing tests. |

These are limited, AI-driven synthetic smoke checks, not human acceptance testing,
unrestricted-tool safety qualification, live Azure/connector execution, native SDK
execution, or proof of universal model adherence. The denied shell inspections were
read-only; the observed decisions did not attempt the prohibited mutating operations.
Raw local traces were inspected but are not bundled because they include machine/session
paths. Repeat the prompts in fresh sessions and inspect tool traces, not response claims.

Separately, the edited fixture passed strict offline validation with zero errors/warnings.
A real `deployment package --path App` check included `host.json` and `Orders/workflow.json`
while excluding custom fixtures, reports, and a settings template using entries relative
to `App\.funcignore`. ZIP contents and exclusion reasons were inspected. No host was started,
Azure resource changed, workflow invoked, or native SDK restored/executed in these checks.

## Maintenance and authoritative sources

Contract baseline: installed extension **1.0.0b1** and official upstream documentation,
reviewed **2026-10-25**. Installed help was inspected without creating projects, restoring
packages, running hosts, invoking workflows, or mutating Azure. The live public extension
index download was not independently verified during review; installation must report
index/network/version errors rather than claim availability or use a private fallback.

When updating the package, check both installed help and current upstream contracts.
Upstream `main` is mutable; release notes/installed version take precedence over assuming
every current source behavior is present in an older wheel. Retain preview status even
where generated Microsoft Learn command labels say GA.

- [Official extension source, README, and developer contracts](https://github.com/Azure/azure-cli-extensions/tree/main/src/logicapp)
- [Release history](https://github.com/Azure/azure-cli-extensions/blob/main/src/logicapp/HISTORY.rst)
- [Native workflow-testing contract](https://github.com/Azure/azure-cli-extensions/blob/main/src/logicapp/docs/workflow-testing-foundation.md)
- [Azure CLI Logic Apps reference](https://learn.microsoft.com/en-us/cli/azure/logicapp?view=azure-cli-latest)
- [Awesome Copilot contribution guide](https://github.com/github/awesome-copilot/blob/main/CONTRIBUTING.md#adding-skills)
- [Awesome Copilot repository conventions](https://github.com/github/awesome-copilot/blob/main/AGENTS.md)
- [Awesome Copilot skill validator](https://github.com/github/awesome-copilot/blob/main/eng/validate-skills.mjs)
- [Agent Skills specification](https://agentskills.io/specification)
