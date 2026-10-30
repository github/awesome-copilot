---
name: spfx-fast
description: 'Build SharePoint Framework apps with SPFx Fast. Use for SharePoint list forms, request trackers, dashboards, and authenticated Graph/REST features in SPFx 1.24+.'
---

# Build SharePoint apps with SPFx Fast

Use this skill when a user asks for an SPFx app or feature. SPFx Fast complements PnP and Microsoft clients; keep existing libraries when they already fit.

## Start

1. Inspect the repository, SPFx version, signed-in site context, lists, columns, internal names, and permissions. Never guess tenant IDs, fields, URLs, or access.
2. Install `@spfx-fast/core` with the project's package manager. Read `node_modules/@spfx-fast/core/agent/SKILL.md` and `node_modules/@spfx-fast/core/agent/capabilities.json` before coding.
3. Choose a starter with `pnpm exec spfx-fast use-cases` or `pnpm exec spfx-fast scenarios`. With npm, use `npx --no-install spfx-fast`. Generate only after inspecting the target schema:

   ```sh
   pnpm exec spfx-fast dashboard <Name> --site-id <inspected-site-id> --use-case <id> --list-id <inspected-list-id>
   ```

   With npm, replace `pnpm exec` with `npx --no-install`.
4. Run `pnpm exec spfx-fast agent init` and `pnpm exec spfx-fast agent doctor`. With npm, use `npx --no-install spfx-fast`. Doctor checks local setup, not tenant permissions.
5. Initialize services once per web part with `const services = await createSPFxServices(context, SPHttpClient.configurations.v1)`. It is asynchronous; await it before using `client`, `sharepoint`, or `rest`. Do not acquire tokens independently or store credentials.
6. If the app calls Graph, add only the required delegated scopes to `webApiPermissionRequests` in `config/package-solution.json`, then have a SharePoint admin approve them in the tenant API access page. Sign-in alone does not grant Graph scopes; missing consent can cause 403 responses. Use the endpoint's least-privileged scope. SharePoint REST uses the authenticated SPFx REST client and does not need Graph scopes.
7. Preserve permission checks, bounded reads, loading/error states, accessible controls, and confirmation before writes or deletes. Ask an available design skill to polish the starter to the user's taste.

## Common requests

| Request | Use case |
|---|---|
| Laptop or purchase request | `laptop-request` |
| IT help desk | `it-help-desk` |
| Employee onboarding | `employee-onboarding` |
| Facility inspection | `facility-inspection` |
| Asset register | `asset-register` |
| Stock reorder tracker | `reorder-workflow` |

## When a helper is missing

Use authenticated raw SharePoint REST or Graph through the supplied services. Check `docs/API-COVERAGE.md` for typed, raw-only, and unsupported coverage. Keep special response parsing local and small. Do not replace authentication, caching, paging, or delta sync with hand-written versions without a concrete need.

## References

- [Package guide](https://github.com/vystartasv/spfx-fast/blob/main/agent/SKILL.md)
- [Use cases](https://github.com/vystartasv/spfx-fast/blob/main/docs/USE-CASES.md)
- [Examples](https://github.com/vystartasv/spfx-fast/blob/main/docs/EXAMPLES.md)
- [SPFx examples](https://github.com/vystartasv/spfx-fast/blob/main/docs/SPFX-EXAMPLES.md)
- [API coverage](https://github.com/vystartasv/spfx-fast/blob/main/docs/API-COVERAGE.md)
- [Deployment guide](https://github.com/vystartasv/spfx-fast/blob/main/docs/AGENT-SHAREPOINT-DEPLOYMENT.md)
