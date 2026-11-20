#!/usr/bin/env node
"use strict";

// Built-ins only: verify all runtime files before loading any bundled dependency.
const fs = require("node:fs");
const path = require("node:path");
const { createHash } = require("node:crypto");

try {
  if (Number(process.versions.node.split(".")[0]) < 22) {
    throw new Error("Node.js 22 or newer is required");
  }
  const names = ["launch.cjs", "server.cjs", "THIRD_PARTY_LICENSES.txt"];
  const read = (name, maxBytes) => {
    const filename = path.join(__dirname, name);
    const stat = fs.lstatSync(filename);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size > maxBytes) {
      throw new Error(`Invalid packaged file: ${name}`);
    }
    return fs.readFileSync(filename);
  };
  const manifest = JSON.parse(read("manifest.json", 16_384).toString("utf8"));
  if (manifest.schemaVersion !== 1 || manifest.entry !== "server.cjs" ||
      !/^\d+\.\d+\.\d+$/.test(manifest.skillVersion) ||
      !/^\d+\.\d+\.\d+$/.test(manifest.mcpVersion) ||
      !/^[a-f0-9]{64}$/.test(manifest.sourceDigest) ||
      !manifest.files || typeof manifest.files !== "object" ||
      Object.keys(manifest.files).sort().join(",") !== [...names].sort().join(",")) {
    throw new Error("Invalid runtime manifest");
  }
  for (const name of names) {
    const expected = manifest.files[name];
    if (typeof expected !== "string" || !/^[a-f0-9]{64}$/.test(expected) ||
        createHash("sha256").update(read(name, 8_388_608)).digest("hex") !== expected) {
      throw new Error(`Packaged file checksum mismatch: ${name}`);
    }
  }
  if (process.argv.length === 3 && process.argv[2] === "--verify") {
    process.stdout.write(`${JSON.stringify({
      ok: true, skillVersion: manifest.skillVersion, mcpVersion: manifest.mcpVersion,
      sourceDigest: manifest.sourceDigest,
    })}\n`);
  } else if (process.argv.length !== 2) {
    throw new Error("Usage: node launch.cjs [--verify]");
  } else {
    require("./server.cjs");
  }
} catch (error) {
  process.stderr.write(`${JSON.stringify({
    ok: false, error: {
      code: "PACKAGE_INTEGRITY_ERROR",
      message: error instanceof Error ? error.message : "Invalid Skill runtime",
    },
  })}\n`);
  process.exitCode = 1;
}
