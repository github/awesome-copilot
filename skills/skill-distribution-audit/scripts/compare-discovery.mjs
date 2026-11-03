#!/usr/bin/env node
import fs from "node:fs";
import { fileURLToPath } from "node:url";

function countIdentities(values, label) {
  if (!Array.isArray(values)) throw new TypeError(`${label} must be a JSON array`);
  const counts = new Map();
  for (const value of values) {
    if (typeof value !== "string" || !value.trim() || value !== value.trim()) {
      throw new TypeError(`${label} identities must be nonempty strings without surrounding whitespace`);
    }
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return counts;
}

export function compareDiscovery(expected, observed) {
  const expectedCounts = countIdentities(expected, "expected");
  const observedCounts = countIdentities(observed, "observed");
  const missing = [...expectedCounts.keys()].filter(id => !observedCounts.has(id)).sort();
  const unexpected = [...observedCounts.keys()].filter(id => !expectedCounts.has(id)).sort();
  const duplicates = counts => [...counts.keys()].sort()
    .filter(id => counts.get(id) > 1).map(id => ({ id, count: counts.get(id) }));
  const expectedDuplicates = duplicates(expectedCounts);
  const observedDuplicates = duplicates(observedCounts);
  return {
    match: !missing.length && !unexpected.length && !expectedDuplicates.length && !observedDuplicates.length,
    counts: {
      expected: expected.length, observed: observed.length,
      expectedUnique: expectedCounts.size, observedUnique: observedCounts.size,
    },
    missing,
    unexpected,
    duplicates: { expected: expectedDuplicates, observed: observedDuplicates },
  };
}

function isCliEntry() {
  if (!process.argv[1]) return false;
  try {
    return fs.realpathSync(process.argv[1]) === fs.realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
}

if (isCliEntry()) {
  try {
    if (process.argv.length !== 4) {
      throw new Error("Usage: node compare-discovery.mjs <expected.json> <observed.json>");
    }
    const expected = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
    const observed = JSON.parse(fs.readFileSync(process.argv[3], "utf8"));
    const report = compareDiscovery(expected, observed);
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    process.exitCode = report.match ? 0 : 1;
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 2;
  }
}
