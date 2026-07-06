# Upgrading dependencies safely

Every layer of this stack is pre-1.0, release-candidate, or preview as of mid-2026: `@ag-ui/*` is 0.0.x, `agent-framework-ag-ui` is an RC, the Foundry hosting packages are alpha/beta, hosted agents themselves are preview, and CopilotKit ships weekly minors that move APIs. Upgrades are where this stack breaks. Never bump one package in isolation.

## Version relationship rules (all must hold simultaneously)

1. **`@ag-ui/client` ↔ `@copilotkit/runtime`**: the runtime pins an exact `@ag-ui/client` version. Your app's `@ag-ui/client` must match it, or TypeScript breaks on `HttpAgent` shape differences (e.g. missing `pendingInterrupts`). After bumping CopilotKit, read the installed runtime's `package.json` and align.
2. **`@copilotkit/*` packages move together**: `react-core`, `react-ui`, and `runtime` are released in lockstep — never mix versions. Check the lockfile actually resolved what `package.json` asks for.
3. **`agent-framework-*` Python packages stay on one line**: `agent-framework-core`, `agent-framework-foundry`, `agent-framework-ag-ui`, and the hosting package must be from compatible releases. Depend on `agent-framework-core` + specific extras, not the `agent-framework` meta-package (it drags optional dependencies that break Foundry remote image builds).
4. **Hosting protocol version ↔ agent manifests**: the Foundry hosting package implements a specific Responses protocol version; `agent.yaml` AND `agent.manifest.yaml` must declare the same `version:` or the agent fast-fails at startup with an explicit protocol-mismatch RuntimeError. Bump package and both manifests in one commit.
5. **Deprecated package check**: `agent-framework-azure-ai` was superseded by `agent-framework-foundry`. If the codebase still imports the old one, migrate before any other upgrade.

## The upgrade loop

1. **Inventory local workarounds first.** Maintain a ledger mapping every patch/workaround in the codebase to the upstream issue it exists for (e.g. approval-forwarding code ↔ microsoft/agent-framework#6652; a `previous_response_id` guard ↔ #6851/#6828; a frontend fetch-bind shim ↔ the Illegal-invocation bug). An upgrade is the ONLY time these may be removed, and only when the issue is closed in the shipped version AND the regression test guarding that workaround passes without it. Never delete a workaround on a version bump alone.
2. **Read what actually shipped.** CopilotKit release notes are often empty auto-release stubs — diff the bundled `.d.ts` files between versions for API changes, and scan the issue tracker for regressions in your integration path (remote `HttpAgent` + frontend tools is a historically fragile combination).
3. **Bump coherently** per the rules above; reinstall; check the lockfile resolution.
4. **Re-verify the full matrix, live** — not just compile:
   - read/query path through the real UI;
   - frontend tools visible to the agent (explicitly — this has regressed before);
   - approve executes the gated tool exactly once; reject executes zero times;
   - follow-up turns after an approval do not re-execute (hitl.md hazard);
   - tool/approval cards still present after `RUN_FINISHED`, not just during streaming.
5. **For hosted agents**: restart `azd ai agent run` after a dependency change (the local runtime caches nothing between runs, but YOUR in-memory seed data resets — re-baseline before asserting), then redeploy and spot-check the deployed endpoint; local success does not prove the remote image builds (remote builds resolve dependencies independently — explicit pins avoid drift).

## Known upstream issues to check on every upgrade

Statuses were accurate as of July 2026 — re-check before acting on them:

| Issue | What it causes | Local workaround pattern |
| --- | --- | --- |
| microsoft/agent-framework#6652 | AG-UI adapter resolves HITL approvals locally; never forwards to a remote/hosted agent, so approved tools don't re-execute | Custom approval routing in the bridge |
| microsoft/agent-framework#6851 | Approval-gated tool silently re-executes on a later unrelated turn (duplicate side effect) via `previous_response_id` chaining | Don't chain the response id from an approval-resolving turn (hitl.md) |
| microsoft/agent-framework#6828 | Approval UI state reverts to "in progress" after completion; related to #6851 | Cosmetic unless paired with #6851 |
| CopilotKit/CopilotKit#5813 | Frontend tools not forwarded to `RunAgentInput.tools` with remote `HttpAgent` (1.62.x era) | Upgrade past the fix; re-test tool visibility after every bump |
| CopilotKit/CopilotKit#5812 | `TEXT_MESSAGE_END` emitted after `RUN_ERROR`, breaking error handling | Upgrade past the fix |

## Foundry platform deadlines

Hosted agents deployed on the pre-April-2026 preview backend (`azure-ai-agentserver-agentframework` / `-langgraph` path) reached end of support on 2026-05-22 — anything still on that path must be redeployed on the current hosting packages, not upgraded in place. See the hosted-agent migration guide on Microsoft Learn (`/azure/foundry/agents/how-to/migrate-hosted-agent-preview`).
