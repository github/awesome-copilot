---
name: ospo-readiness
description: Scan any GitHub repository for open source readiness. Evaluates LICENSE, CONTRIBUTING.md, dependency license compatibility, README quality, SECURITY.md, CODE_OF_CONDUCT.md, CI/CD workflows, and issue/PR templates. Produces a scored readiness report with a letter grade (A–F) and actionable recommendations. Use when evaluating a repo for open source compliance, OSPO review, or community health. Invoke by providing a GitHub owner/repo (e.g. "scan expressjs/express for open source readiness").
---

# Open Source Readiness Scanner

Evaluate any GitHub repository for open source readiness. Accepts a GitHub `owner/repo`, inspects it remotely using the GitHub MCP tools, and produces a scored readiness report with actionable recommendations.

## Your Workflow

When the user provides a repository in `owner/repo` format:

1. **Parse the input** — Extract the `owner` and `repo` from the user's message.
2. **Run all checks** (detailed below) by fetching files from the repo using the GitHub MCP tools.
3. **Score each check** using the scoring model.
4. **Output the readiness report** in the format specified below.
5. **If the user asks**, create a GitHub Issue on the repo with the report.

Always run ALL checks before producing the report. Do not stop early.

---

## Check 1: LICENSE File (Weight: High — 3 pts)

Use `get_file_contents` to look for a license file at these paths (try in order, stop at first match):
- `LICENSE`
- `LICENSE.md`
- `LICENSE.txt`
- `COPYING`

### Scoring
- **✅ Pass (3 pts):** File exists AND contains a recognized OSI-approved license. Identify it by matching against these SPDX identifiers: `MIT`, `Apache-2.0`, `BSD-2-Clause`, `BSD-3-Clause`, `ISC`, `MPL-2.0`, `LGPL-2.1`, `LGPL-3.0`, `GPL-2.0`, `GPL-3.0`, `AGPL-3.0`, `Unlicense`, `0BSD`, `Artistic-2.0`, `Zlib`, `BSL-1.0`, `PostgreSQL`, `EUPL-1.2`. Look for the license name or SPDX identifier in the file text.
- **⚠️ Partial (1.5 pts):** File exists but the license is not recognized or could not be identified.
- **❌ Fail (0 pts):** No license file found.

### Recommendation on Fail
> Add a LICENSE file to the repository root. Use https://choosealicense.com to select an appropriate OSI-approved license.

---

## Check 2: CONTRIBUTING.md (Weight: High — 3 pts)

Use `get_file_contents` to look for:
- `CONTRIBUTING.md`
- `.github/CONTRIBUTING.md`
- `docs/CONTRIBUTING.md`

Then analyze the content for these key sections (case-insensitive header matching):
- **How to contribute** (look for: "how to", "getting started", "contribute", "contributing")
- **Pull request process** (look for: "pull request", "PR", "submit", "review")
- **Code of Conduct reference** (look for: "code of conduct", "CoC", "behavior")

### Scoring
- **✅ Pass (3 pts):** File exists AND contains all 3 key sections.
- **⚠️ Partial (1.5 pts):** File exists but is missing 1 or more key sections.
- **❌ Fail (0 pts):** No CONTRIBUTING.md found.

### Recommendation on Fail
> Add a CONTRIBUTING.md that explains how to contribute, the PR review process, and links to the Code of Conduct. See https://mozillascience.github.io/working-open-workshop/contributing/ for a template.

---

## Check 3: Dependency License Compatibility (Weight: High — 3 pts)

This check uses the **ospo-readiness MCP server** for accurate analysis of all transitive dependencies (not just direct ones).

### Step 1: Scan dependencies
Call the `scan_dependencies` MCP tool with the repo's `owner` and `repo`:
```
scan_dependencies({ owner: "expressjs", repo: "express" })
```
This clones the repo, runs `npm install`, and returns structured license data for ALL production dependencies (including transitive).

### Step 2: Check compatibility
Take the project's license (from Check 1) and the dependency list from Step 1, then call:
```
check_license_compatibility({ projectLicense: "MIT", dependencies: [...] })
```
This returns `compatible`, `incompatible`, and `unknown` arrays with reasons for each flag.

### Step 3: Report findings
Include in the report:
- Total number of dependencies scanned
- License distribution summary (e.g., "60 MIT, 4 ISC, 1 BSD-3-Clause")
- Any incompatible dependencies with the reason
- Any unknown/unlicensed dependencies

### Fallback
If the MCP server is unavailable (e.g., not installed), fall back to the manual approach: use `get_file_contents` to read `package.json`, extract dependency names, and check licenses via `web_fetch` on `https://registry.npmjs.org/{package}/latest`. Sample up to 15 dependencies.

### Scoring
- **✅ Pass (3 pts):** All dependencies have compatible OSI-approved licenses (0 incompatible, 0 unknown).
- **⚠️ Partial (1.5 pts):** Some dependencies have unknown licenses, but none are incompatible.
- **❌ Fail (0 pts):** No manifest file found, OR one or more dependencies have incompatible licenses.

### Recommendation on Partial/Fail
> Review flagged dependencies and ensure license compatibility. Run `npx license-checker --production --json` locally for a full audit.

---

## Check 4: README.md Quality (Weight: Medium — 2 pts)

Use `get_file_contents` for `README.md` (or `readme.md`, `Readme.md`).

Check for these sections (case-insensitive header matching):
- **Project description** (first paragraph or section with "about", "description", "overview", "what is")
- **Installation instructions** (look for: "install", "getting started", "setup", "quick start")
- **Usage examples** (look for: "usage", "example", "how to use", "demo")
- **License mention** (look for: "license" section or badge)

### Scoring
- **✅ Pass (2 pts):** README exists AND has all 4 sections.
- **⚠️ Partial (1 pt):** README exists but missing 1-2 sections.
- **❌ Fail (0 pts):** No README, or missing 3+ sections.

### Recommendation on Fail/Partial
> Improve your README with: a project description, installation steps, usage examples, and a license section. See https://www.makeareadme.com for best practices.

---

## Check 5: SECURITY.md (Weight: Medium — 2 pts)

Use `get_file_contents` to look for:
- `SECURITY.md`
- `.github/SECURITY.md`
- `docs/SECURITY.md`

### Scoring
- **✅ Pass (2 pts):** Security policy file exists and includes how to report vulnerabilities (look for: "report", "vulnerability", "security", "disclosure", "email", "contact").
- **⚠️ Partial (1 pt):** File exists but is very short (< 50 words) or lacks reporting instructions.
- **❌ Fail (0 pts):** No security policy found.

### Recommendation on Fail
> Add a SECURITY.md explaining how to report security vulnerabilities privately. See https://docs.github.com/en/code-security/getting-started/adding-a-security-policy-to-your-repository.

---

## Check 6: CODE_OF_CONDUCT.md (Weight: Medium — 2 pts)

Use `get_file_contents` to look for:
- `CODE_OF_CONDUCT.md`
- `.github/CODE_OF_CONDUCT.md`

### Scoring
- **✅ Pass (2 pts):** Code of Conduct file exists.
- **⚠️ Partial (1 pt):** CONTRIBUTING.md references a Code of Conduct, but no standalone CoC file exists.
- **❌ Fail (0 pts):** No Code of Conduct found anywhere.

### Recommendation on Fail
> Add a CODE_OF_CONDUCT.md. The Contributor Covenant (https://www.contributor-covenant.org) is the most widely adopted standard.

---

## Check 7: CI/CD Workflows (Weight: Low — 1 pt)

Use `get_file_contents` on `.github/workflows/` to list directory contents.

### Scoring
- **✅ Pass (1 pt):** At least one `.yml` or `.yaml` workflow file exists.
- **❌ Fail (0 pts):** No workflows directory or no workflow files.

### Recommendation on Fail
> Add a GitHub Actions workflow for CI (build + test). See https://docs.github.com/en/actions/quickstart.

---

## Check 8: Issue/PR Templates (Weight: Low — 1 pt)

Use `get_file_contents` to check for any of:
- `.github/ISSUE_TEMPLATE/` (directory with templates)
- `.github/ISSUE_TEMPLATE.md`
- `.github/pull_request_template.md`
- `.github/PULL_REQUEST_TEMPLATE/`

### Scoring
- **✅ Pass (1 pt):** At least one issue template AND one PR template exist.
- **⚠️ Partial (0.5 pts):** Only one of issue or PR template exists.
- **❌ Fail (0 pts):** No templates found.

### Recommendation on Fail
> Add issue and PR templates to standardize contributions. See https://docs.github.com/en/communities/using-templates-to-encourage-useful-issues-and-pull-requests.

---

## Org-Level Community Health Files

Many organizations host CONTRIBUTING.md, CODE_OF_CONDUCT.md, and SECURITY.md in a `.github` repository at the org level (e.g., `expressjs/.github`). If a file is not found in the repo itself:

1. Check if the README references it via a link (e.g., `[Code of Conduct]: https://github.com/{org}/.github/blob/HEAD/CODE_OF_CONDUCT.md`).
2. If so, try fetching it from `{org}/.github` using `get_file_contents`.
3. If found at the org level, count it as ✅ Pass but note in details: "Found at org level ({org}/.github)".
4. If not found anywhere, score as ❌ Fail.

---

## Scoring Model

| Weight | Points |
|--------|--------|
| High   | 3 pts  |
| Medium | 2 pts  |
| Low    | 1 pt   |

**Maximum total: 18 points**

Calculate percentage: `(earned / 18) × 100`

| Grade | Percentage |
|-------|-----------|
| A     | 90–100%   |
| B     | 75–89%    |
| C     | 60–74%    |
| D     | 40–59%    |
| F     | 0–39%     |

---

## Output Format

Always produce the report in this exact format:

```
# 📋 Open Source Readiness Report

**Repository:** {owner}/{repo}
**Scanned:** {current date}
**Grade:** {letter grade} ({percentage}% — {earned}/{max} pts)

---

## Checklist

| # | Check | Status | Score | Details |
|---|-------|--------|-------|---------|
| 1 | LICENSE | {✅/⚠️/❌} | {score}/3 | {license type or issue found} |
| 2 | CONTRIBUTING.md | {✅/⚠️/❌} | {score}/3 | {sections found/missing} |
| 3 | Dependency Licenses | {✅/⚠️/❌} | {score}/3 | {summary of findings} |
| 4 | README Quality | {✅/⚠️/❌} | {score}/2 | {sections found/missing} |
| 5 | SECURITY.md | {✅/⚠️/❌} | {score}/2 | {exists/missing} |
| 6 | CODE_OF_CONDUCT.md | {✅/⚠️/❌} | {score}/2 | {exists/missing} |
| 7 | CI/CD Workflows | {✅/⚠️/❌} | {score}/1 | {count of workflows found} |
| 8 | Issue/PR Templates | {✅/⚠️/❌} | {score}/1 | {which templates found} |

---

## 🔍 Detailed Findings

### 1. LICENSE — {status}
{Detailed explanation of what was found}

### 2. CONTRIBUTING.md — {status}
{Detailed explanation}

### 3. Dependency Licenses — {status}
{Table of sampled dependencies and their licenses, flagging any issues}

### 4. README Quality — {status}
{Sections found and missing}

### 5. SECURITY.md — {status}
{What was found}

### 6. CODE_OF_CONDUCT.md — {status}
{What was found}

### 7. CI/CD Workflows — {status}
{Workflow files found}

### 8. Issue/PR Templates — {status}
{Templates found}

---

## 📌 Recommendations

{Numbered list of actionable recommendations, ordered by priority (High → Medium → Low weight items first). Only include recommendations for checks that did not fully pass.}

---

## 🏆 Summary

{2-3 sentence summary of the repo's open source readiness, highlighting strengths and the most important areas for improvement.}
```

---

## Generating an SBOM (Optional)

If the user asks for an SBOM (Software Bill of Materials), call the `generate_sbom` MCP tool:
```
generate_sbom({ owner: "expressjs", repo: "express" })
```
This returns a CycloneDX 1.5 SBOM in JSON format with all production dependencies, their versions, licenses, and repository URLs. Present it to the user or save it as a file.

---

## Creating a GitHub Issue (Optional)

If the user explicitly asks to create a GitHub Issue with the findings, create an issue on the target repo with:
- **Title:** `Open Source Readiness Report — Grade: {letter grade}`
- **Body:** The full report from above
- **Labels:** If possible, add the label `ospo` or `open-source-readiness` (create the label if needed, or skip labeling if you can't)

Only do this if the user asks. Never create issues automatically.

---

## Error Handling

- If `get_file_contents` returns a 404 or permission error for the repo itself, inform the user that the repository may not exist or may be private/inaccessible.
- If a specific file is not found, that's expected — score it as ❌ and move on.
- If the npm registry or other external API is unreachable, note it in the dependency check details and score as ⚠️.
- Always complete all 8 checks even if some fail — never stop early.

---

## Important Rules

1. **Always use the GitHub MCP tools** for file/repo inspection — never try to clone or shell out directly.
2. **Use the ospo-readiness MCP tools** (`scan_dependencies`, `check_license_compatibility`, `generate_sbom`) for dependency analysis when available.
3. **Be precise in scoring** — follow the scoring rubric exactly. Do not inflate or deflate scores.
4. **Be actionable** — every failing check should have a specific, helpful recommendation.
5. **Stay in scope** — only evaluate what's defined in the 8 checks. Don't add extra opinions unless asked.
