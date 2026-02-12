---
name: ospo-dependency-scanner
description: Scan npm dependencies for license compliance. Clones a GitHub repo, installs dependencies, and analyzes all transitive dependency licenses using license-checker. Checks compatibility with the project license, flags copyleft-in-permissive conflicts, and generates CycloneDX SBOMs. Use when the user wants to audit dependency licenses, check license compatibility, or generate an SBOM for a Node.js project.
---

# OSPO Dependency Scanner

Scan any GitHub repository's npm dependencies for license compliance. This skill uses an MCP server that clones the repo locally, runs `npm install`, and analyzes all production dependencies (including transitive) using `license-checker`.

## Available MCP Tools

### `scan_dependencies`
Clone a GitHub repo, install npm dependencies, and return license information for all production dependencies.

**Input:**
- `owner` (string) — GitHub repository owner
- `repo` (string) — GitHub repository name
- `ref` (string, optional) — Git ref (branch/tag) to check out

**Output:** JSON with:
- `total` — number of dependencies found
- `dependencies` — array of `{ name, version, license, repository }` for every production dependency
- `summary.byLicense` — count of dependencies grouped by license type

**Example:**
```
scan_dependencies({ owner: "expressjs", repo: "express" })
→ { total: 65, dependencies: [...], summary: { byLicense: { MIT: 60, ISC: 4, "BSD-3-Clause": 1 } } }
```

### `check_license_compatibility`
Check if dependency licenses are compatible with the project's license.

**Input:**
- `projectLicense` (string) — The project's SPDX license identifier (e.g. `MIT`, `Apache-2.0`)
- `dependencies` (array) — Array of `{ name, license }` objects (use output from `scan_dependencies`)

**Output:** JSON with:
- `compatible` — dependencies with compatible licenses
- `incompatible` — dependencies with incompatible licenses + reason (e.g., copyleft in permissive project)
- `unknown` — dependencies with unknown or unrecognized licenses
- `summary` — counts of each category

**Example:**
```
check_license_compatibility({
  projectLicense: "MIT",
  dependencies: [
    { name: "accepts", license: "MIT" },
    { name: "some-gpl-pkg", license: "GPL-3.0" }
  ]
})
→ { compatible: [{ name: "accepts", license: "MIT" }],
    incompatible: [{ name: "some-gpl-pkg", license: "GPL-3.0", reason: "Copyleft license GPL-3.0 is incompatible with permissive project license MIT" }],
    unknown: [] }
```

### `generate_sbom`
Clone a GitHub repo and generate a CycloneDX 1.5 SBOM (Software Bill of Materials) from its npm dependencies.

**Input:**
- `owner` (string) — GitHub repository owner
- `repo` (string) — GitHub repository name
- `ref` (string, optional) — Git ref (branch/tag) to check out

**Output:** CycloneDX 1.5 JSON document with:
- `metadata` — project name, version, license, scan timestamp
- `components` — every production dependency with name, version, license, and VCS URL

## Typical Workflow

When a user asks to scan dependencies or check license compliance:

1. **Call `scan_dependencies`** with the repo's owner and name
2. **Determine the project license** from the scan results (the project itself is included in the output) or ask the user
3. **Call `check_license_compatibility`** with the project license and the dependency list
4. **Present results** in a clear format:
   - Total dependencies scanned
   - License distribution (e.g., "60 MIT, 4 ISC, 1 BSD-3-Clause")
   - ⚠️ Any incompatible dependencies with reasons
   - ❓ Any unknown/unlicensed dependencies
   - ✅ Overall compatibility verdict

If the user asks for an SBOM, call `generate_sbom` and present or save the CycloneDX JSON.

## Supported Ecosystems

Currently supports **Node.js/npm** only. The MCP server:
- Clones the repo to a temp directory
- Runs `npm install --ignore-scripts --production`
- Uses `license-checker` to analyze `node_modules`
- Cleans up the temp directory after scanning

Future: Python (pip-licenses), Go (go-licenses), Rust (cargo-license).

## Error Handling

- If the repo doesn't exist or is private, the tool returns an error message — inform the user.
- If `npm install` fails (e.g., no `package.json`), the tool returns an error — note that this skill only works for npm projects.
- Network issues during clone will timeout after 60 seconds.

## Example Output Format

```
## 📦 Dependency License Scan: expressjs/express

**Total dependencies:** 65 (production, including transitive)

### License Distribution
| License | Count |
|---------|-------|
| MIT | 60 |
| ISC | 4 |
| BSD-3-Clause | 1 |

### Compatibility with MIT License
- ✅ **65 compatible** — all dependencies use permissive licenses
- ⚠️ **0 incompatible**
- ❓ **0 unknown**

**Verdict:** ✅ All dependency licenses are compatible with MIT.
```
