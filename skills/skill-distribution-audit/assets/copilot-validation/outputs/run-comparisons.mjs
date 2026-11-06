import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = path.resolve(import.meta.dirname, "..");
const out = path.join(root, "outputs");
const helper = path.join(root, ".github", "skills", "skill-distribution-audit", "scripts", "compare-discovery.mjs");

for (const stage of ["before", "after"]) {
  for (const layer of ["manifest", "discovery"]) {
    const expected = path.join(out, `${stage}-expected-${layer}.json`);
    const observed = path.join(out, layer === "manifest"
      ? `${stage}-manifest-paths.json`
      : `${stage}-discovered-names.json`);
    const result = spawnSync(process.execPath, [helper, expected, observed], {
      cwd: root,
      encoding: "utf8",
    });
    const base = `${stage}-${layer}-comparison`;
    fs.writeFileSync(path.join(out, `${base}.json`), result.stdout);
    fs.writeFileSync(path.join(out, `${base}.exitcode.txt`),
      `${result.status ?? 2}\n`);
    if (result.stderr) fs.writeFileSync(path.join(out, `${base}.stderr.txt`), result.stderr);
    else fs.rmSync(path.join(out, `${base}.stderr.txt`), { force: true });
    if (result.error) throw result.error;
  }
}
