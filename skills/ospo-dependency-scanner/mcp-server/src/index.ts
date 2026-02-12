#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { execSync } from "child_process";
import * as path from "path";
import * as fs from "fs";
import { dir as tmpDir } from "tmp-promise";

// License compatibility data
const COPYLEFT_LICENSES = new Set([
  "GPL-2.0", "GPL-2.0-only", "GPL-2.0-or-later", "GPL-2.0+",
  "GPL-3.0", "GPL-3.0-only", "GPL-3.0-or-later", "GPL-3.0+",
  "AGPL-3.0", "AGPL-3.0-only", "AGPL-3.0-or-later",
  "LGPL-2.1", "LGPL-2.1-only", "LGPL-2.1-or-later",
  "LGPL-3.0", "LGPL-3.0-only", "LGPL-3.0-or-later",
  "MPL-2.0", "EUPL-1.2", "CECILL-2.1",
]);

const PERMISSIVE_LICENSES = new Set([
  "MIT", "Apache-2.0", "BSD-2-Clause", "BSD-3-Clause", "ISC",
  "Unlicense", "0BSD", "Artistic-2.0", "Zlib", "BSL-1.0",
  "CC0-1.0", "WTFPL", "PostgreSQL", "Python-2.0", "HPND",
]);

const OSI_APPROVED = new Set([...COPYLEFT_LICENSES, ...PERMISSIVE_LICENSES]);

function normalizeLicense(license: string): string {
  const l = license.trim();
  // Handle common variations
  const map: Record<string, string> = {
    "MIT": "MIT",
    "ISC": "ISC",
    "Apache 2.0": "Apache-2.0",
    "Apache-2.0": "Apache-2.0",
    "Apache License 2.0": "Apache-2.0",
    "BSD-2-Clause": "BSD-2-Clause",
    "BSD-3-Clause": "BSD-3-Clause",
    "BSD": "BSD-3-Clause",
    "GPL-2.0": "GPL-2.0",
    "GPL-3.0": "GPL-3.0",
    "LGPL-2.1": "LGPL-2.1",
    "LGPL-3.0": "LGPL-3.0",
    "MPL-2.0": "MPL-2.0",
    "Unlicense": "Unlicense",
    "UNLICENSED": "UNLICENSED",
    "CC0-1.0": "CC0-1.0",
    "0BSD": "0BSD",
    "Python-2.0": "Python-2.0",
    "BlueOak-1.0.0": "BlueOak-1.0.0",
    // Python ecosystem variations
    "Mozilla Public License 2.0 (MPL 2.0)": "MPL-2.0",
    "Apache Software License": "Apache-2.0",
    "Apache License, Version 2.0": "Apache-2.0",
    "BSD License": "BSD-3-Clause",
    "MIT License": "MIT",
    "ISC License": "ISC",
    "GNU General Public License v3 (GPLv3)": "GPL-3.0",
    "GNU General Public License v2 (GPLv2)": "GPL-2.0",
    "GNU Lesser General Public License v3 (LGPLv3)": "LGPL-3.0",
    "GNU Lesser General Public License v2 or later (LGPLv2+)": "LGPL-2.1-or-later",
    "GNU Affero General Public License v3": "AGPL-3.0",
    "GNU Affero General Public License v3 or later (AGPLv3+)": "AGPL-3.0-or-later",
    "Python Software Foundation License": "Python-2.0",
    "Historical Permission Notice and Disclaimer (HPND)": "HPND",
  };
  return map[l] || l;
}

interface DepInfo {
  name: string;
  version: string;
  license: string;
  repository: string;
}

interface LicenseCheckerResult {
  [key: string]: {
    licenses: string;
    repository?: string;
    licenseFile?: string;
  };
}

async function cloneRepo(owner: string, repo: string, ref?: string): Promise<{ repoPath: string; cleanup: () => Promise<void> }> {
  const { path: tmpPath, cleanup } = await tmpDir({ unsafeCleanup: true });
  const cloneUrl = `https://github.com/${owner}/${repo}.git`;
  const cloneArgs = ref ? `--branch ${ref} --depth 1` : "--depth 1";

  try {
    execSync(`git clone ${cloneArgs} ${cloneUrl} ${tmpPath}/repo`, {
      stdio: "pipe",
      timeout: 60000,
    });
  } catch (err: any) {
    await cleanup();
    throw new Error(`Failed to clone: ${err.message}`);
  }

  return { repoPath: path.join(tmpPath, "repo"), cleanup };
}

type Ecosystem = "npm" | "python" | "unknown";

function detectEcosystem(repoPath: string): Ecosystem {
  if (fs.existsSync(path.join(repoPath, "package.json"))) return "npm";
  if (
    fs.existsSync(path.join(repoPath, "requirements.txt")) ||
    fs.existsSync(path.join(repoPath, "pyproject.toml")) ||
    fs.existsSync(path.join(repoPath, "setup.py")) ||
    fs.existsSync(path.join(repoPath, "Pipfile"))
  ) return "python";
  return "unknown";
}

function hasPython(): boolean {
  try {
    execSync("python3 --version", { stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

async function installAndScanNpm(repoPath: string): Promise<DepInfo[]> {
  execSync("npm install --ignore-scripts --no-audit --no-fund", {
    cwd: repoPath,
    stdio: "pipe",
    timeout: 120000,
  });
  return runLicenseChecker(repoPath);
}

async function installAndScanPython(repoPath: string): Promise<DepInfo[]> {
  if (!hasPython()) {
    throw new Error("Python/pip not found. Install python3 and pip to enable Python dependency scanning.");
  }

  const venvPath = path.join(repoPath, ".ospo-venv");

  // Create venv and install deps
  execSync(`python3 -m venv ${venvPath}`, { cwd: repoPath, stdio: "pipe", timeout: 30000 });
  const pip = path.join(venvPath, "bin", "pip");

  // Determine install source
  if (fs.existsSync(path.join(repoPath, "requirements.txt"))) {
    execSync(`${pip} install -r requirements.txt --quiet --no-warn-script-location 2>/dev/null || true`, {
      cwd: repoPath, stdio: "pipe", timeout: 180000,
    });
  } else if (fs.existsSync(path.join(repoPath, "pyproject.toml"))) {
    execSync(`${pip} install . --quiet --no-warn-script-location 2>/dev/null || true`, {
      cwd: repoPath, stdio: "pipe", timeout: 180000,
    });
  } else if (fs.existsSync(path.join(repoPath, "setup.py"))) {
    execSync(`${pip} install . --quiet --no-warn-script-location 2>/dev/null || true`, {
      cwd: repoPath, stdio: "pipe", timeout: 180000,
    });
  } else if (fs.existsSync(path.join(repoPath, "Pipfile"))) {
    execSync(`${pip} install pipenv --quiet --no-warn-script-location && ${venvPath}/bin/pipenv install --skip-lock 2>/dev/null || true`, {
      cwd: repoPath, stdio: "pipe", timeout: 180000,
    });
  }

  // Install pip-licenses and run it
  execSync(`${pip} install pip-licenses --quiet --no-warn-script-location`, {
    cwd: repoPath, stdio: "pipe", timeout: 60000,
  });

  const output = execSync(`${venvPath}/bin/pip-licenses --format=json --with-urls`, {
    cwd: repoPath, stdio: "pipe", timeout: 30000,
  }).toString();

  const pipLicenses: Array<{ Name: string; Version: string; License: string; URL: string }> = JSON.parse(output);

  return pipLicenses
    .filter((p) => p.Name !== "pip" && p.Name !== "setuptools" && p.Name !== "pip-licenses" && p.Name !== "wheel")
    .map((p) => ({
      name: p.Name,
      version: p.Version,
      license: normalizeLicense(p.License || "UNKNOWN"),
      repository: p.URL || "",
    }));
}

async function runLicenseChecker(repoPath: string): Promise<DepInfo[]> {
  return new Promise((resolve, reject) => {
    const checker = require("license-checker");
    checker.init({ start: repoPath, json: true, production: true }, (err: Error, packages: LicenseCheckerResult) => {
      if (err) return reject(err);

      const deps: DepInfo[] = [];
      for (const [key, val] of Object.entries(packages)) {
        const atIndex = key.lastIndexOf("@");
        if (atIndex <= 0) continue;
        const name = key.substring(0, atIndex);
        const version = key.substring(atIndex + 1);
        deps.push({
          name,
          version,
          license: normalizeLicense(val.licenses || "UNKNOWN"),
          repository: val.repository || "",
        });
      }
      resolve(deps);
    });
  });
}

// Create server
const server = new McpServer({
  name: "ospo-readiness-mcp",
  version: "1.0.0",
});

// Tool 1: scan_dependencies
server.tool(
  "scan_dependencies",
  "Clone a GitHub repo, install dependencies, and return license information for all production dependencies. Supports npm (Node.js) and Python (pip) ecosystems.",
  {
    owner: z.string().describe("GitHub repository owner"),
    repo: z.string().describe("GitHub repository name"),
    ref: z.string().optional().describe("Git ref (branch/tag) to check out"),
  },
  async ({ owner, repo, ref }) => {
    let cleanup: (() => Promise<void>) | undefined;
    try {
      const result = await cloneRepo(owner, repo, ref);
      cleanup = result.cleanup;

      const ecosystem = detectEcosystem(result.repoPath);
      let deps: DepInfo[];

      if (ecosystem === "npm") {
        deps = await installAndScanNpm(result.repoPath);
      } else if (ecosystem === "python") {
        deps = await installAndScanPython(result.repoPath);
      } else {
        return {
          content: [{ type: "text" as const, text: JSON.stringify({
            error: "No supported manifest found. Supported: package.json (npm), requirements.txt / pyproject.toml / setup.py / Pipfile (Python)",
            owner, repo,
          }, null, 2) }],
          isError: true,
        };
      }

      // Build summary
      const byLicense: Record<string, number> = {};
      for (const dep of deps) {
        byLicense[dep.license] = (byLicense[dep.license] || 0) + 1;
      }

      const response = {
        owner,
        repo,
        ecosystem,
        total: deps.length,
        dependencies: deps,
        summary: { byLicense },
      };

      return { content: [{ type: "text" as const, text: JSON.stringify(response, null, 2) }] };
    } catch (err: any) {
      return { content: [{ type: "text" as const, text: `Error scanning dependencies: ${err.message}` }], isError: true };
    } finally {
      if (cleanup) await cleanup();
    }
  }
);

// Tool 2: check_license_compatibility
server.tool(
  "check_license_compatibility",
  "Check if dependency licenses are compatible with the project's license",
  {
    projectLicense: z.string().describe("The project's SPDX license identifier (e.g. MIT, Apache-2.0)"),
    dependencies: z.array(z.object({
      name: z.string(),
      license: z.string(),
    })).describe("Array of dependencies with their license identifiers"),
  },
  async ({ projectLicense, dependencies }) => {
    const normalized = normalizeLicense(projectLicense);
    const isProjectPermissive = PERMISSIVE_LICENSES.has(normalized);

    const compatible: Array<{ name: string; license: string }> = [];
    const incompatible: Array<{ name: string; license: string; reason: string }> = [];
    const unknown: Array<{ name: string; license: string }> = [];

    for (const dep of dependencies) {
      const depLicense = normalizeLicense(dep.license);

      if (depLicense === "UNKNOWN" || depLicense === "UNLICENSED" || depLicense === "") {
        unknown.push({ name: dep.name, license: dep.license });
      } else if (isProjectPermissive && COPYLEFT_LICENSES.has(depLicense)) {
        incompatible.push({
          name: dep.name,
          license: depLicense,
          reason: `Copyleft license ${depLicense} is incompatible with permissive project license ${normalized}`,
        });
      } else if (!OSI_APPROVED.has(depLicense)) {
        unknown.push({ name: dep.name, license: depLicense });
      } else {
        compatible.push({ name: dep.name, license: depLicense });
      }
    }

    const response = {
      projectLicense: normalized,
      totalChecked: dependencies.length,
      compatible,
      incompatible,
      unknown,
      summary: {
        compatible: compatible.length,
        incompatible: incompatible.length,
        unknown: unknown.length,
      },
    };

    return { content: [{ type: "text" as const, text: JSON.stringify(response, null, 2) }] };
  }
);

// Tool 3: generate_sbom
server.tool(
  "generate_sbom",
  "Clone a GitHub repo and generate a CycloneDX SBOM (Software Bill of Materials) from its dependencies. Supports npm and Python.",
  {
    owner: z.string().describe("GitHub repository owner"),
    repo: z.string().describe("GitHub repository name"),
    ref: z.string().optional().describe("Git ref (branch/tag) to check out"),
  },
  async ({ owner, repo, ref }) => {
    let cleanup: (() => Promise<void>) | undefined;
    try {
      const result = await cloneRepo(owner, repo, ref);
      cleanup = result.cleanup;

      const ecosystem = detectEcosystem(result.repoPath);
      let deps: DepInfo[];

      if (ecosystem === "npm") {
        deps = await installAndScanNpm(result.repoPath);
      } else if (ecosystem === "python") {
        deps = await installAndScanPython(result.repoPath);
      } else {
        return {
          content: [{ type: "text" as const, text: "No supported manifest found (npm or Python)." }],
          isError: true,
        };
      }

      // Read project metadata
      let projectName = `${owner}/${repo}`;
      let projectVersion = "0.0.0";
      let projectLicense = "";

      if (ecosystem === "npm" && fs.existsSync(path.join(result.repoPath, "package.json"))) {
        const pkgJson = JSON.parse(fs.readFileSync(path.join(result.repoPath, "package.json"), "utf-8"));
        projectName = pkgJson.name || projectName;
        projectVersion = pkgJson.version || projectVersion;
        projectLicense = pkgJson.license || "";
      }

      const sbom = {
        bomFormat: "CycloneDX",
        specVersion: "1.5",
        version: 1,
        metadata: {
          timestamp: new Date().toISOString(),
          component: {
            type: "application",
            name: projectName,
            version: projectVersion,
            licenses: projectLicense ? [{ license: { id: normalizeLicense(projectLicense) } }] : [],
          },
          tools: [{ name: "ospo-readiness-mcp", version: "1.0.0" }],
        },
        components: deps.map((dep) => ({
          type: "library",
          name: dep.name,
          version: dep.version,
          licenses: [{ license: { id: dep.license } }],
          externalReferences: dep.repository
            ? [{ type: "vcs", url: dep.repository }]
            : [],
        })),
      };

      return { content: [{ type: "text" as const, text: JSON.stringify(sbom, null, 2) }] };
    } catch (err: any) {
      return { content: [{ type: "text" as const, text: `Error generating SBOM: ${err.message}` }], isError: true };
    } finally {
      if (cleanup) await cleanup();
    }
  }
);

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
