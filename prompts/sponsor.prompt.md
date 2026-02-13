---
name: 'Sponsor Finder'
description: 'Find which of your dependencies accept GitHub Sponsors. Scans direct and transitive dependencies, resolves source repos, checks funding metadata, and verifies every link. Usage: /sponsor owner/repo'
---

## 💜 Sponsor Finder

Scan a GitHub repository's dependencies and find which ones accept sponsorship via GitHub Sponsors, Open Collective, or other platforms.

### What to do

The user will provide a repository in `owner/repo` format (or you can detect it from the current workspace).

Follow the **sponsor-finder** skill instructions to:

1. **Detect the ecosystem** — fetch `package.json`, `requirements.txt`, `Cargo.toml`, `go.mod`, `Gemfile`, or `pom.xml` from the repo.
2. **Get the full dependency tree** — call `https://api.deps.dev/v3/systems/{ECOSYSTEM}/packages/{PACKAGE}/versions/{VERSION}:dependencies` to get all direct + transitive deps in one call.
3. **Resolve each dep to a GitHub repo** — call deps.dev `GetVersion` for each dep, extract `relatedProjects` with `relationType: "SOURCE_REPO"`.
4. **Get project health** — call deps.dev `GetProject` for unique repos to get OSSF Scorecard data.
5. **Find funding links** — check npm `funding` field, `.github/FUNDING.yml`, and web search fallback.
6. **Verify every link** — fetch each funding URL to confirm it's live. Never show unverified links.
7. **Group by funding destination** — show maintainers sorted by how many deps they cover.

### Output format

Produce a report with:
- **Summary** — total deps, resolved count, sponsorable count, % coverage
- **Verified Funding Links table** — dependency, repo, funding platform, direct vs transitive (✅/⛓️), how verified
- **Funding Destinations table** — grouped by maintainer/org, dep count, health score, sponsor link
- **No Verified Funding Found** — top unfunded direct deps with reasons
- **Actionable summary** — "Sponsoring just N people/orgs covers all M funded deps"

### Key rules

- **Never present unverified links.** Fetch every URL before showing it.
- **Never guess from training data.** Always check live — funding pages change.
- Use 💜 GitHub Sponsors, 🟠 Open Collective, ☕ Ko-fi, 🔗 Other.
- Use ✅ for direct deps, ⛓️ for transitive.
- Use ⭐ Maintained (7+), ⚠️ Partial (4-6), 💤 Low (0-3) for health scores.

### If no repo is provided

If the user just types `/sponsor` without specifying a repo:
1. Check if there's a `package.json`, `Cargo.toml`, `go.mod`, etc. in the current workspace.
2. If found, extract the package name and run the scan on it.
3. If not found, ask the user: "Which repository would you like to scan? Provide an `owner/repo` (e.g., `expressjs/express`)."
