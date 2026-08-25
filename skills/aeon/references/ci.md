# CI gates in `aeonfun/aeon`

Eight `ci-*.yml` workflows. Every one is **path-filtered** and fires on `pull_request`, `push` to `main`, and `workflow_dispatch`.

**None of them can block a merge.** `main` has no branch protection and the repo has zero rulesets — `gh api repos/aeonfun/aeon/branches/main/protection` returns 404. A red X is advisory. Nothing stops a broken PR from merging, and nothing stops a push straight to `main` (where the same gates run, and fail *after* the fact). So the only thing that actually keeps these respected is running them locally before pushing. Treat the checklist below as the enforcement.

## The gates

| Workflow | Fires when you touch | Enforces | Run locally |
|---|---|---|---|
| `ci-skill-category` | `skills/**` | every `SKILL.md` has a valid `category:` | `bash scripts/check-skill-categories.sh` |
| `ci-skills-json` | `skills/**`, `bin/generate-skills-json`, `catalog/skills.json` | committed catalog == fresh regen | `bin/generate-skills-json` |
| `ci-packs-json` | `catalog/packs.config.json`, **`catalog/skills.json`**, `bin/generate-packs-json`, `catalog/packs.json` | pack catalog == fresh regen; every skill in exactly one pack | `bin/generate-packs-json` |
| `ci-tests` | `scripts/**`, `aeon.yml` | the 13 `scripts/tests/` suites + config validation | see below |
| `ci-capabilities-parity` | `bin/install-skill-pack`, `docs/CAPABILITIES.md` | capabilities taxonomy in sync across both | `bash scripts/check-capabilities-parity.sh` |
| `ci-skill-packs` | `catalog/skill-packs.json`, `.github/README.md`, `bin/install-skill-pack`, `skills/security/trusted-sources.txt` | community registry well-formed + matches README table; no unbacked `trust_level: trusted` | `node scripts/validate-skill-packs.mjs` |
| `ci-agents-md` | `STRATEGY.md`, `AGENTS.md`, `scripts/gen-agents-md.js` | `AGENTS.md` regenerated from `STRATEGY.md` | `node scripts/gen-agents-md.js --check` |
| `ci-apps` | `apps/**` | dashboard typecheck+test+build, cli typecheck, mcp-server build, webhook bundle | per app, see below |

There is **no security-scan CI gate.** The pack security scan lives in `bin/install-skill-pack` and runs at *install* time, not in CI.

## Checklist: adding or editing a skill

This is the common case (Modes 4 and 5), and it trips **three** gates, not one. Run all of it from the repo root before opening the PR:

```bash
bash scripts/check-skill-categories.sh    # category is valid
bin/generate-skills-json                  # refresh catalog/skills.json
bin/generate-packs-json                   # REQUIRED — see the trap below
node scripts/validate-config.js           # only if you touched aeon.yml
git add catalog/skills.json catalog/packs.json
```

**The trap: `bin/generate-skills-json` alone is not enough.** It rewrites `catalog/skills.json`, which is itself a *trigger path* for `ci-packs-json`. Commit the skills catalog without regenerating the pack catalog and the PR goes red on a workflow you never touched. Always run both generators, always commit both files.

Both files carry a `generated` UTC timestamp that changes on every run — that's expected. `ci-skills-json` and `ci-packs-json` normalize it out (plus per-skill `sha`/`updated`, which churn on every squash-merge), so a timestamp-only diff is not drift and won't fail. On a clean tree, regenerating both should produce exactly a one-line diff per file.

### `category:` — the valid set

`core evolution basics dev crypto productivity`. Anything else fails the gate. Category is the *only* thing deciding which pack a skill joins.

## `ci-tests` in full

Needs `pip install pyyaml==6.0.2` first. Thirteen steps:

```bash
python3 scripts/tests/test_notify_format.py
bash    scripts/tests/test_notify.sh
bash    scripts/tests/test_telegram_route.sh
bash    scripts/tests/test_skill_mode.sh
bash    scripts/tests/test_skill_requires.sh
bash    scripts/tests/test_run_actions_summary.sh
bash    scripts/tests/test_validate_pack.sh
bash    scripts/tests/test_validate_skill_packs.sh
bash    scripts/tests/test_run_grok.sh
python3 scripts/tests/test_state_reduce.py
python3 scripts/tests/test_health_triage.py
node --test scripts/validate-config.test.js
node    scripts/validate-config.js
bash    scripts/tests/test_cron_due.sh
```

Editing `aeon.yml` alone is enough to fire this workflow — `node scripts/validate-config.js` is the one to run after any hand-edit (Mode 4 step 4).

## `ci-apps` in full

One job per app so a red X names the broken surface.

```bash
cd apps/dashboard && npm ci && npm run typecheck && npm test && npm run build
cd apps/cli       && npm ci && npm run typecheck   # needs apps/dashboard deps installed first
cd apps/mcp-server && npm install && npm run build
cd apps/webhook   && node --check src/worker.js && npm install && npx wrangler deploy --dry-run --outdir /tmp/w
```

The dashboard runs **both** `typecheck` and `build` on purpose: a past Dependabot bump crashed `next build` while `tsc --noEmit` passed. Don't treat the typecheck as sufficient. The CLI cannot typecheck without the dashboard's `node_modules` — its tsconfig compiles `../dashboard/lib/**/*.ts` and borrows that app's typescript and `@types`. `mcp-server` and `webhook` commit no lockfile, so `npm ci` is unavailable there.
