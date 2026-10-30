---
name: spfx-fast
description: 'Build SharePoint Framework apps with SPFx Fast. Use for SharePoint list forms, request trackers, dashboards, and authenticated Graph/REST features in SPFx 1.24+.'
---

# Build SharePoint apps with SPFx Fast

Use this skill when a user asks for an SPFx app or feature. SPFx Fast complements PnP and Microsoft clients; keep existing libraries when they already fit.

## Start

1. Inspect the repository, SPFx version, signed-in site context, lists, columns, internal names, and permissions. Never guess tenant IDs, fields, URLs, or access.
2. Install `@spfx-fast/core` with the project's package manager. Read `node_modules/@spfx-fast/core/agent/SKILL.md` and `agent/capabilities.json` before coding.
3. Choose a starter with `pnpm dlx --package @spfx-fast/core spfx-fast use-cases` or `pnpm dlx --package @spfx-fast/core spfx-fast scenarios`. With npm, use `npx --yes --package=@spfx-fast/core -- spfx-fast`. Generate only after inspecting the target schema:

   ```sh
   pnpm dlx --package @spfx-fast/core spfx-fast dashboard <Name> --site-id <inspected-site-id> --use-case <id> --list-id <inspected-list-id>
   ```

   Replace the pnpm prefix with `npx --yes --package=@spfx-fast/core -- spfx-fast` to use npm.
4. Run `pnpm dlx --package @spfx-fast/core spfx-fast agent init` and `pnpm dlx --package @spfx-fast/core spfx-fast agent doctor`. Use the same npm prefix above when needed. Doctor checks local setup, not tenant permissions.
5. Use the SPFx authenticated client from `createSPFxServices(context, SPHttpClient.configurations.v1)`. Do not acquire tokens independently or store credentials.
6. Preserve permission checks, bounded reads, loading/error states, accessible controls, and confirmation before writes or deletes. Ask an available design skill to polish the starter to the user's taste.

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
