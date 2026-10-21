---
name: sponsor-finder
description: Find which of a GitHub repository's dependencies are sponsorable via GitHub Sponsors. Uses deps.dev API for dependency resolution across npm, PyPI, Cargo, Go, RubyGems, Maven, and NuGet. Checks npm funding metadata, FUNDING.yml files, and web search. Verifies every link. Shows direct and transitive dependencies with OSSF Scorecard health data. Invoke with /sponsor followed by a GitHub owner/repo (e.g. "/sponsor expressjs/express").
---

# Sponsor Finder

Discover opportunities to support the open source maintainers behind your project's dependencies. Accepts a GitHub `owner/repo` (e.g. `/sponsor expressjs/express`), uses the deps.dev API for dependency resolution and project health data, and produces a friendly sponsorship report covering both direct and transitive dependencies.

## Your Workflow

When the user types `/sponsor {owner/repo}` or provides a repository in `owner/repo` format:

1. **Parse the input** — Extract `owner` and `repo`.
2. **Detect the ecosystem** — Fetch manifest to determine package name + version.
3. **Get full dependency tree** — deps.dev `GetDependencies` (one call).
4. **Resolve repos** — deps.dev `GetVersion` for each dep → `relatedProjects` gives GitHub repo.
5. **Get project health** — deps.dev `GetProject` for unique repos → OSSF Scorecard.
6. **Find funding links** — npm `funding` field, FUNDING.yml, web search fallback.
7. **Verify every link** — fetch each URL to confirm it's live.
8. **Group and report** — by funding destination, sorted by impact.

---

## Step 1: Detect Ecosystem and Package

Use `get_file_contents` to fetch the manifest from the target repo. Determine the ecosystem and extract the package name + latest version:

| File | Ecosystem | Package name from | Version from |
|------|-----------|-------------------|--------------|
| `package.json` | NPM | `name` field | `version` field |
| `requirements.txt` | PYPI | list of package names | use latest (omit version in deps.dev call) |
| `pyproject.toml` | PYPI | `[project.dependencies]` | use latest |
| `Cargo.toml` | CARGO | `[package] name` | `[package] version` |
| `go.mod` | GO | `module` path | extract from go.mod |
| `Gemfile` | RUBYGEMS | gem names | use latest |
| `pom.xml` | MAVEN | `groupId:artifactId` | `version` |

---

## Step 2: Get Full Dependency Tree (deps.dev)

**This is the key step.** Use `web_fetch` to call the deps.dev API:

```
https://api.deps.dev/v3/systems/{ECOSYSTEM}/packages/{PACKAGE}/versions/{VERSION}:dependencies
```

For example:
```
https://api.deps.dev/v3/systems/npm/packages/express/versions/5.2.1:dependencies
```

This returns a `nodes` array where each node has:
- `versionKey.name` — package name
- `versionKey.version` — resolved version
- `relation` — `"SELF"`, `"DIRECT"`, or `"INDIRECT"`

**This single call gives you the entire dependency tree** — both direct and transitive — with exact resolved versions. No need to parse lockfiles.

### URL encoding
Package names containing special characters must be percent-encoded:
- `@colors/colors` → `%40colors%2Fcolors`
- Encode `@` as `%40`, `/` as `%2F`

### For repos without a single root package
If the repo doesn't publish a package (e.g., it's an app not a library), fall back to reading `package.json` dependencies directly and calling deps.dev `GetVersion` for each.

---

## Step 3: Resolve Each Dependency to a GitHub Repo (deps.dev)

For each dependency from the tree, call deps.dev `GetVersion`:

```
https://api.deps.dev/v3/systems/{ECOSYSTEM}/packages/{NAME}/versions/{VERSION}
```

From the response, extract:
- **`relatedProjects`** → look for `relationType: "SOURCE_REPO"` → `projectKey.id` gives `github.com/{owner}/{repo}`
- **`links`** → look for `label: "SOURCE_REPO"` → `url` field

This works across **all ecosystems** — npm, PyPI, Cargo, Go, RubyGems, Maven, NuGet — with the same field structure.

### Efficiency rules
- Process in batches of **10 at a time**.
- Deduplicate — multiple packages may map to the same repo.
- Skip deps where no GitHub project is found (count as "unresolvable").

---

## Step 4: Get Project Health Data (deps.dev)

For each unique GitHub repo, call deps.dev `GetProject`:

```
https://api.deps.dev/v3/projects/github.com%2F{owner}%2F{repo}
```

From the response, extract:
- **`scorecard.checks`** → find the `"Maintained"` check → `score` (0–10)
- **`starsCount`** — popularity indicator
- **`license`** — project license
- **`openIssuesCount`** — activity indicator

Use the Maintained score to label project health:
- Score 7–10 → ⭐ Actively maintained
- Score 4–6 → ⚠️ Partially maintained
- Score 0–3 → 💤 Possibly unmaintained

### Efficiency rules
- Only fetch for **unique repos** (not per-package).
- Process in batches of **10 at a time**.
- This step is optional — skip if rate-limited and note in output.

---

## Step 5: Find Funding Links

For each unique GitHub repo, check for funding information using three sources in order:

### 5a: npm `funding` field (npm ecosystem only)
Use `web_fetch` on `https://registry.npmjs.org/{package-name}/latest` and check for a `funding` field:
- **String:** `"https://github.com/sponsors/sindresorhus"` → use as URL
- **Object:** `{"type": "opencollective", "url": "https://opencollective.com/express"}` → use `url`
- **Array:** collect all URLs

### 5b: `.github/FUNDING.yml` (repo-level, then org-level fallback)

**Step 5b-i — Per-repo check:**
Use `get_file_contents` to fetch `{owner}/{repo}` path `.github/FUNDING.yml`.

**Step 5b-ii — Org/user-level fallback:**
If 5b-i returned 404 (no FUNDING.yml in the repo itself), check the owner's default community health repo:
Use `get_file_contents` to fetch `{owner}/.github` path `FUNDING.yml`.

GitHub supports a [default community health files](https://docs.github.com/en/communities/setting-up-your-project-for-healthy-contributions/creating-a-default-community-health-file) convention: a `.github` repository at the user/org level provides defaults for all repos that lack their own. For example, `isaacs/.github/FUNDING.yml` applies to all `isaacs/*` repos.

Only look up each unique `{owner}/.github` repo **once** — reuse the result for all repos under that owner. Process in batches of **10 owners at a time**.

Parse the YAML (same for both 5b-i and 5b-ii):
- `github: [username]` → `https://github.com/sponsors/{username}`
- `open_collective: slug` → `https://opencollective.com/{slug}`
- `ko_fi: username` → `https://ko-fi.com/{username}`
- `patreon: username` → `https://patreon.com/{username}`
- `tidelift: platform/package` → `https://tidelift.com/subscription/pkg/{platform-package}`
- `custom: [urls]` → use as-is

### 5c: Web search fallback
For the **top 10 unfunded dependencies** (by number of transitive dependents), use `web_search`:
```
"{package name}" github sponsors OR open collective OR funding
```
Skip packages known to be corporate-maintained (React/Meta, TypeScript/Microsoft, @types/DefinitelyTyped).

### Efficiency rules
- **Check 5a and 5b for all deps.** Only use 5c for top unfunded ones.
- Skip npm registry calls for non-npm ecosystems.
- Deduplicate repos — check each repo only once.
- **One `{owner}/.github` check per unique owner** — reuse the result for all their repos.
- Process org-level lookups in batches of **10 owners at a time**.

---

## Step 6: Verify Every Link (CRITICAL)

**Before including ANY funding link, verify it exists.**

Use `web_fetch` on each funding URL:
- **Valid page** → ✅ Include
- **404 / "not found" / "not enrolled"** → ❌ Exclude
- **Redirect to valid page** → ✅ Include final URL

Verify in batches of **5 at a time**. Never present unverified links.

---

## Step 7: Output the Report

### Output discipline

**Minimize intermediate output during data gathering.** Do NOT announce each batch ("Batch 3 of 7…", "Now checking funding…"). Instead:
- Show **one brief status line** when starting each major phase (e.g., "Resolving 67 dependencies…", "Checking funding links…")
- **Collect ALL data before producing the report.** Never drip-feed partial tables.
- Output the final report as a **single cohesive block** at the end.

### Report template

```
## 💜 Sponsor Finder Report

**Repository:** {owner}/{repo} · {ecosystem} · {package}@{version}
**Scanned:** {date} · {total} deps ({direct} direct + {transitive} transitive)

---

### 🎯 Ways to Give Back

Sponsoring just {N} people/orgs supports {sponsorable} of your {total} dependencies — a great way to invest in the open source your project depends on.

1. **💜 @{user}** — {N} direct + {M} transitive deps · ⭐ Maintained
   {dep1}, {dep2}, {dep3}, ...
   https://github.com/sponsors/{user}

2. **🟠 Open Collective: {name}** — {N} direct + {M} transitive deps · ⭐ Maintained
   {dep1}, {dep2}, {dep3}, ...
   https://opencollective.com/{name}

3. **💜 @{user2}** — {N} direct dep · 💤 Low activity
   {dep1}
   https://github.com/sponsors/{user2}

---

### 📊 Coverage

- **{sponsorable}/{total}** dependencies have funding options ({percentage}%)
- **{destinations}** unique funding destinations
- **{unfunded_direct}** direct deps don't have funding set up yet ({top_names}, ...)
- All links verified ✅
```

### Report format rules

- **Lead with "🎯 Ways to Give Back"** — this is the primary output. Numbered list, sorted by total deps covered (descending).
- **Bare URLs on their own line** — not wrapped in markdown link syntax. This ensures they're clickable in any terminal emulator.
- **Inline dep names** — list the covered dependency names in a comma-separated line under each sponsor, so the user sees exactly what they're funding.
- **Health indicator inline** — show ⭐/⚠️/💤 next to each destination, not in a separate table column.
- **One "📊 Coverage" section** — compact stats. No separate "Verified Funding Links" table, no "No Funding Found" table.
- **Unfunded deps as a brief note** — just the count + top names. Frame as "don't have funding set up yet" rather than highlighting a gap. Never shame projects for not having funding — many maintainers prefer other forms of contribution.
- 💜 GitHub Sponsors, 🟠 Open Collective, ☕ Ko-fi, 🔗 Other
- Prioritize GitHub Sponsors links when multiple funding sources exist for the same maintainer.

---

## Error Handling

- If deps.dev returns 404 for the package → fall back to reading the manifest directly and resolving via registry APIs.
- If deps.dev is rate-limited → note partial results, continue with what was fetched.
- If `get_file_contents` returns 404 for the repo → inform user repo may not exist or is private.
- If link verification fails → exclude the link silently.
- Always produce a report even if partial — never fail silently.

---

## Critical Rules

1. **NEVER present unverified links.** Fetch every URL before showing it. 5 verified links > 20 guessed links.
2. **NEVER guess from training knowledge.** Always check — funding pages change over time.
3. **Always be encouraging, never shaming.** Frame results positively — celebrate what IS funded, and treat unfunded deps as an opportunity, not a failing. Not every project needs or wants financial sponsorship.
4. **Lead with action.** The "🎯 Ways to Give Back" section is the primary output — bare clickable URLs, grouped by destination.
5. **Use deps.dev as primary resolver.** Fall back to registry APIs only if deps.dev is unavailable.
6. **Always use GitHub MCP tools** (`get_file_contents`), `web_fetch`, and `web_search` — never clone or shell out.
7. **Be efficient.** Batch API calls, deduplicate repos, check each owner's `.github` repo only once.
8. **Focus on GitHub Sponsors.** Most actionable platform — show others but prioritize GitHub.
9. **Deduplicate by maintainer.** Group to show real impact of sponsoring one person.
10. **Show the actionable minimum.** Tell users the fewest sponsorships to support the most deps.
11. **Minimize intermediate output.** Don't announce each batch. Collect all data, then output one cohesive report.
