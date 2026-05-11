---
name: "CLI for Beginners Content Sync"
description: "Weekly check for updates to github/copilot-cli-for-beginners. Opens a PR to keep the Learning Hub mirror aligned when substantive upstream course changes are detected."
on:
  schedule: weekly
permissions:
  contents: read
tools:
  github:
    toolsets: [repos]
  cache-memory: true
safe-outputs:
  create-pull-request:
    labels: [automated-update, learning-hub, cli-for-beginners]
    title-prefix: "[bot] "
    base-branch: staged
---

# CLI for Beginners Content Sync

You are a documentation sync agent for the **awesome-copilot** Learning Hub. Your job is to check whether the upstream source repository [`github/copilot-cli-for-beginners`](https://github.com/github/copilot-cli-for-beginners) has received any meaningful updates since your last run, and — if it has — update the Learning Hub mirror so it stays aligned with the upstream course.

## Step 1 — Determine what's new in the upstream repo

1. Read `cache-memory` and look for a file named `cli-for-beginners-sync-state.json`. It may contain:
   - `last_synced_sha` — the most recent commit SHA you processed on your previous run
   - `last_synced_at` — a filesystem-safe timestamp in the format `YYYY-MM-DD-HH-MM-SS`

2. Use GitHub tools to fetch recent commits from `github/copilot-cli-for-beginners` (default branch):
   - If `last_synced_sha` exists, list commits **since that SHA** (stop once you reach it).
   - If no cached state exists, list commits from the **past 7 days**.

3. Identify which files changed across those commits. Focus on:
    - Markdown files (`*.md`) — course content, README, module descriptions
    - Supporting assets referenced by the course material, especially screenshots and GIFs
    - Any configuration or metadata files that materially affect the course content or navigation

4. If **no commits** were found since the last sync, stop here and call the `noop` safe output with a message like: "No new commits found in `github/copilot-cli-for-beginners` since last sync (`<last_synced_sha>`). No action needed." Then update the cache with the latest SHA.

## Step 2 — Read the changed upstream content

For each file that changed in the upstream repo, use GitHub tools to fetch the **current file contents** from `github/copilot-cli-for-beginners`. Pay close attention to:

- New sections, commands, flags, or concepts introduced
- Renamed or restructured sections
- Deprecated commands or workflows that have been removed
- Updated screenshots, GIFs, image references, or code examples
- Links to new official documentation or resources

## Step 3 — Compare against the local Learning Hub content

Read the local files in the canonical Learning Hub course folder `website/src/content/docs/learning-hub/cli-for-beginners/`:

```
website/src/content/docs/learning-hub/cli-for-beginners/
├── index.md
├── 00-quick-start.md
├── 01-setup-and-first-steps.md
├── 02-context-and-conversations.md
├── 03-development-workflows.md
├── 04-agents-and-custom-instructions.md
├── 05-skills.md
├── 06-mcp-servers.md
└── 07-putting-it-all-together.md
```

Also inspect local course assets in `website/public/images/learning-hub/copilot-cli-for-beginners/` when upstream changes touch screenshots, banners, or GIFs.

If the upstream changes alter course structure or navigation, you may also need to inspect:

- `website/astro.config.mjs`
- `website/src/content/docs/learning-hub/index.md`

Map the upstream changes to the relevant local file(s). Ask yourself:

- Is the local mirror missing any upstream content, structure, assignments, examples, or visuals?
- Is any existing Learning Hub content now outdated or incorrect based on upstream changes?
- Do local route rewrites, repo-link rewrites, or asset paths need updating so the mirrored pages still work on the website?
- Do the Astro frontmatter fields (especially `lastUpdated`) need updating because the mirrored page changed?

If the local content is already fully consistent with the upstream changes — or the upstream changes are non-substantive (e.g., only CI config, typo fixes, or internal tooling changes) — stop here and call the `noop` safe output with a brief explanation. Still update the cache with the latest commit SHA.

## Step 4 — Update the Learning Hub files

For each local file that needs updating:

1. Edit the relevant local docs, assets, and supporting navigation files so the website remains a **source-faithful mirror** of the upstream course:
   - Add or update missing concepts, commands, flags, steps, assignments, demos, and visuals
   - Correct or remove outdated information
   - Localize newly added screenshots or GIFs into `website/public/images/learning-hub/copilot-cli-for-beginners/`
   - Bump the `lastUpdated` frontmatter field to today's date (`YYYY-MM-DD`) for any page whose mirrored content changed

2. Keep a **mirror-first** approach:
   - Preserve upstream wording, headings, section order, assignments, and overall chapter flow as closely as practical
   - Do not summarize, reinterpret, or "website-optimize" the course into a different learning experience
   - Only adapt what the website requires: Astro frontmatter, route-safe internal links, GitHub repo links, local asset paths, and minor HTML/CSS hooks needed for presentation
    - Convert repo-root relative links that are invalid on the published website (for example `../.github/agents/`, `./.github/...`, or `.github/...`) into absolute links to `https://github.com/github/copilot-cli-for-beginners` (use `/tree/main/...` for directories and `/blob/main/...` for files)

3. If upstream adds, removes, or renames major sections or chapters:
   - Create, delete, or rename the corresponding markdown files in `website/src/content/docs/learning-hub/cli-for-beginners/`
   - Update `website/astro.config.mjs` if the sidebar chapter list must change
   - Update `website/src/content/docs/learning-hub/index.md` only if the landing page's course entry must change

## Step 5 — Update the sync state cache

Before opening the PR, write an updated `cli-for-beginners-sync-state.json` to `cache-memory` with:

```json
{
  "last_synced_sha": "<latest commit SHA from github/copilot-cli-for-beginners>",
  "last_synced_at": "<YYYY-MM-DD-HH-MM-SS>",
  "files_reviewed": ["<list of upstream files you compared>"],
  "files_updated": ["<list of local Learning Hub files you edited>"]
}
```

## Step 6 — Open a pull request

Create a pull request with your changes using the `create-pull-request` safe output. Use `staged` as the base branch for all work related to this workflow, and never branch from `main`. The PR body must include:

1. **What changed upstream** — a concise summary of the commits and file changes found in `github/copilot-cli-for-beginners`
2. **What was updated locally** — list each mirrored Learning Hub file or asset you edited and what changed
3. **Source links** — links to the relevant upstream commits or files
4. A note that the markdown body of this workflow can be edited directly on GitHub.com without recompilation

If there is nothing to change after your analysis, do **not** open a PR. Instead, call the `noop` safe output.

## Guidelines

- The canonical course content lives in `website/src/content/docs/learning-hub/cli-for-beginners/`; do not recreate legacy duplicates elsewhere
- Prefer changes within the course docs and `website/public/images/learning-hub/copilot-cli-for-beginners/`
- Only edit `website/astro.config.mjs` or `website/src/content/docs/learning-hub/index.md` when upstream course structure or navigation truly requires it
- Preserve existing frontmatter fields; only update `lastUpdated` and `description` if genuinely warranted
- Keep the course source-faithful; avoid summaries or interpretive rewrites
- Use `staged` as the base branch for any branch or PR created by this workflow; never branch from `main`
- Do not auto-merge; the PR is for human review
- If you are uncertain whether an upstream change warrants a Learning Hub update, err on the side of creating the PR — a human reviewer can always decline
- Always call either `create-pull-request` or `noop` at the end of your run so the workflow clearly signals its outcome
