import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const out = path.join(root, "outputs");
const details = {};
for (const stage of ["before", "after"]) {
  const source = JSON.parse(fs.readFileSync(path.join(root, "inputs", `${stage}-source-index.json`), "utf8"));
  const comparison = JSON.parse(fs.readFileSync(path.join(out, `${stage}-discovery-comparison.json`), "utf8"));
  const byName = new Map(source.map((entry, index) => [entry.name, { ...entry, line: 3 + index * 5 }]));
  details[stage] = {
    missing: comparison.missing.map(name => ({
      name,
      source: byName.get(name)?.path ?? null,
      sourceIndexLine: byName.get(name)?.line ?? null,
      status: byName.get(name)?.status ?? null,
    })),
    unexpected: comparison.unexpected.map(name => ({
      name,
      source: byName.get(name)?.path ?? null,
      sourceIndexLine: byName.get(name)?.line ?? null,
      status: byName.get(name)?.status ?? null,
    })),
  };
}
fs.writeFileSync(path.join(out, "discovery-finding-paths.json"), `${JSON.stringify(details, null, 2)}\n`);
