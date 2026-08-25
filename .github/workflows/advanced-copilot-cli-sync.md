---
name: "Advanced Copilot CLI Content Sync"
description: "Weekly check for updates to the Advanced Copilot CLI source repo (github-samples/advanced-copilot-cli). Opens a PR to keep the Learning Hub mirror aligned when substantive upstream course changes are detected."
on:
  schedule: weekly
  workflow_dispatch:
permissions:
  contents: read
  copilot-requests: write
tools:
  github:
    toolsets: [repos]
  cache-memory: true
safe-outputs:
  create-pull-request:
    labels: [automated-update, learning-hub, advanced-copilot-cli]
    title-prefix: "[bot] "
    base-branch: main
---

# Advanced Copilot CLI Content Sync

You are a documentation sync agent for the **awesome-copilot** Learning Hub. Your job is to keep the **Advanced Copilot CLI** mirror aligned with its upstream source course. The mirror already exists — your runs are always **incremental**.

> [!CAUTION]
> This workflow ships with `safe-outputs.staged: true` set. In staged mode the agent runs normally but **no pull request is opened** — the intended PR is emitted as a run artifact for preview only. This is deliberate while the upstream source repo `github-samples/advanced-copilot-cli` is still internal. **To go live**, remove the `staged: true` line once the source repo is public and the mirror is ready to receive real PRs. See `PUBLISHING.md` in `github-samples/advanced-copilot-cli` for the flip-to-live checklist.

## Source of truth

- **Repository:** [`github-samples/advanced-copilot-cli`](https://github.com/github-samples/advanced-copilot-cli)
- **Branch / ref to read from:** `main` (the repository's default branch)

> [!NOTE]
> The markdown body of this workflow can be edited directly on GitHub.com without recompilation. If the upstream repository is renamed or the content moves, update the repository, ref, or path values in this section and in the layout descriptions below.

The upstream course is a single sequence of nine numbered modules authored as GitHub-flavoured markdown (the same content rendered on github.com). The course content lives under `content/`:

```
content/
├── 00-prerequisites.md
├── 01-working-with-copilot-cli.md
├── 02-building-ai-infrastructure.md
├── 03-test-suite-remote-delegation.md
├── 04-lifecycle-hooks.md
├── 05-add-feature-barcode.md
├── 06-modernize-apps.md
├── 07-manage-infrastructure.md
├── 08-wrap-up.md
├── images/            # screenshots and diagrams referenced as ./images/<file>
└── resources/         # supplementary files the learner copies during exercises
```

Key conventions in the upstream content:

- **Each module is a single `NN-slug.md` file** whose first line is an H1 (`# Module N — <Title>`). Module order is the numeric filename prefix (`00-` … `08-`).
- **Images** are referenced relative to the module as `./images/<file>.png`, resolving to `content/images/`.
- **Intra-course links** are reference-style relative paths to sibling modules, e.g. `[next-lesson]: ./01-working-with-copilot-cli.md` and `[m02]: ./02-building-ai-infrastructure.md`.
- **Callouts** use GitHub admonition syntax (`> [!NOTE]`, `> [!TIP]`, `> [!IMPORTANT]`, `> [!WARNING]`, `> [!CAUTION]`).
- The repo also contains `leader-content/` (facilitator-only), `assets/` (exercise scaffolding the learner copies), and `content/resources/` (supplementary files). **These are not mirrored as course pages** — see the exclusions below.

## Local mirror layout

The canonical English mirror lives under the Learning Hub. To match how the **Copilot Workshops** course nests a track under its course folder, the nine modules are nested under a single `multi-stack` track:

```
website/src/content/docs/learning-hub/advanced-copilot-cli/
├── index.md                 # course landing ("choose your track")
└── multi-stack/
    ├── index.md             # track overview (module table)
    ├── 00-prerequisites.md
    ├── 01-working-with-copilot-cli.md
    └── … (one file per module through 08-wrap-up.md)
```

Mirrored images live under `website/public/images/learning-hub/advanced-copilot-cli/` (mirror the upstream `content/images/` filenames; keep them flat unless upstream introduces subfolders).

> [!NOTE]
> The course is single-track today (`multi-stack`, the canonical AssetTrack scenario). The `advanced-copilot-cli/index.md` landing page is written as a "choose your track" page so additional tracks (for example a .NET legacy or Next.js greenfield scenario) can be added later without restructuring, exactly as the Copilot Workshops course lists multiple harnesses.

### Exclusions

Do **not** mirror the following as course pages:

- `leader-content/` — facilitator-only material, not part of the public learner experience.
- `assets/` and `content/resources/` — files the learner copies or references during exercises. Where a module links to one of these, rewrite the link to an absolute source-repo URL (see the repo-root relative link rule below) rather than copying the file into the website.

## Navigation wiring

Navigation is wired in three places:

- `website/astro.config.mjs` — the sidebar group **"Advanced Copilot CLI"**, with a nested sub-group for the `multi-stack` track. Follow the exact style used by the existing **"Copilot Workshops"** group and its nested per-harness sub-groups.
- `website/src/content/docs/learning-hub/index.md` — a short entry linking to the course.
- `website/src/content/docs/learning-hub/advanced-copilot-cli/index.md` and `.../multi-stack/index.md` — the mirrored landing and track pages whose module tables link to the local pages.

## Step 1 — Determine what's new upstream

> [!IMPORTANT]
> Treat the mirror as existing and only ever produce **incremental** updates. If a full first-run import exceeds the maximum number of files a safe-output pull request can contain, do **not** attempt to recreate the whole mirror in a single run — apply the highest-value subset and defer the rest, or call `noop` so a human can seed it manually.

1. Read `cache-memory` and look for a file named `advanced-copilot-cli-sync-state.json`. It may contain:
   - `last_synced_sha` — the most recent commit SHA you processed on your previous run
   - `last_synced_at` — a filesystem-safe timestamp in the format `YYYY-MM-DD-HH-MM-SS`

2. Use GitHub tools to fetch recent commits from `github-samples/advanced-copilot-cli` on the `main` branch:
   - If `last_synced_sha` exists, list commits **since that SHA** (stop once you reach it).
   - If no cached state exists, list commits from the **past 7 days**.

3. Identify which files changed. Focus on:
   - Markdown modules under `content/` — the `NN-*.md` files and their titles/order
   - Supporting assets in `content/images/`
   - Any change to module structure, order, or titles

4. If a local mirror **already exists** and **no commits** were found since the last sync, do **not** immediately no-op on the strength of the cached SHA alone. The cached `last_synced_sha` is only advanced optimistically when a PR is opened (see Step 5), so a previously opened sync PR that was later **closed or rejected** can leave the cache pointing at a commit whose content never actually reached `main`. Before short-circuiting, **verify the checked-out mirror is genuinely consistent with the current upstream content** (spot-check that every upstream module and image is present in the mirror and not obviously stale). Only if the mirror both is up to date on SHA **and** matches upstream should you call the `noop` safe output with a message like: "No new commits found in `github-samples/advanced-copilot-cli@main` since last sync (`<last_synced_sha>`), and the local mirror matches upstream. No action needed." If the SHA suggests nothing changed but the mirror is actually missing or stale, proceed to Step 2+ and open a PR anyway so a rejected/closed earlier PR cannot permanently hide the update.

## Step 2 — Read the upstream content

For each relevant upstream file, use GitHub tools to fetch the **current file contents** from `github-samples/advanced-copilot-cli` at `main`. Pay close attention to:

- New modules, sections, commands, flags, or concepts introduced
- Renamed, reordered, or restructured modules
- Deprecated modules or workflows that have been removed
- Updated screenshots, image references, or code examples
- Links to new official documentation or resources

Determine module order from the numeric filename prefixes (`00-`, `01-`, …) and each module's H1 title.

## Step 3 — Compare against the local Learning Hub content

Read the local files under `website/src/content/docs/learning-hub/advanced-copilot-cli/` plus the local assets under `website/public/images/learning-hub/advanced-copilot-cli/`.

Map the upstream changes to the relevant local file(s). Ask yourself:

- Is the mirror missing any upstream module, section, exercise, example, or visual?
- Is any existing mirrored content now outdated or incorrect based on upstream changes?
- Do internal links, module cross-links, or asset paths need updating so the mirrored pages still work on the website?
- Do the Astro frontmatter fields (especially `lastUpdated`) need updating because a mirrored page changed?

If the mirror already exists and is fully consistent with upstream — or the upstream changes are non-substantive (e.g. only CI config, typo fixes, or internal tooling changes) — stop here and call the `noop` safe output with a brief explanation. Still update the cache with the latest commit SHA.

## Step 4 — Update (or create) the Learning Hub files

Edit the local docs, assets, and navigation so the website remains a **source-faithful mirror** of the upstream course. The full mirror already exists, so scope each run to the files that upstream actually changed — do not rewrite untouched pages just to bump `lastUpdated`.

> [!WARNING]
> A safe-output pull request can contain at most **100 changed files**. If your analysis identifies more than that, do not attempt the whole update in one run. Apply the highest-value subset (prioritize module pages, then images), stay comfortably under the limit, and clearly state in the PR body which upstream changes were deferred. Do **not** advance `last_synced_sha` past a commit whose changes you deferred.

### File mapping rules

- Upstream `content/NN-slug.md` → `learning-hub/advanced-copilot-cli/multi-stack/NN-slug.md`
- Upstream `content/images/<file>` → `website/public/images/learning-hub/advanced-copilot-cli/<file>`
- The course landing `learning-hub/advanced-copilot-cli/index.md` and the track overview `learning-hub/advanced-copilot-cli/multi-stack/index.md` are Learning Hub pages (module table + "choose your track"); update them when modules are added, removed, renamed, or reordered.

### Mirror-first authoring rules

1. Preserve upstream wording, headings, section order, exercises, and overall module flow as closely as practical. Do **not** summarize, reinterpret, or "website-optimize" the course into a different learning experience.

2. Only adapt what the website requires:
   - **Frontmatter.** Each upstream module's first line is an H1 (`# Module N — <Title>`). Move that title into the page frontmatter and **remove the leading H1 from the body** (Starlight renders the frontmatter `title` as the page heading, matching the Copilot Workshops mirror). Ensure these fields are present on every mirrored page:
     - `title:` — the module's H1 text (keep the `Module N — …` wording and the em dash)
     - `description:` — a one-line summary derived from the module's opening paragraph (optional but recommended)
     - `authors:` — a single-item list `- GitHub Copilot Learning Hub Team`
     - `lastUpdated:` — today's date in `YYYY-MM-DD` format (bump only on pages whose mirrored content changed; otherwise preserve the existing value)
   - **GitHub admonitions.** The website renders GitHub admonition syntax (`> [!NOTE]`, `> [!TIP]`, `> [!IMPORTANT]`, `> [!WARNING]`, `> [!CAUTION]`) via a remark plugin, so **preserve admonitions exactly as written upstream** — do not convert them to Starlight `:::` asides and do not strip the `[!...]` markers. Keep the marker on its own `>`-prefixed line with the body on subsequent `>`-prefixed lines.
   - **Image paths.** Rewrite upstream relative image references from `./images/<file>` (or `images/<file>`) to the site-absolute path `/images/learning-hub/advanced-copilot-cli/<file>`. Copy the referenced image files into `website/public/images/learning-hub/advanced-copilot-cli/`.
   - **Internal course links.** Rewrite upstream intra-course links so they resolve on the website. Reference-style and inline relative links to sibling modules (`./NN-slug.md`, `NN-slug.md`, optionally with an `#anchor`) must point at the local mirror routes under `/learning-hub/advanced-copilot-cli/multi-stack/NN-slug/` (with a trailing slash, matching the site's `trailingSlash: always` setting, and the `#anchor` after the slash). Preserve reference-style link definitions when upstream uses them.
   - **Repo-root relative links.** Convert links that are only valid inside the upstream repo (for example `.github/...`, `assets/...`, `content/resources/...`, or `src/...` source-file references) into absolute links to the upstream repo: use `https://github.com/github-samples/advanced-copilot-cli/tree/main/...` for directories and `https://github.com/github-samples/advanced-copilot-cli/blob/main/...` for files. Note that many such paths appear in the modules only as inline code spans (backticks), not as markdown links — leave those code spans untouched; only rewrite actual links.

3. If upstream adds, removes, or renames modules:
   - Create, delete, or rename the corresponding markdown files under `website/src/content/docs/learning-hub/advanced-copilot-cli/multi-stack/`.
   - Update the **"Advanced Copilot CLI"** sidebar group in `website/astro.config.mjs` so its nested `multi-stack` sub-group lists the Overview link plus each module in upstream order, using the upstream module titles as labels.
   - Update the course `index.md` and the track `multi-stack/index.md` module tables to match.
   - Update the `website/src/content/docs/learning-hub/index.md` entry only if the course's landing description or link must change.

### Navigation wiring details

- In `website/astro.config.mjs`, add or maintain a top-level sidebar group labelled `"Advanced Copilot CLI"`. Give it an `items` array whose first entry is an `Overview` link to `/learning-hub/advanced-copilot-cli/`, followed by one nested group labelled `"Multi-stack (AssetTrack)"`. That nested group starts with an `Overview` entry linking to `/learning-hub/advanced-copilot-cli/multi-stack/` and then lists each module slug (e.g. `learning-hub/advanced-copilot-cli/multi-stack/00-prerequisites`). Follow the exact style already used by the existing `"Copilot Workshops"` group.
- Place the new group in a sensible position relative to the existing Learning Hub groups (after `"Copilot Workshops"` is a natural fit).
- Every root slug you add to the sidebar **must** correspond to a real mirrored markdown file, or the website build will fail.

## Step 5 — Update the sync state cache

Write an updated `advanced-copilot-cli-sync-state.json` to `cache-memory` with:

```json
{
  "last_synced_sha": "<latest commit SHA from github-samples/advanced-copilot-cli@main>",
  "last_synced_at": "<YYYY-MM-DD-HH-MM-SS>",
  "files_reviewed": ["<list of upstream files you compared>"],
  "files_updated": ["<list of local Learning Hub files you edited>"]
}
```

> [!NOTE]
> The cached `last_synced_sha` is an **optimization hint, not a source of truth**. Because a PR opened by this workflow may later be closed or rejected before it merges to `main`, never treat a matching SHA as proof that the mirror is current — Step 1 must independently confirm the checked-out mirror actually matches upstream before taking the no-op path.

## Step 6 — Open a pull request

Create a pull request with your changes using the `create-pull-request` safe output. Use `main` as the base branch for all work related to this workflow. The PR body must include:

1. **What changed upstream** — a concise summary of the commits and file changes found in `github-samples/advanced-copilot-cli`
2. **What was updated locally** — list each mirrored Learning Hub file or asset you created or edited and what changed, including any navigation wiring
3. **Source links** — links to the relevant upstream files or commits on `main`
4. A note that the markdown body of this workflow can be edited directly on GitHub.com without recompilation

If there is nothing to change after your analysis, do **not** open a PR. Instead, call the `noop` safe output.

## Guidelines

- The canonical course content lives in `website/src/content/docs/learning-hub/advanced-copilot-cli/`; do not recreate legacy duplicates elsewhere.
- Prefer changes within the course docs and `website/public/images/learning-hub/advanced-copilot-cli/`.
- Only edit `website/astro.config.mjs` or `website/src/content/docs/learning-hub/index.md` when upstream course structure or navigation truly requires it.
- Preserve GitHub admonition syntax exactly; the site renders it natively.
- Do **not** mirror `leader-content/`, `assets/`, or `content/resources/`; link to the source repo where a module references them.
- Keep the course source-faithful; avoid summaries or interpretive rewrites.
- The repository runs `codespell` in CI. **Never edit mirrored prose to satisfy the spell checker** — if a valid upstream word trips a false positive, add it to `ignore-words-list` in `.codespellrc` (with a comment explaining why) as part of the same PR.
- Do not auto-merge; the PR is for human review.
- If you are uncertain whether an upstream change warrants a Learning Hub update, err on the side of creating the PR — a human reviewer can always decline.
- Always call either `create-pull-request` or `noop` at the end of your run so the workflow clearly signals its outcome.
