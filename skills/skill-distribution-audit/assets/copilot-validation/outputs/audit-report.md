# Historical skill-distribution audit

## Result

The collection release manifest matches the active source set in both captures. Direct `skills` discovery does not match that source set at the before revision, but matches exactly at the after revision. Comparisons are identity-based and preserve duplicates. No duplicate or ambiguous source names were found.

| Capture / source revision | Consumer | Active source identities | Marketplace paths | Captured discovery names | Source↔marketplace | Source↔discovery |
|---|---|---:|---:|---:|---|---|
| before — `3641911a4540686b02900c7c49a14d021286e3ee` | `skills` 1.7.4 | 1,093 | 1,093 | 1,076 | exact; exit 0 | mismatch; exit 1 |
| after — `d696ae529a83ecdd83d2ae69d5a3a221b0209541` | `skills` 1.7.4 | 1,093 | 1,093 | 1,093 | exact; exit 0 | exact; exit 0 |

Both source indexes contain 1,114 identities, including 21 marked deprecated. The provided release-policy evidence for `scripts/build-index.mjs` at both revisions has the same SHA-256 (`693e4ba6bba90384e8ac35bc5f67f08267bb18b1153a6361e297a328f87c9e6b`): lines 13–18 exclude `_template`, `INDEX`, `node_modules`, `.git`, `scripts`, `assets`, and `en`; lines 703–708 put entries with status other than `deprecated` into release volumes. This defines the intended active set used here. The marketplace is a separate release channel: its skill directory paths were compared to active source paths (source `SKILL.md` paths with that suffix removed), not treated as input to direct repository discovery.

## Exact differences

At the before revision, discovery is missing these 38 active source names:

```text
accessibility-wcag-audit, agent-payment-x402, agentmail-email-infra,
algolia-search-integration, astro-content-sites, azure-functions-serverless,
bats-shell-testing, bullmq-job-queue, bun-runtime-development, bwa-mem2-dna-aligner,
claude-api, convex-reactive-backend, electron-desktop-development, firebase-backend,
javascript-testing-patterns, jetpack-compose-expert, julia-scientific-pro,
modern-angular-expert, neon-serverless-postgres, nestjs-expert, nextjs-supabase-auth,
odoo-automated-tests, playwright-e2e-testing, pydantic-ai-agents,
shopify-app-development, slack-message-formatter, spline-3d-web-integration,
swift-concurrency, swiftui-best-practices, tailwind-css-patterns, tanstack-query,
threejs-3d-web, transformers-js, varlock-env-secrets-guard, vercel-ai-sdk,
websocket-realtime-engineer, zoom-meeting-bot-builder, zoom-rtms-realtime-media
```

It also discovers these 20 identities marked deprecated in the source index, plus `your-skill-name`, which has no identity in that index:

```text
astronomy-data-toolkit, azure-container-apps-deploy, codetour-walkthrough-builder,
data-strategy-review, dpa-clause-reviewer, first-principles-assumption-auditor,
hardware-doc-generator, imessage-claude-bridge, llm-coding-mistake-guardrails,
market-sizing-analyst, mlops-model-productionizer, molecular-dynamics-simulation,
multi-framework-compliance-orchestrator, property-auction-legal-analysis,
release-manager, security-antipattern-hook, seo-traffic-drop-forensics,
tax-loss-harvesting, technical-change-tracker, x-twitter-automation, your-skill-name
```

There are no duplicate identities in either side of this comparison. Source paths and source-index line numbers for every missing/unexpected identity are recorded in `discovery-finding-paths.json`; `your-skill-name` has no source-index path. The path-index mapping and ambiguity counts are in `before-source-identity-map.json` and `after-source-identity-map.json`. The marketplace comparisons have no missing, unexpected, or duplicate paths at either revision.

## Observed evidence and cause assessment

- **Observed:** `before-discovery-stderr.txt` contains 39 `YAML parse error` warnings. They correspond to the 38 missing active identities plus `09-verticals/defi-natural-language-agent/SKILL.md`, which is already deprecated and therefore not expected. Most examples are unquoted `@` values in flow lists; `astro-content-sites` reports a nested-mapping error in a compact mapping. These errors plausibly explain the active omissions, but do not explain the deprecated identities or `your-skill-name`.
- **Observed:** the after stderr capture is empty and the after discovery list exactly matches the active source identity list. The evidence does not establish which individual edits or other changes removed the earlier warnings.
- **Consumer implementation evidence:** `inputs/consumer-policy-source.json` identifies cached `skills` 1.7.4 `dist/cli.mjs` (reported SHA-256 `b7d92e2a619e8982d38390572750efb8c2ec81cdf23c33aed2fa426d080a1e4e`). Excerpts at lines 21, 1017–1027, and 1258–1277 show the `yaml` parser, frontmatter parsing, required string `name` and `description` checks, and an exclusion for `metadata.internal === true` unless internal skills are requested. The captured before discovery of deprecated names confirms those names were not excluded in that capture; the excerpt does not establish all consumer filtering behavior. The supplied provenance says the package was locally cached; it also states that the tarball integrity was not independently recomputed. No fresh consumer execution was performed.

## Reproduction artifacts and commands

The derived arrays are `*-expected-manifest.json`, `*-manifest-paths.json`, `*-expected-discovery.json`, and `*-discovered-names.json`. `derived-counts-and-ambiguities.json` records derived counts and path/name ambiguity checks. The four complete bundled-helper reports are `before-manifest-comparison.json`, `before-discovery-comparison.json`, `after-manifest-comparison.json`, and `after-discovery-comparison.json`; their exit codes are in the matching `.exitcode.txt` files. The helper is `.github\skills\skill-distribution-audit\scripts\compare-discovery.mjs` relative to the repository root.

Commands actually run:

```powershell
node --version
node .\outputs\derive-audit-inputs.mjs
node .\outputs\run-comparisons.mjs
node .\outputs\annotate-findings.mjs
node -e "const fs=require('node:fs'); for(const s of ['before-manifest','before-discovery','after-manifest','after-discovery']) { const r=JSON.parse(fs.readFileSync('outputs/'+s+'-comparison.json','utf8')); const c=Number(fs.readFileSync('outputs/'+s+'-comparison.exitcode.txt','utf8')); if(c!==(r.match?0:1)) throw Error(s+' result/exit mismatch'); console.log(s+': exit '+c+', match '+r.match+', '+r.counts.expected+' expected / '+r.counts.observed+' observed'); }"
```

The installed Node version was `v24.19.0`; the final command verified each retained JSON report and exit code against the helper's match result.

`run-comparisons.mjs` invoked the bundled helper with these argument pairs, in before-manifest, before-discovery, after-manifest, after-discovery order:

```text
before-expected-manifest.json  before-manifest-paths.json
before-expected-discovery.json  before-discovered-names.json
after-expected-manifest.json  after-manifest-paths.json
after-expected-discovery.json  after-discovered-names.json
```

Capture metadata identifies the command as `skills add findscripter/everything-skills --list`, package version 1.7.4. The before capture has no timestamp or recorded consumer exit code/observed checkout revision; its source revision is the metadata value only. The after capture records `2026-11-02T09:41:54.651Z`, exit code 0, and observed-before/after revisions equal to its source revision. Both capture metadata provide stdout hashes and describe name extraction from the complete `allDiscovered` output. The captured lists are historical; this audit ran only the local comparison helper, not the consumer or installer.

## Limits

The comparisons establish identity coverage only for the supplied source-index projection, manifests, and historical captured discovery. The name-only discovery output cannot support path attribution for identities absent from the source index; name collisions would also be unresolved, although none were found in the supplied index. No independent exhaustive frontmatter/schema audit was performed. The cached consumer excerpts and their stated provenance are not a fresh verification of the full package. The result does not establish live Copilot loading, skill-body/helper behavior, or external service and credential availability. No inputs or installed skill files were modified; no installer, network request, credential access, GitHub mutation, or collection skill body was used.
