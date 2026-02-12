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
  "CC0-1.0", "WTFPL", "PostgreSQL",
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

async function cloneAndInstall(owner: string, repo: string, ref?: string): Promise<{ tmpPath: string; cleanup: () => Promise<void> }> {
  const { path: tmpPath, cleanup } = await tmpDir({ unsafeCleanup: true });
  const cloneUrl = `https://github.com/${owner}/${repo}.git`;
  const cloneArgs = ref ? `--branch ${ref} --depth 1` : "--depth 1";

  try {
    execSync(`git clone ${cloneArgs} ${cloneUrl} ${tmpPath}/repo`, {
      stdio: "pipe",
      timeout: 60000,
    });
    execSync("npm install --ignore-scripts --no-audit --no-fund", {
      cwd: path.join(tmpPath, "repo"),
      stdio: "pipe",
      timeout: 120000,
    });
  } catch (err: any) {
    await cleanup();
    throw new Error(`Failed to clone/install: ${err.message}`);
  }

  return { tmpPath: path.join(tmpPath, "repo"), cleanup };
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
  "Clone a GitHub repo, install npm dependencies, and return license information for all production dependencies",
  {
    owner: z.string().describe("GitHub repository owner"),
    repo: z.string().describe("GitHub repository name"),
    ref: z.string().optional().describe("Git ref (branch/tag) to check out"),
  },
  async ({ owner, repo, ref }) => {
    let cleanup: (() => Promise<void>) | undefined;
    try {
      const result = await cloneAndInstall(owner, repo, ref);
      cleanup = result.cleanup;

      const deps = await runLicenseChecker(result.tmpPath);

      // Build summary
      const byLicense: Record<string, number> = {};
      for (const dep of deps) {
        byLicense[dep.license] = (byLicense[dep.license] || 0) + 1;
      }

      const response = {
        owner,
        repo,
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
  "Clone a GitHub repo and generate a CycloneDX SBOM (Software Bill of Materials) from its npm dependencies",
  {
    owner: z.string().describe("GitHub repository owner"),
    repo: z.string().describe("GitHub repository name"),
    ref: z.string().optional().describe("Git ref (branch/tag) to check out"),
  },
  async ({ owner, repo, ref }) => {
    let cleanup: (() => Promise<void>) | undefined;
    try {
      const result = await cloneAndInstall(owner, repo, ref);
      cleanup = result.cleanup;

      const deps = await runLicenseChecker(result.tmpPath);

      // Read project package.json for metadata
      const pkgJsonPath = path.join(result.tmpPath, "package.json");
      const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, "utf-8"));

      // Build CycloneDX-like SBOM
      const sbom = {
        bomFormat: "CycloneDX",
        specVersion: "1.5",
        version: 1,
        metadata: {
          timestamp: new Date().toISOString(),
          component: {
            type: "application",
            name: pkgJson.name || `${owner}/${repo}`,
            version: pkgJson.version || "0.0.0",
            licenses: pkgJson.license ? [{ license: { id: normalizeLicense(pkgJson.license) } }] : [],
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
