# Azure DevOps Team load

A read-only Copilot canvas showing each selected person's open work across Azure Boards projects and Azure Repos repositories. Use it to review ownership and individual PR review work. It does not estimate hours, read Teams presence or change Azure DevOps records.

The preview shows a genuine empty configuration. No organisation, person or work record is preconfigured.

## What it shows

1. Organisation, project, repository and people pickers, using authorised Azure DevOps API results.
2. Owned open work items, authored active PRs and outstanding individual reviews for each selected identity, with expandable records and reviewer votes.
3. Unassigned work items needing an owner. Work owned by untracked or inactive people remains owned.
4. A configurable open work threshold, manual refresh, visible-page auto refresh, coverage details and the last successful refresh.
5. Explicit authentication, permission, query-limit, partial-coverage and stale-data messages.

## Match to the original and reuse

The core workflow follows the original Team load canvas: pick people and repositories, inspect each person's open records and PR roles, expand details, find work needing an owner, compare counts with a shared threshold and refresh while the page is visible. Azure DevOps adds organisation/project scope and process-specific state categories. A PR counts once per person even when they have multiple roles.

The first version intentionally omits remote editing, agent handoff, momentum charts and session markers. It measures open work records, not availability or hours. It supports Azure DevOps Services, not Azure DevOps Server.

Use a distinct profile, such as `{"profile":"another-team"}`, for a different team or organisation. The same profile restores its private selection across workspaces and host restarts. Saved selections remain visible while catalogs load and are never silently cleared because a catalog is empty. Saved people with zero work are revalidated against the organisation directory using the official [Graph descriptor API](https://learn.microsoft.com/en-us/rest/api/azure/devops/graph/descriptors/get?view=azure-devops-rest-7.1).

To verify reuse, save a scope, restart the extension provider, reopen the profile, change only its threshold and save. Confirm its organisation, projects, repositories and people remain unchanged. The regression tests cover fresh-client selection preservation, zero-work identities and missing-directory membership.

## Prerequisites and installation

Use a Copilot host supporting canvas extensions and an installed, authenticated Azure CLI. Windows uses the Python interpreter from the standard Azure CLI installation, resolved from `Get-Command az`; Linux and macOS use `az` on PATH. The Azure DevOps CLI extension supplies configured-organisation discovery. Work items, PRs and directory users are read through REST APIs.

You need existing organisation/project access, permission to read work items and PRs, and permission to enumerate Graph users for the full people picker. If Graph enumeration is denied, the canvas reports the boundary and offers identities observed in readable work. No new permissions are granted.

This source can be installed as a personal extension, independently of any repository:

```powershell
$copilotHome = if ($env:COPILOT_HOME) { $env:COPILOT_HOME } else { Join-Path $HOME '.copilot' }
$extensionDir = Join-Path $copilotHome 'extensions\ado-personal-team-load'
if (Test-Path -LiteralPath $extensionDir) {
    throw 'This extension already exists. Back it up and review the update before replacing it.'
}
New-Item -ItemType Directory -Path (Join-Path $copilotHome 'extensions') -Force | Out-Null
Copy-Item -LiteralPath '.\extensions\ado-personal-team-load' -Destination $extensionDir -Recurse
```

Reload extensions in the host, inspect capabilities for canvas ID `ado-personal-team-load`, and open it with an object:

```json
{"profile":"personal"}
```

Do not install `@github/copilot-sdk`. The runtime resolves the extension SDK automatically. A packaged plugin should be installed through the host's supported plugin workflow. Avoid loading both a personal copy and a plugin copy with the same canvas ID unless you intend to share its private profile namespace.

See [Copilot canvas extensions](https://docs.github.com/en/copilot/how-tos/github-copilot-app/working-with-canvas-extensions).

## Authentication

Check the existing CLI identity without printing a token:

```powershell
az account show --query "{tenantId:tenantId}" -o json
az account get-access-token --resource 499b84ac-1321-427f-aa17-267ca6975798 --query "{expires_on:expires_on,tenant:tenant}" -o json
az devops configure --list
```

If authentication is required, replace the placeholder with the verified tenant GUID that owns the organisation:

```powershell
az login --tenant <tenant-guid> --scope 499b84ac-1321-427f-aa17-267ca6975798/.default --allow-no-subscriptions
```

Do not log out other CLI sessions or paste tokens into the canvas, configuration, URLs, source or logs. The Node adapter obtains Azure DevOps resource tokens using supported Azure CLI authentication, retains them only in process memory, and never sends them to the browser.

The browser receives domain data and a same-origin request protection key. The HTTP server binds to `127.0.0.1` on an ephemeral port, rejects other hosts/origins and does not enable CORS. External work titles and names are rendered as text, never interpreted as instructions or trusted HTML.

See [Microsoft Entra authentication for Azure DevOps](https://learn.microsoft.com/en-us/azure/devops/integrate/get-started/authentication/entra), [Azure CLI interactive authentication](https://learn.microsoft.com/en-us/cli/azure/authenticate-azure-cli-interactively) and [Azure DevOps CLI authentication](https://learn.microsoft.com/en-us/azure/devops/cli/log-in-via-pat).

## Select scope

1. Expand **People and scope**. Discover organisations through the existing identity, or enter an existing Azure DevOps Services organisation URL you can access. Use the optional tenant GUID when it differs from the CLI default tenant.
2. Load projects. Select intended projects, then load repositories and people.
3. Search and select people. The server pages the Graph user list; the browser shows the first 100 search matches and retains selections outside those matches. Directory descriptors are resolved to Azure DevOps identity GUIDs. Identical display names remain separate.
4. Choose repositories, or leave the repository selection empty to cover all API-visible repositories in the selected projects. Work items belong to projects; repository selection does not narrow work item coverage.
5. Set the threshold and refresh interval, then save. Saving affects private local configuration only and refreshes live data.
6. Expand a person for records, a PR's reviewer status for votes, and **Coverage and refresh details** for source counts and snapshot times.

The default threshold is six records. The interval must be 60 to 86,400 seconds. Auto refresh runs only while the page is visible and its checkbox is enabled. Visible pages also read shared local state every five seconds so agent actions reach the UI without another live API query.

Profiles are stable private identities, independent of panel IDs and repository paths. Use different profile names for different organisation/team selections. Reopening the same `instanceId` and profile reuses the server; a different profile needs a new instance ID.

## Counting rules and coverage

1. Work item type/state mappings come from the selected project's state API. Categories `Proposed`, `InProgress` and `Resolved` count as open. `Completed` and `Removed` do not. Custom types and state names use their actual project mapping; unknown categories or missing mappings fail that source instead of guessing.
2. Authored active PRs count, including drafts. Only individual reviewers with vote `0` count as outstanding reviews. Approved (`10`), approved with suggestions (`5`), waiting for author (`-5`) and rejected (`-10`) votes do not. Declined, inactive, deleted and group/container reviewers are excluded from individual review counts.
3. Multiple roles on a PR count once in a person's total, although that PR can appear in both role lists. Column counts therefore need not sum to the total.
4. AssignedTo must identify the actual owner by ID. A nonempty but unsupported ownership value fails coverage; it is not matched by name or classified as unassigned.
5. Project and directory continuation tokens are followed. Work item queries use no `$top`, exact state/type clauses and a shared WIQL ASOF snapshot. Azure DevOps can apply permission filtering after `$top`, so short or empty truncated pages cannot prove complete coverage. Queries exceeding the 20,000-result limit are split into disjoint ID ranges until each fits; details are read in batches of 200.
6. Active PRs use `$top` and `$skip`; full reviewer lists are read separately. Repeated cursors, duplicate PR IDs and incomplete work item batches raise coverage errors.
7. Coverage means the selected API-visible scope. Hidden resources can be omitted by Azure DevOps without revealing their number. The canvas does not claim organisation-wide capacity. Group reviews are reported as excluded, not expanded into supposed individual requests.
8. Work items use ASOF snapshots. PR and reviewer endpoints have no shared snapshot guarantee and can change during a scan. Snapshot/read completion times are shown.
9. An initial partial scan shows lower bounds. If a later scan fails, its previous data stays visible as stale with the last complete refresh time. A failed source never becomes a success-shaped empty list.

There are limits of 30 selected projects, 30 explicitly selected repositories and 100 selected people. Empty repository selection can cover more repositories. Lists and work sources have a 100,000-readable-record safety ceiling that fails explicitly. There are no analytics, sprint planning, remote assignment, agent-launch or model-running features.

## Actions and architecture

Agent-callable actions and HTTP controls share the same validated dispatcher:

1. `get_state`: configuration, revision, open work, record details, catalog, coverage and freshness.
2. `discover`: authorised organisations, projects, repositories and people.
3. `resolve_people`: selected directory descriptors to identity GUIDs.
4. `set_tracking`: private scope/preferences. Supply the revision from `get_state`, the intended config and descriptor mappings for newly selected directory identities. Accessible projects, repositories and identities are verified before saving.
5. `refresh`: live read and load computation.

`extension.mjs` wires the SDK. `adapter.mjs` handles authentication, queries and normalisation. `model.mjs` computes load. `hub.mjs` manages profiles, coverage and storage. `schemas.mjs` validates both action surfaces. `server.mjs` serves the sibling assets. No source path, workspace, organisation, project or person is hardcoded.

Private data lives at `<copilot-home>/extension-data/ado-personal-team-load/<profile>.json`. A nonempty `COPILOT_HOME` is used exactly as supplied; otherwise the SDK-independent home resolution is `path.join(os.homedir(), '.copilot')`. Files store only selections/preferences, format `ado-personal-team-load`, version `1`. Live work content stays in memory.

Writes use unique same-directory temporary files, atomic rename, a lock and revision comparison. Stale concurrent saves fail visibly. Corrupt/unrecognised files are not overwritten. After a crashed process, confirm no save is running, back up that profile, and remove only its stale `.lock` file before retrying.

## Verification

Run from this extension directory:

```powershell
node --check .\extension.mjs
node --check .\assets\app.mjs
node --test .\tests.mjs
```

Tests cover identity separation, ownership, inactive states, custom mappings, unique PR roles, reviewer votes, empty/unassigned records, directory omissions, result-limit range splitting, permission-filtered page traps, continuation/PR paging, failed and partial sources, stale snapshots, conflict-safe persistence and same-origin HTTP protection.

After opening and refreshing actual authorised data, compare displayed counts with an independent source read:

```powershell
node .\verify-live.mjs "http://127.0.0.1:<panel-port>/"
```

Use the URL returned by `open_canvas`. The verifier reads all work item states independently, including terminal states, classifies them using the source API, and checks unique per-person work against PR author/reviewer reads. It performs no remote writes. If records change during comparison, refresh and retry.

To change counting rules, edit `model.mjs`. To change authentication, state mapping or paging, edit `adapter.mjs`. Run tests, reload, inspect capabilities, open and invoke an action, reopen the same instance and verify preserved selections, then compare live source counts. To change scope or thresholds, use the UI or `set_tracking`.

Official API contracts:

1. [Projects](https://learn.microsoft.com/en-us/rest/api/azure/devops/core/projects/list?view=azure-devops-rest-7.1)
2. [Graph users](https://learn.microsoft.com/en-us/rest/api/azure/devops/graph/users/list?view=azure-devops-rest-7.1)
3. [Descriptor storage keys](https://learn.microsoft.com/en-us/rest/api/azure/devops/graph/storage-keys/get?view=azure-devops-rest-7.1)
4. [Work item type state categories](https://learn.microsoft.com/en-us/rest/api/azure/devops/wit/work-item-type-states/list?view=azure-devops-rest-7.1)
5. [WIQL and ASOF](https://learn.microsoft.com/en-us/azure/devops/boards/queries/wiql-syntax)
6. [Work item batches](https://learn.microsoft.com/en-us/rest/api/azure/devops/wit/work-items/get-work-items-batch?view=azure-devops-rest-7.1)
7. [PR queries](https://learn.microsoft.com/en-us/rest/api/azure/devops/git/pull-requests/get-pull-requests?view=azure-devops-rest-7.1)
8. [Individual reviewer votes](https://learn.microsoft.com/en-us/rest/api/azure/devops/git/pull-request-reviewers/list?view=azure-devops-rest-7.1)

## Reference

The interaction pattern follows the inspected [TinyClips Team load extension at its pinned commit](https://github.com/jamesmontemagno/tiny-clips/tree/13984294a0bcc5a8236797ce3a3b5bc53ce70e55/.github/extensions/tinyclips-team-load). The adapter, identity model, project process mappings and query coverage logic here are implemented for Azure DevOps. No TinyClips repository assumptions or tracking namespace are used.
