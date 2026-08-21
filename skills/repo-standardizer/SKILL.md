---
name: repo-standardizer
description: Polish any GitHub repository's surface — labels (emoji rating tiers, P0–P3 priority, impact severity), issue forms, PR template, CI workflows, CODEOWNERS, rulesets, docs. Repo meta & config only — no code logic touched. Use when creating a new repo or polishing an existing one.
---

# GitHub Repo Standardizer

Detect a repository's current state, then polish its surface: issue forms,
PR template, label taxonomy, CI, CODEOWNERS, rulesets, docs. Works on
repo metadata and config files only — code logic is never touched.
**Idempotent** — safe to re-run; fills gaps and reconciles drift without
duplicating or clobbering.

## When to use

- User says "standardize / tidy up / professionalize this repo"
- A new repo was just created and needs templates, labels, CI, and rules from day one
- A repo looks bare: no templates, no labels, no CI, no branch protection

## Preflight (mandatory, in order)

> **Requires**: `gh` CLI (authenticated), `git`, `jq`, `python3` — verify
> they exist before starting (`which gh git jq python3`).

### 1. Authenticate — check gh login first

```bash
gh auth status 2>/dev/null || echo "NOT_LOGGED_IN"
```

- **Logged in** → continue; print `gh api user -q .login` so the user knows which account will act.
- **Not logged in** → STOP. Tell the user (do not guess):
  1. Run `gh auth login` (web/device flow), **or**
  2. Export a token: `export GH_TOKEN=ghp_xxx` — needs `repo`, `workflow` (for CI files) and, for org repos, `admin:org` (or `admin:repo_hook` / org membership admin) scopes.
  - Never paste tokens into chat, logs, or files. If the user pastes a token in chat, advise them to revoke it and re-issue.
  - If `gh auth login` is impossible in this environment (headless), suggest `gh auth login --with-token` reading from a file the user created.

Verify the acting account can write to the target:

```bash
# user repos: no extra check needed beyond token scopes
# org repos: must be a member/admin of the org
gh api "orgs/ORG/memberships/$(gh api user -q .login)" -q .role 2>/dev/null || echo "NO_ORG_ACCESS"
```

- `admin`/`member` → OK. `404` → stop and ask the user to add the account to the org first.

### 2. Detect repository type

```bash
gh repo view OWNER/REPO --json name,owner,visibility,defaultBranchRef,isArchived,isFork \
  -q '{name:.name, ownerType:.owner.type, visibility:.visibility, defaultBranch:.defaultBranchRef.name, archived:.isArchived, fork:.isFork}'
```

| Field | Meaning | Consequence |
|---|---|---|
| `ownerType` | `User` = personal, `Organization` = org | Org repos can also use org-level rulesets; both support repo-level rulesets |
| `visibility` | `PUBLIC` / `PRIVATE` / `INTERNAL` | Private: skip public-facing docs pressure, keep CI secrets minimal; public: README badges + CONTRIBUTING/SECURITY matter |
| `archived` / `fork` | Read-only / fork | **Skip write modules**; report why |

If the repo was not explicitly named by the user, confirm before touching an
org or private repository.

### 3. Audit current state

```bash
gh label list --repo OWNER/REPO --limit 200
gh api repos/OWNER/REPO/contents/.github -q '.[].path' 2>/dev/null || echo "no .github dir"
gh api repos/OWNER/REPO/contents/.github/workflows -q '.[].name' 2>/dev/null || echo "no workflows"
gh api repos/OWNER/REPO/rulesets -q '.[] | {name:.name, enforcement:.enforcement}' 2>/dev/null || echo "no rulesets"
gh api repos/OWNER/REPO/branches -q '.[].name' 2>/dev/null
for f in README.md CONTRIBUTING.md SECURITY.md LICENSE .gitignore; do
  gh api "repos/OWNER/REPO/contents/$f" -q .name 2>/dev/null || echo "missing: $f"
done
```

### 4. Detect test framework (for CI module)

Check for these signals (first match wins):

```bash
gh api repos/OWNER/REPO/contents/package.json -q .name 2>/dev/null   # node → templates/ci-node.yml
gh api repos/OWNER/REPO/contents/pyproject.toml -q .name 2>/dev/null # python → templates/ci-python.yml
gh api repos/OWNER/REPO/contents/go.mod -q .name 2>/dev/null         # go → templates/ci-go.yml
gh api repos/OWNER/REPO/contents/Cargo.toml -q .name 2>/dev/null     # rust → templates/ci-rust.yml
```

No signal → propose the generic CI (or ask the user whether CI is wanted at all).

### 5. Ask about language (before planning)

- Ask the user which language `CONTRIBUTING.md` and the PR template should be
  written in (default: English, or the project's primary language for local
  projects). Translate the templates accordingly when generating — never
  assume a language.
- (README languages are asked separately in Module F.)

### 6. Ask about automation (decides the Governance labels)

Ask the user whether the repo has any **automation bots or AI writers**
running on it — e.g. dependabot, a Stale bot, ClawSweeper, or an AI coding
agent that auto-files PRs / auto-fixes issues.

- **Why ask**: `r:*` / `clawsweeper:*` / `triage:*` / `close:*` labels are
  **signal labels, not categories** — a bot reads them and acts (auto-close,
  auto-lock, auto-fix, auto-merge). Without running automation those labels
  are dead weight, so the answer decides whether the Governance dimension is
  added at all (Module A, Step 2).
- **Yes** → plan the `Governance / auto-close rules` dimension (add only the
  `r:*` rules matching the project's real reject criteria).
- **No** → skip that dimension entirely — never add `r:*` / bot labels to a
  repo with no automation.

## Workflow

1. **Preflight** (above). If auth or access fails, stop with a clear message.
2. **Dry-run plan** — show the user a concise table of what will be created/updated/skipped. Get confirmation for: rulesets, branch deletion/protection changes, org-level changes, and anything destructive.
3. **Apply modules** (each idempotent; run in this order).
4. **Verify** — re-query and print an `applied / skipped / failed` checklist.

### Module A — Labels (design first, then idempotent upsert)

**Step 1 — Profile the project** (adjust the taxonomy, never copy blindly):

- **Rating labels** → design a themed tier system for THIS project
  (never copy an existing repo's set verbatim):
  - Reference example — OpenClaw's official repo uses themed tiers with
    emoji icons and a low→high color gradient (**EXAMPLE ONLY, do not copy**):
    `rating: 🧂 unranked krab` → `rating: 🦪 silver shellfish` →
    `rating: 🦐 gold shrimp` → `rating: 🦀 challenger crab` →
    `rating: 🐚 platinum hermit` → `rating: 🦞 diamond lobster`
  - International project → universal grades also work
    (`grade: S/A/B/C/D` or `★`–`★★★★★`)
  - Always redesign: pick a theme that fits the project (animals, gems,
    ranks, stars…) and the audience's language. Do not reuse any existing
    repo's rating labels as-is.
- **Teams**: if the repo has an explicit division of labor
  (CODEOWNERS, CONTRIBUTING, a team list in docs) → add one `team: *` label
  per group (e.g. `team: frontend`, `team: algorithm`). No team list → skip.
- **Project type** (library / app / coursework / org-infra) → decide which
  dimensions below are needed (`dependencies`, `security`, `docs`, …).
- **Language**: write every label name and description in the language chosen
  in Preflight step 5 (default English; local project → its primary language).
  Never assume — translate every label name and description into the chosen
  language (emoji glyphs stay as-is).
  - **Exception — bot labels**: `r:*` / `clawsweeper:*` / `triage:*` /
    `close:*` names are matched literally by automation code (almost always
    English). Keep those **names** in the bot's language — a translated name
    breaks the bot. Only their `description` may use the user's language.

**Step 2 — Compose categories.** Baseline lives in `templates/labels.json`
(plain names, no emoji); extend or trim per the profile in Step 1.

**Emoji policy — rating tiers are the ONLY mandatory-emoji labels.** Every
`rating:*` / `issue-rating:*` tier MUST carry an emoji with a clear low→high
gradient (e.g. `rating: 🦞 diamond lobster`). All other labels: emoji is the
agent's call — add icons where they aid scanning, omit them where they
clutter. **Consistency rule: within one dimension, either ALL labels carry
an emoji or NONE do** — never a mixed half-emoji dimension (e.g. don't ship
`🐛 bug` next to a plain `enhancement`).

**Every dimension is opt-in except Type.** Add a dimension only if the repo
actually needs it; skip it otherwise. The menu below mirrors OpenClaw's
official label taxonomy (the richest open reference) — cover every dimension
that applies, but never force one the repo doesn't use.

**Priority uses `P0`–`P3`** (OpenClaw's convention — `P0` = emergency).
Examples in the tables below show the optional emoji style — apply them
all or none per dimension (baseline ships plain `P0`–`P3`):

| Label | Meaning | Color |
|---|---|---|
| `🔴 P0` | Emergency: data loss, security bypass, crash loop, unusable core | `b60205` |
| `🟠 P1` | High: blocks planned work, needs attention soon | `d93f0b` |
| `🟡 P2` | Medium: normal priority | `fbca04` |
| `🟢 P3` | Low: nice to have | `1a7f37` |

**Dimension menu** (write each label in the user's chosen language):

| Dimension | Labels (examples) | Add when |
|---|---|---|
| Type (always) | `🐛 bug` `✨ enhancement` `📚 documentation` `❓ question` `🙋 help wanted` `🌱 good first issue` | always |
| Priority | `🔴 P0` `🟠 P1` `🟡 P2` `🟢 P3` | recommended |
| Status | `🚧 in progress` `🧱 blocked` `✅ ready to merge` `🎉 merged` `🚫 wontfix` | recommended |
| Impact | `impact: security` `impact: data-loss` `impact: availability` … | recommended; required for security-sensitive repos |
| Rating (PR quality) | `rating: 🦞 diamond lobster` … themed tiers | PR-quality gate exists |
| Issue rating | `issue-rating: 🦞 diamond lobster` … | issue-quality gate exists (may fold into Rating) |
| Merge risk | `merge-risk: 🚨 security-boundary` `merge-risk: 🚨 availability` … | maintainer review process exists |
| Size | `size: XS` `size: S` `size: M` `size: L` `size: XL` | large repo / team estimation |
| Area / module | `area: core` `area: api` `area: cli` … | multi-module project |
| Bug detail | `bug: behavior` `bug: crash` | crash-prone / many bug reports |
| Governance / auto-close rules | `r: spam` `r: support` `r: no-ci-pr` … `clawsweeper:*` `triage:*` | automation bot enforces close/lock/review rules |
| Close reason | `close: duplicate` `close: superseded` `close: invalid` … | close-automation bot exists |
| Triage | `triage: bug` `triage: blocked` `triage: needs-review` … | triage workflow exists |
| Proof | `proof: 🎥 video` `proof: 📸 screenshot` | reproduction evidence required |
| Dependencies | `📦 dependencies` | dependabot / dependency PRs |
| Security | `🔒 security` | security-sensitive repo |
| Regression | `↩️ regression` | stable project (was-working-now-fails) |
| Stale | `🕰️ stale` `🚫 no-stale` | stale automation exists |
| Team | `team: <group>` | explicit division of labor |
| Duplicate / invalid | `👯 duplicate` `🚫 invalid` | active public repo with many issues |
| Channel | `channel: discord` `channel: telegram` … | multi-channel product (OpenClaw-style) |
| App / platform | `app: ios` `app: android` `app: web-ui` … | multi-platform app |
| Extensions / plugins | `extensions: <name>` `plugin: <name>` | plugin/extension ecosystem |

**Governance rules (`r:` / bot labels) — gated by Preflight step 6.** Only
consider this dimension if the user answered "yes" to automation bots / AI
writers; skip it entirely otherwise. Auto-close and bot-state labels are
**signal labels, not categories** — a bot (or Actions workflow) reads them and
acts (auto-close, auto-lock, auto-fix, auto-merge). They are useless without
the matching automation, so **skip them unless a governance bot actually runs**
on the repo. If one does, add only the `r:*` rules matching the project's real
off-topic / reject criteria (e.g. `r: spam`, `r: support`, `r: no-ci-pr`) plus
the bot's own state labels (`clawsweeper:*`, `triage:*`, `close:*`). Never copy
OpenClaw's set verbatim — its rules encode OpenClaw's specific product
boundaries.

**Impact dimension** — the security "blast radius" judgement (generalized
from OpenClaw; trim to the repo's actual failure modes):

| Label | Meaning |
|---|---|
| `impact: security` | security boundary, credentials, authz, sandbox, sensitive data |
| `impact: data-loss` | loses/corrupts/drops user, session, or config data |
| `impact: availability` | crash, hang, restart loop, or process outage |
| `impact: auth-provider` | auth / routing / model choice / secret resolution breaks |
| `impact: session-state` | session / memory / state drifts or corrupts (stateful systems) |
| `impact: message-loss` | messages/events lost, duplicated, or misrouted (messaging systems) |
| `impact: ux-blocker` | user blocked with no terminal/logs/support (GUI products) |
| `impact: ux-friction` | confusing flow / support burden (GUI products) |
| `impact: other` | meaningful impact outside the owned taxonomy |

**Step 3 — Color rules (mandatory):**

- **Diverse palette**: colors must be rich and varied — the whole label set
  should look like a palette, not a monochrome block. Even within one
  category, spread the hues (e.g. priority labels: red / orange / yellow /
  green, or four clearly different hues).
- **Semantic hints (not hard mappings)**: `ready to merge` / `merged` / done
  → greens (never gray or red); `wontfix` → gray; `in progress` → blue.
  Everything else: pick colors that look good together and match the label's
  meaning loosely — but prefer variety over strict one-meaning-one-color.
- **Emoji policy**: rating tiers are emoji-**mandatory** — every
  `rating:*` / `issue-rating:*` label needs a clear low→high emoji gradient
  (e.g. `rating: 🦞 diamond lobster`). Everywhere else, emoji is the agent's
  call: use icons where they aid scanning, omit them where they clutter.
  **Consistency: within one dimension, all labels carry an emoji or none
  do** — never a mixed half-emoji dimension. If used, the emoji must match
  the label's meaning, never decorative-only.
- **Rating labels need docs**: when rating labels are added, also add
  `LABELS.md` (Step 4) describing each label's meaning and the explicit
  low→high order, so the ranking is unambiguous.
- Neighboring labels must be distinguishable. Forbidden: all-one-color,
  adjacent duplicates, or colors that contradict the label content.

**Step 4 — Rating-label docs (only if rating labels exist).** Generate
`LABELS.md` from `templates/LABELS.md` (or extend an existing docs file):
list every rating label with its meaning and the explicit low→high order,
plus the rest of the taxonomy. Commit and push it together with the labels.

**Step 5 — Idempotent upsert.** GitHub has **no** `PUT /labels/{name}`
endpoint. Upsert = check existence (`GET /labels/{name}`), then
`POST /labels` (create) or `PATCH /labels/{name}` (update). Works for both
map-form and array-form `labels.json`:

```bash
R="repos/OWNER/REPO"
jq -c 'if type == "array" then .[] else to_entries[] | {name: .key} + .value end' templates/labels.json | while read -r l; do
  name=$(echo "$l" | jq -r .name); color=$(echo "$l" | jq -r .color); desc=$(echo "$l" | jq -r .description)
  enc=$(python3 -c "import urllib.parse,sys;print(urllib.parse.quote(sys.argv[1]))" "$name")
  if gh api "$R/labels/$enc" >/dev/null 2>&1; then
    gh api -X PATCH "$R/labels/$enc" -f name="$name" -f color="$color" -f description="$desc" --silent && echo "label updated: $name"
  else
    gh api -X POST "$R/labels" -f name="$name" -f color="$color" -f description="$desc" --silent && echo "label created: $name"
  fi
done
```

- URL-encode label names (spaces, slashes).
- To reconcile drift (deleted manual labels), show the diff and ask before removing labels that are already in use.

### Module B — Issue forms + config

Create `.github/ISSUE_TEMPLATE/` with `config.yml` plus one YAML form per
template (bug / feature / question). Push via a commit:

- **Replace placeholders** in `config.yml` (`OWNER/REPO` in the
  Discussions / Security contact URLs) — see Template placeholders.
- Write the forms in the user-chosen language (Preflight step 5): translate
  form names, labels, descriptions, and placeholder text; `title:` prefix
  and `labels:` values stay as-is (they must match the label taxonomy).

```bash
mkdir -p .github/ISSUE_TEMPLATE
cp templates/issue-form-*.yml templates/config.yml .github/ISSUE_TEMPLATE/
git add .github/ISSUE_TEMPLATE && git commit -m "chore: add issue forms" && git push
```

- If templates already exist, diff them; only overwrite identical or clearly
  stale files (ask first if the user may have customized them).
- If there is no git clone, clone first (`gh repo clone OWNER/REPO`), edit, push.

### Module C — PR template

```bash
mkdir -p .github
cp templates/PR_TEMPLATE.md .github/PULL_REQUEST_TEMPLATE.md
git add .github/PULL_REQUEST_TEMPLATE.md && git commit -m "chore: add PR template" && git push
```

- Write the template in the user-chosen language (Preflight step 5).
  The PR template has no placeholders to replace.

### Module D — CI workflow

Pick the workflow from the framework detection (templates/ci-*.yml —
they trigger on `$default-branch`, so they work for any default branch
name). Write to `.github/workflows/ci.yml`, commit, push. Keep existing
workflows; only add `ci.yml` if none exists.

- Node projects: `ci-node.yml` installs dependencies lockfile-aware
  (`npm ci` / `pnpm install --frozen-lockfile` / `yarn install
  --frozen-lockfile`, with plain `npm install` as fallback) — no manual
  adjustment needed for pnpm / yarn repos.

- Note: pushing workflow files requires a token with the `workflow` scope; if
  the push is rejected with 403, tell the user their token lacks `workflow`.

### Module E — Branch rules

Prefer **rulesets** (modern) over legacy branch protection:

```bash
# list existing
gh api repos/OWNER/REPO/rulesets -q '.[].name'
# create (example: protect default branch)
gh api -X POST repos/OWNER/REPO/rulesets --input - <<'EOF'
{
  "name": "protect-default-branch",
  "target": "branch",
  "enforcement": "active",
  "conditions": {
    "ref_name": {"include": ["refs/heads/DEFAULT_BRANCH"], "exclude": []}
  },
  "rules": [
    {"type": "pull_request", "parameters": {"required_approving_review_count": 1, "dismiss_stale_reviews_on_push": true, "require_code_owner_review": false, "require_last_push_approval": true, "required_review_thread_resolution": true}},
    {"type": "required_linear_history"},
    {"type": "deletion"},
    {"type": "non_fast_forward"},
    {"type": "required_signatures"}
  ]
}
EOF
```

- Idempotency: if a ruleset with the same name exists, update it with
  `PUT repos/OWNER/REPO/rulesets/{id}` — **full replace**, include the complete
  body (name, enforcement, conditions, rules, bypass_actors). There is no PATCH
  for rulesets (PATCH returns 404).
- Optional admin bypass: add `"bypass_actors": [{"actor_id": 5,
  "actor_type": "RepositoryRole", "bypass_mode": "always"}]` (id 5 = admin)
  so maintainers can push directly to the protected branch; non-admins still
  go through pull requests.
- `pull_request` parameters are **all required** in current API versions:
  `required_approving_review_count`, `dismiss_stale_reviews_on_push`,
  `require_code_owner_review`, `require_last_push_approval`,
  `required_review_thread_resolution`. Omitting any → HTTP 422.
- `target: "branch"` + `ref_name.include: refs/heads/<default>`; also offer
  `"tag"` rules if tags matter.
- Org repos: optionally offer org-level rulesets (`/orgs/{org}/rulesets`).

### Module F — Docs

README (ask about languages FIRST):

- Ask the user: which languages should the README support? (suggest the
  project's primary language + English for international projects)
- If a README already exists, ask whether to adapt it into more languages —
  never add languages without asking.
- Language switcher convention (pattern from `programmingHLS/ccmm`):
  - Default file stays `README.md` (usually English).
  - Extra languages: `README.<lang>.md` (e.g. `README.zh.md`, `README.ja.md`).
  - Top of every file, a switcher line — current language as plain text,
    others as relative links:
    - `README.md`:       `< English | 简体中文 >`  (简体中文 links to `README.zh.md`)
    - `README.zh.md`:    `< English | 简体中文 >`  (English links to `README.md`)
  - Keep structure, badges, and anchors parallel across language files.
- `README.md`: if missing or bare, generate one from `templates/README.md`
  (badges, install, usage, modules table). Keep the user's existing content if
  it is already substantive — only append a badges block. **Replace
  placeholders** (badge URLs, clone URL, owner credit) per Template
  placeholders.
- `CONTRIBUTING.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md`: copy from
  templates if missing (write `CONTRIBUTING.md` in the user-chosen language
  from Preflight step 5; **replace `OWNER/REPO`** in `SECURITY.md`'s
  advisory link per Template placeholders).
- `VISION.md`: optional direction doc (modeled on OpenClaw's VISION.md) —
  generate a short vision from `templates/VISION.md` (origin, guiding
  principles, current state, direction, contribution rules) if the user
  wants one (**replace `PROJECT_NAME`** per Template placeholders).
- `THIRD_PARTY_NOTICES.md`: add when the project adapts third-party content
  (licenses, fonts, code of conduct) — list each source and its license.
- `docs/ARCHITECTURE.md`: for non-trivial projects, generate a short
  architecture doc (structure, flow, constraints) from the audit.
- `LICENSE`: ask the user which license (default MIT) before creating.
- `CHANGELOG.md`: create from `templates/CHANGELOG.md` (Keep a Changelog
  format) if missing; log notable changes per release (**replace
  `YYYY-MM-DD`** in the placeholder date line per Template placeholders).

### Module G — AI assistant guides (CLAUDE.md / AGENTS.md)

- Add a `CLAUDE.md` (guidance for Claude Code) and an `AGENTS.md` (guidance
  for any AI coding agent) when missing — see `templates/CLAUDE.md` and
  `templates/AGENTS.md` (**replace `OWNER/REPO`** and the i18n placeholder
  per Template placeholders).
- If they already exist, diff and fill gaps rather than overwrite.
- Typical content, derived from the repo audit (Modules A–F):
  - Project: one-paragraph summary, status, stack.
  - Commands: build / test / lint / run (from CI detection + package scripts).
  - Conventions: commit style (see CONTRIBUTING), label taxonomy, i18n
    requirements, secrets policy (never hardcode keys), file map.
  - Caveats: known risks, areas to be careful with.
- CLAUDE.md vs AGENTS.md: CLAUDE.md is Claude-specific; AGENTS.md is
  agent-agnostic (works for Cursor/Copilot/OpenClaw too). Keep AGENTS.md free
  of Claude-only references.

## Verification

```bash
gh label list --repo OWNER/REPO --limit 200 | wc -l
gh api repos/OWNER/REPO/contents/.github/ISSUE_TEMPLATE -q '.[].name' 2>/dev/null
gh api repos/OWNER/REPO/contents/.github/PULL_REQUEST_TEMPLATE.md -q .name 2>/dev/null
gh api repos/OWNER/REPO/contents/.github/workflows/ci.yml -q .name 2>/dev/null
gh api repos/OWNER/REPO/rulesets -q '.[] | {name:.name, enforcement:.enforcement}'
```

Report a final table: `module | status (applied/skipped/failed) | note`.

## Template placeholders (replace on copy)

Templates stay generic — `OWNER/REPO`, `OWNER_USERNAME`, `PROJECT_NAME`,
`YYYY-MM-DD` are placeholders the agent fills in when copying a template
into the target repo. **Unreplaced placeholders ship broken links** (badges,
clone URL, discussions, security advisory, CODEOWNERS handle) into the
user's repo.

| Placeholder | Replace with |
|---|---|
| `OWNER` | target repo owner login (user or org) |
| `REPO` | target repo name |
| `OWNER_USERNAME` | owner's default reviewer / team handle |
| `PROJECT_NAME` | project display name |
| `YYYY-MM-DD` | current date |

Resolve the values once up front, then substitute in every copied file
(`config.yml`, `README*.md`, `SECURITY.md`, `CODEOWNERS`, `AGENTS.md` /
`CLAUDE.md`, `VISION.md`, …):

```bash
O=OWNER R=REPO N=PROJECT_NAME D=$(date +%F)
sed -i "s|OWNER_USERNAME|$O|g; s|OWNER/REPO|$O/$R|g; s|PROJECT_NAME|$N|g; s|YYYY-MM-DD|$D|g" \
  .github/ISSUE_TEMPLATE/config.yml README.md SECURITY.md .github/CODEOWNERS AGENTS.md
```

- Replace `OWNER_USERNAME` before `OWNER/REPO` — the former contains the
  `OWNER` prefix, so order matters with naive `sed`.
- Only `config.yml`, `README*.md`, `SECURITY.md`, `CODEOWNERS`, `AGENTS.md` /
  `CLAUDE.md`, `VISION.md`, `CHANGELOG.md` carry placeholders; the issue
  forms, PR template, CI workflows, and CoC are placeholder-free.
- CI templates need no substitution, but **translate** their human-facing
  text if the user chose a non-English language.

## Rules of thumb

- **Idempotent**: every module can run twice with the same result.
- **Never clobber user content**: diff first, ask before overwriting customized files.
- **Auth first**: no token, no action — tell the user how to log in, never guess.
- **Dry-run before destructive ops**: rulesets, branch rules, label deletion, visibility changes.
- **Confirm scope**: org/private repos and anything the user didn't explicitly name.

## Templates

All templates live in `templates/`:
`labels.json`, `LABELS.md`, `config.yml`, `issue-form-bug.yml`,
`issue-form-feature.yml`, `issue-form-question.yml`, `PR_TEMPLATE.md`,
`ci-node.yml`, `ci-python.yml`, `ci-go.yml`, `ci-rust.yml`, `CODEOWNERS`,
`CONTRIBUTING.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md`, `CLAUDE.md`,
`AGENTS.md`, `VISION.md`, `CHANGELOG.md`, `templates/README.md`,
`templates/README.zh.md`.
