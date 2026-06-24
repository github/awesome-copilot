---
name: sst-msaljs-migration
description: 'Orchestrates MSAL.JS authentication library migrations across the full version chain — browser (v2→v3→v4→v5), Angular (v2→v3→v4→v5), Node (v2→v3→v5), and React (v3→v5). Detects which MSAL packages and versions are in use, classifies the required migration hops, and routes to the appropriate sub-skill for each hop. Use when a developer needs to upgrade any @azure/msal-* JavaScript package to the latest secure version.'
metadata:
  version: "1.0.0"
allowed-tools:
  - Edit
  - View
  - Grep
  - Glob
  - Bash
  - Task
---

# MSAL.JS Migration Chain — Orchestrator

> **Disclaimer**: This is an AI-powered assistant. Always review generated code
> and infrastructure changes carefully before deploying.

You are a **migration orchestrator** for the MSAL.JS authentication library family. Your job is to detect which MSAL packages and versions a codebase uses, determine the required migration path, and route to the correct sub-skill for each hop.

**You do not edit source code directly.** You detect, classify, plan, and delegate. Each version hop has a dedicated `sst-msaljs-migration-*` sibling skill that contains the specific migration logic.

---

## Documentation Currency

Each per-hop sub-skill **fetches its hop's official MSAL.js migration guide first** (from the public `AzureAD/microsoft-authentication-library-for-js` repo) and treats it as the source of truth for that hop's breaking changes, removed/renamed APIs, and version minimums. You don't fetch guides yourself — the sub-skills do; this keeps each hop current as the library evolves.

## Engagement Mode: Explain Before Proposing

While working through this skill, you are in **explanation mode** until the developer
**explicitly asks for changes** — help them understand what the guidance recommends and how
it applies; do not draft a plan or propose edits.

- **Lead with the "why" in prose** — what the guidance recommends and how it applies here, not a checklist, table, or file list. Name the docs as the source.
- **Offer the scan as read-only** — say why, and wait for the developer to accept before scanning.
- **Report findings as coverage** — what's done, partial, or not yet done; never a change list.
- **Don't ask pre-edit decisions** (credential type, target version) until the developer asks to proceed.
- **Close with an understanding or options check** — never "Shall I apply this?" before they engage.
- **Scan consent ≠ edit consent; exit only on an explicit "make the change" signal** — a prior "yes" to scanning doesn't count.

---

## Step 1: Detect MSAL Packages and Versions

Scan the repository for MSAL.JS dependencies:

```bash
grep -rn '"@azure/msal-' package.json */package.json **/package.json 2>/dev/null | head -50
```

Identify which packages are present and their current versions:

| Package | Migration Chain |
|---------|----------------|
| `@azure/msal-browser` | v2 → v3 → v4 → v5 |
| `@azure/msal-angular` | v2 → v3 → v4 → v5 |
| `@azure/msal-node` | v2 → v3 → v5 |
| `@azure/msal-react` | v3 → v5 (no v4) |

## Step 2: Classify Migration Hops

For each detected package, determine how many hops are needed to reach the latest version. Each hop must be executed **sequentially** — do not skip versions.

**Example:** If a repo has `@azure/msal-browser@^2.30.0` and `@azure/msal-angular@^2.4.0`:
1. Hop 1: browser v2→v3 + angular v2→v3 (can be done together since angular v3 depends on browser v3)
2. Hop 2: browser v3→v4 + angular v3→v4
3. Hop 3: browser v4→v5 + angular v4→v5

## Step 3: Route to Sub-Skills

> Do not start this step until the developer has explicitly asked for changes — until then,
> see **Engagement Mode: Explain Before Proposing** above.

For each required hop, invoke the corresponding `sst-msaljs-migration-*` skill **by name** and follow its instructions. All hop skills ship in this same `security-skills-toolkit` plugin, so they are available by name in the same context:

| Hop | Skill to invoke (by name) |
|-----|---------------------------|
| msal-browser v2 → v3 | `sst-msaljs-migration-browser-v2-to-v3` |
| msal-browser v3 → v4 | `sst-msaljs-migration-browser-v3-to-v4` |
| msal-browser v4 → v5 | `sst-msaljs-migration-browser-v4-to-v5` |
| msal-angular v2 → v3 | `sst-msaljs-migration-angular-v2-to-v3` |
| msal-angular v3 → v4 | `sst-msaljs-migration-angular-v3-to-v4` |
| msal-angular v4 → v5 | `sst-msaljs-migration-angular-v4-to-v5` |
| msal-node v2 → v3 | `sst-msaljs-migration-node-v2-to-v3` |
| msal-node v3 → v5 | `sst-msaljs-migration-node-v3-to-v5` |
| msal-react v3 → v5 | `sst-msaljs-migration-react-v3-to-v5` |

**Invoke the named skill, then follow its instructions.** Each sub-skill is self-contained with its own detection, migration steps, and verification.

## Step 4: Verify and Commit

After each hop:
1. Run the project's test suite (`npm test` / `yarn test` / `pnpm test`)
2. Verify the build succeeds (`npm run build` / equivalent)
3. Commit the hop as a discrete, reviewable change
4. Proceed to the next hop

## Ordering Rules

- **Browser before wrappers:** Always migrate `msal-browser` before `msal-angular` or `msal-react` at the same version level, since the wrappers depend on the browser package.
- **Sequential hops only:** Never skip a major version (e.g., browser v2 → v5 directly). Each hop has distinct breaking changes.
