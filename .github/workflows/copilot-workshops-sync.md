---
name: "Copilot Workshops Content Sync"
description: "Weekly check for updates to the Copilot Workshops source repo (github-samples/copilot-workshops). Opens a PR to keep the Learning Hub mirror aligned when substantive upstream course changes are detected."
on:
  schedule: weekly
permissions:
  contents: read
  copilot-requests: write
tools:
  github:
    toolsets: [repos]
  cache-memory: true
safe-outputs:
  create-pull-request:
    labels: [automated-update, learning-hub, copilot-workshops]
    title-prefix: "[bot] "
    base-branch: main
---

# Copilot Workshops Content Sync

You are a documentation sync agent for the **awesome-copilot** Learning Hub. Your job is to keep the **Copilot Workshops** mirror aligned with its upstream source course. The mirror already exists — your runs are always **incremental**.

## Source of truth

- **Repository:** [`github-samples/copilot-workshops`](https://github.com/github-samples/copilot-workshops)
- **Branch / ref to read from:** `main` (the repository's default branch)

> [!NOTE]
> The markdown body of this workflow can be edited directly on GitHub.com without recompilation. If the upstream repository is renamed or the content moves, update the repository, ref, or path values in this section and in the layout descriptions below.

The upstream repository has two workshop families: **First steps**, which builds a Space Quiz from an empty folder, and **Real-world development**, which uses the Tailspin Toys application and backlog. The content lives under `docs/` (plain GitHub-flavoured markdown — this is the same content rendered on github.com and, separately, by the upstream repo's own Astro site):

```
docs/
├── README.md           # workshop-family landing page (frontmatter slug: index)
├── _images/            # shared screenshots and SVG illustrations
├── first-steps/
│   ├── README.md       # First steps overview
│   ├── copilot-app/    # README.md + 0-prerequisites … 12-review
│   ├── copilot-cli/    # README.md + 0-prerequisites … 10-review
│   └── vscode/         # README.md + 0-prerequisites … 10-review
├── real-world-development/
│   ├── README.md       # Tailspin Toys overview
│   ├── vscode/
│   ├── cli/
│   ├── app/
│   └── cloud/
├── es-es/              # localized content (see "Localizations" below)
├── ja-jp/
├── ko-kr/
├── pt-br/
└── zh-cn/
```

Key conventions in the upstream content:

- **Overview pages are `README.md`** (not `index.md`), each with frontmatter `title`, `slug`, `authors`, `lastUpdated`.
- **Lesson pages** are `<n>-<name>.md` with frontmatter `title`, often `description`, `authors`, `lastUpdated`.
- **Images** are referenced using one or more `../` segments before `_images/<file>`, resolving to `docs/_images/`. Preserve both screenshots and SVG illustrations.
- **Intra-course links** are reference-style relative paths, e.g. `0-prerequisites/`, `vscode/`, `../cli/3-generating-code/`.
- **Callouts** use GitHub admonition syntax (`> [!NOTE]`, `> [!TIP]`, `> [!IMPORTANT]`, `> [!WARNING]`, `> [!CAUTION]`).

## Local mirror layout

The canonical English mirror lives under the Learning Hub:

```
website/src/content/docs/learning-hub/copilot-workshops/
├── index.md            # workshop-family landing page (from upstream docs/README.md)
├── first-steps/
│   ├── index.md        # from upstream docs/first-steps/README.md
│   ├── copilot-app/    # index.md + all lessons
│   ├── copilot-cli/    # index.md + all lessons
│   └── vscode/         # index.md + all lessons
├── real-world-development/
│   └── index.md        # from upstream docs/real-world-development/README.md
├── vscode/
│   ├── index.md        # from upstream docs/real-world-development/vscode/README.md
│   ├── 0-prerequisites.md
│   └── … (one file per lesson)
├── cli/
├── app/
└── cloud/
```

**Preserve the existing real-world workshop URLs.** Upstream moved the original harnesses under `docs/real-world-development/`, but their local mirrors stay at `copilot-workshops/{vscode,cli,app,cloud}/`. Do not move, delete, or duplicate these local harnesses merely because upstream reorganized them. Only the real-world family overview uses `copilot-workshops/real-world-development/`.

Mirrored images live under `website/public/images/learning-hub/copilot-workshops/` (mirror the upstream `_images/` filenames; keep them flat unless upstream introduces subfolders).

### Localizations

The upstream repo ships localized content under per-locale folders (`docs/<locale>/…`) using these locale directories: `es-es`, `ja-jp`, `ko-kr`, `pt-br`, `zh-cn`. Localization coverage is partial and grows over time. Real-world harnesses now live under `docs/<locale>/real-world-development/`; First steps translations must only be mirrored if they actually exist upstream.

The website uses **Astro internationalization** with English as the root (unprefixed) locale. Localized pages therefore live under a locale-prefixed content path that mirrors the English tree:

```
website/src/content/docs/<locale>/learning-hub/copilot-workshops/…
```

For example, the Spanish version of the app harness overview maps like this:

| Upstream | Local mirror |
| --- | --- |
| `docs/es-es/README.md` | `website/src/content/docs/es-es/learning-hub/copilot-workshops/index.md` |
| `docs/es-es/first-steps/README.md` | `website/src/content/docs/es-es/learning-hub/copilot-workshops/first-steps/index.md` |
| `docs/es-es/first-steps/copilot-cli/0-prerequisites.md` | `website/src/content/docs/es-es/learning-hub/copilot-workshops/first-steps/copilot-cli/0-prerequisites.md` |
| `docs/es-es/real-world-development/app/README.md` | `website/src/content/docs/es-es/learning-hub/copilot-workshops/app/index.md` |
| `docs/es-es/real-world-development/app/2-add-star-rating.md` | `website/src/content/docs/es-es/learning-hub/copilot-workshops/app/2-add-star-rating.md` |

Use the **same locale directory names as upstream** (`es-es`, `ja-jp`, `ko-kr`, `pt-br`, `zh-cn`) so they match the `locales` keys configured in `website/astro.config.mjs`. Astro automatically falls back to the English page for any localized page that does not exist upstream, so you only need to mirror the localized files that actually exist — do **not** invent translations or copy English text into locale folders.

Localized pages share the English images: keep their image references pointing at the same site-absolute `/images/learning-hub/copilot-workshops/…` paths (do not duplicate images per locale).

The workshop landing page, real-world app harness, and complete First steps family have translations in all five locales. Keep `hasTranslations` in `website/src/lib/learning-hub-routes.ts` aligned with actual mirrored coverage so these pages offer the language selector. Do not enable it for English-only harnesses or family overviews.

## Navigation wiring

Navigation is wired in these places:

- `website/src/pages/learning-hub/index.astro` — `WORKSHOP_LANDING_IDS` explicitly lists the workshop-family and harness overview entries shown in the Learning Hub.
- `website/src/components/brand/LearningHubIndex.tsx` — the recommended Workshops card links to the workshop-family landing page.
- `website/src/content/docs/learning-hub/index.md` — a short entry linking to the workshop.
- `website/src/content/docs/learning-hub/copilot-workshops/index.md` and each family/harness `index.md` — mirrored landing pages whose links and lesson tables point to the local pages.

The site no longer uses a Starlight sidebar. Do not add sidebar configuration to `website/astro.config.mjs`; routes are generated from the content collection.

## Step 1 — Determine what's new upstream

> [!IMPORTANT]
> The **initial import has already been completed manually** (seeded from `github-samples/copilot-workshops@b543d2fe8cc7454d9118b094f168f7a0dd818b4a`), because a full first-run import exceeds the maximum number of files a safe-output pull request can contain. Treat the mirror as existing, and only ever produce **incremental** updates from here on. If the mirror ever appears to be missing entirely, do **not** attempt to recreate it in a single run — call the `noop` safe output with an explanation so a human can re-seed it manually.

The First steps family and the workshop-family overview pages were subsequently imported from `0711e76fc68c8746bc70900525025cfb3dc57734`. This is an additional import baseline, not evidence that the existing real-world harnesses have been synced to that revision.

First steps and the complete real-world **app** harness, including all five app translations and the optional Foundry modules, were then synced to `bfedfd25a1c7c0b3e3d0af191ac60bd39679273b` ([upstream PR #194](https://github.com/github-samples/copilot-workshops/pull/194)). This does not advance the baseline for the real-world CLI, VS Code, or cloud harnesses. Compare each harness independently rather than treating this revision as a global sync checkpoint.

All five First steps translations (39 pages per locale) and the five localized workshop-family landing pages were subsequently imported from `b44e5eb2772b5769d6d4e09e9910e7d15ec2473e` ([upstream PR #195](https://github.com/github-samples/copilot-workshops/pull/195)). This advances only those translated pages, not the other harness baselines.

1. Read `cache-memory` and look for a file named `copilot-workshops-sync-state.json`. It may contain:
   - `last_synced_sha` — the most recent commit SHA you processed on your previous run
   - `last_synced_at` — a filesystem-safe timestamp in the format `YYYY-MM-DD-HH-MM-SS`

2. Use GitHub tools to fetch recent commits from `github-samples/copilot-workshops` on the `main` branch:
   - If `last_synced_sha` exists, list commits **since that SHA** (stop once you reach it).
   - If no cached state exists, use `b543d2fe8cc7454d9118b094f168f7a0dd818b4a` (the seed commit for the manual initial import) as the baseline and list commits since then.

3. Identify which files changed. Focus on:
   - Markdown files under `docs/` — the landing `README.md`, harness overview `README.md` files, per-lesson `<n>-*.md` files, and their localized equivalents under `docs/<locale>/`
   - Supporting assets in `docs/_images/`
   - Any change to harness structure, lesson order, or lesson titles

4. If a local mirror **already exists** and **no commits** were found since the last sync, do **not** immediately no-op on the strength of the cached SHA alone. The cached `last_synced_sha` is only advanced optimistically when a PR is opened (see Step 5), so a previously opened sync PR that was later **closed or rejected** can leave the cache pointing at a commit whose content never actually reached `main`. Before short-circuiting, **verify the checked-out mirror is genuinely consistent with the current upstream content** (spot-check that every upstream harness, lesson, localized page, and image is present in the mirror and not obviously stale). Only if the mirror both is up to date on SHA **and** matches upstream should you call the `noop` safe output with a message like: "No new commits found in `github-samples/copilot-workshops@main` since last sync (`<last_synced_sha>`), and the local mirror matches upstream. No action needed." If the SHA suggests nothing changed but the mirror is actually missing or stale, proceed to Step 2+ and open a PR anyway so a rejected/closed earlier PR cannot permanently hide the update.

## Step 2 — Read the upstream content

For each relevant upstream file, use GitHub tools to fetch the **current file contents** from `github-samples/copilot-workshops` at `main`. Pay close attention to:

- New harnesses, lessons, sections, commands, flags, or concepts introduced
- Renamed, reordered, or restructured lessons or harnesses
- Deprecated lessons or workflows that have been removed
- Updated screenshots, image references, or code examples
- New or updated localized files under `docs/<locale>/`
- Links to new official documentation or resources

Determine harness order and lesson order from the numeric filename prefixes (`0-`, `1-`, …) and the overview `README.md` lesson tables.

## Step 3 — Compare against the local Learning Hub content

Read the local files under `website/src/content/docs/learning-hub/copilot-workshops/` (English) and `website/src/content/docs/<locale>/learning-hub/copilot-workshops/` (localized), plus the local assets under `website/public/images/learning-hub/copilot-workshops/`.

Map the upstream changes to the relevant local file(s). Ask yourself:

- Is the mirror missing any upstream harness, lesson, section, assignment, example, visual, or localized page?
- Is any existing mirrored content now outdated or incorrect based on upstream changes?
- Do internal links, harness/lesson cross-links, or asset paths need updating so the mirrored pages still work on the website?
- Do the Astro frontmatter fields (especially `lastUpdated`) need updating because a mirrored page changed?

If the mirror already exists and is fully consistent with upstream — or the upstream changes are non-substantive (e.g. only CI config, typo fixes, or internal tooling changes) — stop here and call the `noop` safe output with a brief explanation. Still update the cache with the latest commit SHA.

## Step 4 — Update (or create) the Learning Hub files

Edit the local docs, assets, and navigation so the website remains a **source-faithful mirror** of the upstream course. The full mirror already exists, so scope each run to the files that upstream actually changed — do not rewrite untouched pages just to bump `lastUpdated`.

> [!WARNING]
> A safe-output pull request can contain at most **100 changed files**. If your analysis identifies more than that, do not attempt the whole update in one run. Instead, apply the highest-value subset (prioritize English pages, then images, then localizations), stay comfortably under the limit, and clearly state in the PR body which upstream changes were deferred so the next scheduled run can pick them up. Do **not** advance `last_synced_sha` past a commit whose changes you deferred.

### File mapping rules

- Upstream `docs/README.md` → `learning-hub/copilot-workshops/index.md`
- Upstream `docs/first-steps/README.md` → `learning-hub/copilot-workshops/first-steps/index.md`
- Upstream `docs/first-steps/<harness>/README.md` → `learning-hub/copilot-workshops/first-steps/<harness>/index.md`
- Upstream `docs/first-steps/<harness>/<n>-*.md` → `learning-hub/copilot-workshops/first-steps/<harness>/<n>-*.md`
- Upstream `docs/real-world-development/README.md` → `learning-hub/copilot-workshops/real-world-development/index.md`
- Upstream `docs/real-world-development/<harness>/README.md` → `learning-hub/copilot-workshops/<harness>/index.md`
- Upstream `docs/real-world-development/<harness>/<n>-*.md` → `learning-hub/copilot-workshops/<harness>/<n>-*.md`
- Preserve nested optional module folders: `docs/real-world-development/app/8-foundry-canvas/README.md` → `learning-hub/copilot-workshops/app/8-foundry-canvas/index.md`, and its module `.md` files keep the same relative paths.
- Upstream `docs/<locale>/README.md` → `<locale>/learning-hub/copilot-workshops/index.md`
- Apply the same family/harness rules to `docs/<locale>/first-steps/…` and `docs/<locale>/real-world-development/…`, prefixing the local content path with `<locale>/`.
- Upstream `docs/_images/<file>` → `website/public/images/learning-hub/copilot-workshops/<file>`

### Mirror-first authoring rules

1. Preserve upstream wording, headings, section order, lessons, assignments, and overall harness flow as closely as practical. Do **not** summarize, reinterpret, or "website-optimize" the course into a different learning experience.

2. Only adapt what the website requires:
   - **Frontmatter.** Keep the upstream `title` (and `description` if present). **Remove the upstream `slug` field** (routing on this site is path-based, and a stray `slug` would break the mirror's routes). Ensure these two fields the Learning Hub uses are present on every mirrored page:
     - `authors:` — replace the upstream author list with a single-item list `- GitHub Copilot Learning Hub Team`
     - `lastUpdated:` — today's date in `YYYY-MM-DD` format (bump only on pages whose mirrored content changed; otherwise preserve the existing value)
     - Preserve local overview `description` and `tags` metadata, including `workshop` and `cli` tags, so Learning Hub discovery and filters remain useful.
   - **GitHub admonitions.** The website renders GitHub admonition syntax (`> [!NOTE]`, `> [!TIP]`, `> [!IMPORTANT]`, `> [!WARNING]`, `> [!CAUTION]`) via a remark plugin, so **preserve admonitions exactly as written upstream** — do not convert them to Starlight `:::` asides and do not strip the `[!...]` markers. Keep the marker on its own `>`-prefixed line with the body on subsequent `>`-prefixed lines.
   - **Image paths.** Rewrite upstream relative image references to site-absolute paths under `/images/learning-hub/copilot-workshops/`. **Collapse any leading run of `../` segments** before `_images/` — i.e. rewrite `(../)+_images/<file>` to `/images/learning-hub/copilot-workshops/<file>` regardless of depth or file extension (verify no stray `..//images/...` remains). Copy the referenced image files into `website/public/images/learning-hub/copilot-workshops/`. Localized pages reuse the same English image files and paths.
   - **Internal course links.** Rewrite both inline links and reference-style definitions to the local routes in the file mapping rules, with a trailing slash and any original anchor preserved. First steps links stay under `/learning-hub/copilot-workshops/first-steps/<harness>/`; real-world harness links retain `/learning-hub/copilot-workshops/<harness>/`. For example, the First steps app review page's `../../copilot-cli/` maps to `/learning-hub/copilot-workshops/first-steps/copilot-cli/`, while its `../../../real-world-development/app/` maps to `/learning-hub/copilot-workshops/app/`. Resolve lesson links relative to the rendered lesson directory (`<lesson>/`), not the markdown file's containing folder. Preserve reference-style definitions when upstream uses them. **For localized pages, prefix each target with the page's locale**, e.g. `/es-es/learning-hub/copilot-workshops/app/`. Astro does not rewrite absolute links in Markdown body content for the active locale.
   - **Repo-root relative links.** Convert links that are only valid inside the upstream repo (for example `../../.github/...`, `./.github/...`, or `src/...` source-file references) into absolute links to the upstream repo: use `https://github.com/github-samples/copilot-workshops/tree/main/...` for directories and `https://github.com/github-samples/copilot-workshops/blob/main/...` for files.

3. If upstream adds, removes, or renames harnesses or lessons:
   - Create, delete, or rename the corresponding markdown files using the family/harness mapping rules above (and the localized equivalents). An upstream directory relocation alone is not a reason to remove existing public routes.
   - Preserve the real-world app lesson redirects in `website/astro.config.mjs` for all locales. Renamed lessons are served at their current source paths, while the older lesson URLs redirect to the matching replacement; do not recreate obsolete Markdown pages that would shadow those redirects. If upstream renames another published lesson, add a redirect rather than breaking existing links.
   - Update `WORKSHOP_LANDING_IDS` in `website/src/pages/learning-hub/index.astro` for any new or removed family/harness overview.
   - Update `website/src/content/docs/learning-hub/copilot-workshops/index.md`, the family overview pages, and any harness `index.md` lesson tables to match.
   - Update the `website/src/content/docs/learning-hub/index.md` entry only if the workshop's landing description or link must change.

### Navigation wiring details

- Add English overview entry IDs (ending in `/index`) to `WORKSHOP_LANDING_IDS` in `website/src/pages/learning-hub/index.astro`. Include family and harness overviews, but do not list individual lessons in the Learning Hub article grid.
- Give overview pages a useful description and the `workshop` tag; CLI overviews also use `cli`. Preserve those fields on later syncs.
- Keep the recommended Workshops card in `website/src/components/brand/LearningHubIndex.tsx` and the entry in `website/src/content/docs/learning-hub/index.md` aligned with the workshop-family landing page.
- Every overview ID and local lesson link must correspond to a real mirrored English markdown file. Verify cross-family links and images, then run `npm run website:build`.
- Do not fabricate First steps translations. Preserve attribution and the bundled MIT `LICENSE` in the First steps mirror.

## Step 5 — Update the sync state cache

Write an updated `copilot-workshops-sync-state.json` to `cache-memory` with:

```json
{
  "last_synced_sha": "<latest commit SHA from github-samples/copilot-workshops@main>",
  "last_synced_at": "<YYYY-MM-DD-HH-MM-SS>",
  "files_reviewed": ["<list of upstream files you compared>"],
  "files_updated": ["<list of local Learning Hub files you edited>"]
}
```

> [!NOTE]
> The cached `last_synced_sha` is an **optimization hint, not a source of truth**. Because a PR opened by this workflow may later be closed or rejected before it merges to `main`, never treat a matching SHA as proof that the mirror is current — Step 1 must independently confirm the checked-out mirror actually matches upstream before taking the no-op path. Advancing the SHA here is acceptable only because that consistency check will re-detect and re-open any update that a rejected PR left unmerged.

## Step 6 — Open a pull request

Create a pull request with your changes using the `create-pull-request` safe output. Use `main` as the base branch for all work related to this workflow. The PR body must include:

1. **What changed upstream** — a concise summary of the commits and file changes found in `github-samples/copilot-workshops`
2. **What was updated locally** — list each mirrored Learning Hub file or asset you created or edited and what changed, including any navigation wiring and any localized pages
3. **Source links** — links to the relevant upstream files or commits on `main`
4. A note that the markdown body of this workflow can be edited directly on GitHub.com without recompilation

If there is nothing to change after your analysis, do **not** open a PR. Instead, call the `noop` safe output.

## Guidelines

- The canonical course content lives in `website/src/content/docs/learning-hub/copilot-workshops/` (English) and `website/src/content/docs/<locale>/learning-hub/copilot-workshops/` (localized); do not recreate legacy duplicates elsewhere.
- Prefer changes within the course docs and `website/public/images/learning-hub/copilot-workshops/`.
- Only edit Learning Hub discovery files or `website/src/content/docs/learning-hub/index.md` when upstream course structure or navigation truly requires it.
- Preserve existing frontmatter fields; remove only the upstream `slug`, and add/update `authors` and `lastUpdated` (and `description` if genuinely warranted).
- Preserve GitHub admonition syntax exactly; the site renders it natively.
- Only mirror localized files that actually exist upstream; rely on Astro's fallback for the rest, and never fabricate translations.
- Keep the course source-faithful; avoid summaries or interpretive rewrites.
- The repository runs `codespell` in CI. Localized locale directories are already excluded in `.codespellrc`, but a new upstream English page may still trip a false positive on a valid word. **Never edit mirrored prose to satisfy the spell checker** — add the word to `ignore-words-list` in `.codespellrc` (with a comment explaining why) as part of the same PR.
- Do not auto-merge; the PR is for human review.
- If you are uncertain whether an upstream change warrants a Learning Hub update, err on the side of creating the PR — a human reviewer can always decline.
- Always call either `create-pull-request` or `noop` at the end of your run so the workflow clearly signals its outcome.
