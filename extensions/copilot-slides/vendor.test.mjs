import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

// The vendored browser bundles must stay byte-identical to the npm distribution pinned in package-lock.json.
const pairs = [
    ["vendor/pptxgen.bundle.js", "node_modules/pptxgenjs/dist/pptxgen.bundle.js"],
    ["vendor/jszip.min.js", "node_modules/jszip/dist/jszip.min.js"],
];
for (const [vendored, original] of pairs) {
    const source = new URL(original, import.meta.url);
    test(`${vendored} is byte-identical to the npm distribution`, { skip: !existsSync(source) && "run npm ci to compare with node_modules" }, () => {
        assert.ok(readFileSync(new URL(vendored, import.meta.url)).equals(readFileSync(source)));
    });
}
