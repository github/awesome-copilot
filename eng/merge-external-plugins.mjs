#!/usr/bin/env node

/**
 * Merge external plugin entries from `plugins/external.json` into the
 * marketplace.json produced by `apm pack`.
 *
 * Background: `apm pack` reads the `marketplace:` block in `apm.yml` and
 * emits `marketplace.json` with all 53 LOCAL plugins (declared as
 * `source: ./plugins/<name>`). The Anthropic spec source schema for
 * remote plugins differs from the legacy `external.json` shape (which
 * uses `source.source` / `source.repo` keys instead of `source.type` /
 * `source.repository`). To preserve byte-compatibility for downstream
 * consumers of the existing `marketplace.json`, this script appends
 * the external entries verbatim after `apm pack` runs.
 *
 * Once the external schema migration is finished (tracked as follow-up F3),
 * external entries can move into `apm.yml` directly and this script can
 * be deleted.
 */

import fs from "fs";
import path from "path";
import { ROOT_FOLDER } from "./constants.mjs";

const MARKETPLACE_PATH = path.join(ROOT_FOLDER, ".github/plugin", "marketplace.json");
const EXTERNAL_PATH = path.join(ROOT_FOLDER, "plugins", "external.json");

function main() {
  if (!fs.existsSync(MARKETPLACE_PATH)) {
    console.error(`Error: ${MARKETPLACE_PATH} not found. Run 'apm pack' first.`);
    process.exit(1);
  }

  const marketplace = JSON.parse(fs.readFileSync(MARKETPLACE_PATH, "utf8"));

  if (!Array.isArray(marketplace.plugins)) {
    console.error("Error: marketplace.json missing 'plugins' array");
    process.exit(1);
  }

  if (!fs.existsSync(EXTERNAL_PATH)) {
    console.log("No external.json found; nothing to merge.");
    return;
  }

  const externals = JSON.parse(fs.readFileSync(EXTERNAL_PATH, "utf8"));
  if (!Array.isArray(externals)) {
    console.error("Error: external.json must be a JSON array");
    process.exit(1);
  }

  const existing = new Set(marketplace.plugins.map((p) => p.name));
  let added = 0;
  for (const ext of externals) {
    if (existing.has(ext.name)) {
      console.warn(`Skipping external '${ext.name}': already present in marketplace.json`);
      continue;
    }
    marketplace.plugins.push(ext);
    added++;
  }

  // Sort plugins alphabetically by name so external + local entries
  // interleave in a stable, review-friendly order (matches the legacy
  // generator's ordering).
  marketplace.plugins.sort((a, b) => (a.name || "").localeCompare(b.name || ""));

  fs.writeFileSync(
    MARKETPLACE_PATH,
    JSON.stringify(marketplace, null, 2) + "\n",
    "utf8"
  );
  console.log(`Merged ${added} external plugin(s) into marketplace.json (total: ${marketplace.plugins.length}).`);
}

main();
