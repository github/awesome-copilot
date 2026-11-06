import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const out = path.join(root, "outputs");

function readJson(name) {
  return JSON.parse(fs.readFileSync(path.join(root, "inputs", name), "utf8"));
}

function writeJson(name, value) {
  fs.writeFileSync(path.join(out, name), `${JSON.stringify(value, null, 2)}\n`);
}

const evidence = {};
for (const stage of ["before", "after"]) {
  const source = readJson(`${stage}-source-index.json`);
  const marketplace = readJson(`${stage}-marketplace.json`);
  const discovery = readJson(`${stage}-discovery.json`);
  const active = source.filter(item => item.status !== "deprecated");
  const sourceByName = new Map();
  for (const item of source) {
    const paths = sourceByName.get(item.name) ?? [];
    paths.push(item.path);
    sourceByName.set(item.name, paths);
  }
  const manifestPaths = marketplace.plugins.flatMap(plugin => plugin.skills);
  const manifestDirs = manifestPaths.map(p => p.replaceAll("\\", "/").replace(/^\.\/|\/+$/g, ""));
  const invalidManifestPaths = manifestDirs.filter(dir =>
    !source.some(item => item.status !== "deprecated" && item.path.replace(/\/SKILL\.md$/, "") === dir));
  const duplicateNames = [...sourceByName.entries()]
    .filter(([, paths]) => paths.length > 1)
    .map(([name, paths]) => ({ name, paths }));
  const ambiguousDiscoveryNames = [...new Set(discovery)]
    .filter(name => (sourceByName.get(name)?.length ?? 0) > 1);

  const expectedPaths = active.map(item => item.path.replace(/\/SKILL\.md$/, ""));
  writeJson(`${stage}-expected-manifest.json`, expectedPaths);
  writeJson(`${stage}-manifest-paths.json`, manifestDirs);
  writeJson(`${stage}-expected-discovery.json`, active.map(item => item.name));
  writeJson(`${stage}-discovered-names.json`, discovery);
  writeJson(`${stage}-source-identity-map.json`, {
    sourceCount: source.length,
    activeCount: active.length,
    deprecatedCount: source.length - active.length,
    duplicateNames,
    ambiguousDiscoveryNames,
    invalidManifestPaths,
    sourcePathByName: Object.fromEntries([...sourceByName.entries()]),
  });
  evidence[stage] = {
    sourceCount: source.length,
    expectedActiveCount: active.length,
    deprecatedCount: source.length - active.length,
    marketplacePathCount: manifestDirs.length,
    discoveryNameCount: discovery.length,
    duplicateSourceNames: duplicateNames,
    ambiguousDiscoveryNames,
    invalidManifestPaths,
  };
}
writeJson("derived-counts-and-ambiguities.json", evidence);
