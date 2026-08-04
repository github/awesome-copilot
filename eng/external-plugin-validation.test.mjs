import assert from "node:assert/strict";
import fs from "fs";
import { test } from "node:test";
import {
  EXTERNAL_PLUGINS_FILE,
  validateExternalPlugin,
  validateExternalPlugins,
} from "./external-plugin-validation.mjs";
import { validateLicenseField } from "./lib/license.mjs";

function basePlugin(overrides = {}) {
  return {
    name: "example-plugin",
    description: "An example external plugin used for validation tests.",
    version: "1.2.3",
    author: { name: "Example Author", url: "https://github.com/example" },
    repository: "https://github.com/example/example-plugin",
    license: "MIT",
    keywords: ["example", "testing"],
    source: {
      source: "github",
      repo: "example/example-plugin",
      ref: "v1.2.3",
    },
    ...overrides,
  };
}

function hasError(result, needle) {
  return result.errors.some((message) => message.includes(needle));
}

function hasWarning(result, needle) {
  return result.warnings.some((message) => message.includes(needle));
}

function longestBacktickRun(value) {
  return Math.max(0, ...Array.from(value.matchAll(/`+/g), (match) => match[0].length));
}

test("valid plugin has no errors under both policies", () => {
  const marketplace = validateExternalPlugin(basePlugin(), 0, { policy: "marketplace" });
  assert.deepEqual(marketplace.errors, []);

  const publicSubmission = validateExternalPlugin(
    basePlugin({ source: { source: "github", repo: "example/example-plugin", ref: "v1.2.3" } }),
    0,
    { policy: "publicSubmission" }
  );
  assert.deepEqual(publicSubmission.errors, []);
});

test("version must be semver", () => {
  assert.deepEqual(validateExternalPlugin(basePlugin({ version: "1.2.3" }), 0).errors, []);
  // Prerelease metadata is allowed (matches committed 1.0.1161-preview1).
  assert.deepEqual(validateExternalPlugin(basePlugin({ version: "1.0.1161-preview1" }), 0).errors, []);
  assert.deepEqual(validateExternalPlugin(basePlugin({ version: "1.2.3-beta.1+build.5" }), 0).errors, []);

  assert.ok(hasError(validateExternalPlugin(basePlugin({ version: "1.0" }), 0), "semantic version"));
  assert.ok(hasError(validateExternalPlugin(basePlugin({ version: "v1.2.3" }), 0), "semantic version"));
  assert.ok(hasError(validateExternalPlugin(basePlugin({ version: "latest" }), 0), "semantic version"));
});

test("license accepts SPDX ids and expressions", () => {
  assert.deepEqual(validateExternalPlugin(basePlugin({ license: "Apache-2.0" }), 0).errors, []);
  assert.deepEqual(validateExternalPlugin(basePlugin({ license: "MIT OR Apache-2.0" }), 0).errors, []);
  assert.deepEqual(validateExternalPlugin(basePlugin({ license: "(MIT OR Apache-2.0)" }), 0).errors, []);
  assert.deepEqual(validateExternalPlugin(basePlugin({ license: "LicenseRef-Custom" }), 0).errors, []);

  const recognized = validateExternalPlugin(basePlugin({ license: "MIT" }), 0);
  assert.equal(recognized.warnings.filter((m) => m.includes("license")).length, 0);
});

test("non-SPDX license is a warning, never an error", () => {
  for (const license of ["SSAL-1.0", "Proprietary", "UNLICENSED", "SEE LICENSE IN LICENSE.md", "MIT OR"]) {
    const result = validateExternalPlugin(basePlugin({ license }), 0);
    assert.deepEqual(result.errors, [], `expected no errors for license "${license}"`);
    assert.ok(
      hasWarning(result, "not a recognized SPDX identifier"),
      `expected a warning for license "${license}"`
    );
  }
});

test("empty/non-string license is an error; required license is enforced", () => {
  assert.ok(hasError(validateExternalPlugin(basePlugin({ license: "" }), 0), "non-empty string"));
  assert.ok(hasError(validateExternalPlugin(basePlugin({ license: 42 }), 0), "non-empty string"));

  // publicSubmission requires a license.
  const noLicense = basePlugin();
  delete noLicense.license;
  assert.ok(
    hasError(validateExternalPlugin(noLicense, 0, { policy: "publicSubmission" }), '"license" is required')
  );
});

test("validateLicenseField is reusable for local plugin.json", () => {
  assert.deepEqual(validateLicenseField("MIT"), { errors: [], warnings: [] });

  const proprietary = validateLicenseField("Proprietary");
  assert.deepEqual(proprietary.errors, []);
  assert.equal(proprietary.warnings.length, 1);

  // Optional by default: absent license produces nothing.
  assert.deepEqual(validateLicenseField(undefined), { errors: [], warnings: [] });
  assert.ok(validateLicenseField(undefined, { required: true }).errors.length === 1);
});

test("license grammar validates refs, parentheses, WITH exceptions, and warning sanitization", () => {
  for (const license of [
    "GPL-2.0-only WITH Classpath-exception-2.0",
    "LicenseRef-Custom",
    "DocumentRef-spdx-tool:LicenseRef-MyLicense",
    "(MIT OR Apache-2.0)",
    "MIT AND Apache-2.0",
  ]) {
    const result = validateLicenseField(license);
    assert.deepEqual(result.errors, [], `expected no errors for recognized license "${license}"`);
    assert.equal(result.warnings.length, 0, `expected no warnings for recognized license "${license}"`);
  }

  for (const license of [
    "LicenseRef-",
    "LicenseRef-@@",
    "DocumentRef-foo",
    "(MIT",
    "MIT)",
    "MIT OR (Apache-2.0))",
    "(MIT OR Apache-2.0",
    "MIT WITH Apache-2.0",
    "GPL-2.0-only WITH MIT",
  ]) {
    const result = validateLicenseField(license);
    assert.deepEqual(result.errors, [], `expected malformed license "${license}" to warn, not error`);
    assert.equal(result.warnings.length, 1, `expected one warning for malformed license "${license}"`);
    assert.ok(hasWarning(result, "not a recognized SPDX identifier"));
  }

  const injected = validateLicenseField("MIT\n\n## Injected\n| a | b |");
  assert.deepEqual(injected.errors, []);
  assert.equal(injected.warnings.length, 1);
  assert.ok(!injected.warnings[0].includes("\n"));
  assert.ok(hasWarning(injected, "not a recognized SPDX identifier"));

  const backslashed = validateLicenseField("MIT \\ Custom \\`code\\`");
  assert.deepEqual(backslashed.errors, []);
  assert.equal(backslashed.warnings.length, 1);
  assert.ok(backslashed.warnings[0].includes("`` MIT \\ Custom \\`code\\` ``"));
});

test("license warning wraps backticks and markdown link in an unbreakable code span", () => {
  const license = "x` [pwn](https://evil.example)";
  const result = validateLicenseField(license);

  assert.deepEqual(result.errors, []);
  assert.equal(result.warnings.length, 1);

  const warning = result.warnings[0];
  assert.ok(warning.includes("is not a recognized SPDX identifier"));
  const [, wrappedValue] = warning.match(/"license" value (.+?) is not a recognized SPDX identifier/u);
  const fence = wrappedValue.match(/^`+/u)[0];
  const content = wrappedValue.slice(fence.length, -fence.length);

  assert.ok(fence.length > longestBacktickRun(content));
  assert.ok(content.includes("[pwn](https://evil.example)"));
});

test("author.email is validated only when present", () => {
  assert.deepEqual(
    validateExternalPlugin(basePlugin({ author: { name: "Example", email: "dev@example.com" } }), 0).errors,
    []
  );
  assert.ok(
    hasError(
      validateExternalPlugin(basePlugin({ author: { name: "Example", email: "not-an-email" } }), 0),
      "author.email"
    )
  );
  // Absent email must not raise an error.
  assert.deepEqual(validateExternalPlugin(basePlugin({ author: { name: "Example" } }), 0).errors, []);
});

test("unknown fields produce warnings, not errors", () => {
  const topLevel = validateExternalPlugin(basePlugin({ licence: "MIT" }), 0);
  assert.deepEqual(topLevel.errors, []);
  assert.ok(hasWarning(topLevel, "unknown top-level field `licence`"));

  const authorTypo = validateExternalPlugin(
    basePlugin({ author: { name: "Example", emial: "dev@example.com" } }),
    0
  );
  assert.ok(hasWarning(authorTypo, "unknown author field `author.emial`"));

  const sourceTypo = validateExternalPlugin(
    basePlugin({ source: { source: "github", repo: "example/example-plugin", ref: "v1.2.3", branch: "main" } }),
    0
  );
  assert.ok(hasWarning(sourceTypo, "unknown source field `source.branch`"));

  // A typo in the source discriminator itself is still surfaced as an unknown
  // source field (plus the discriminator error), because the unknown-field check
  // now runs for every source object rather than only recognized github sources.
  const sourceDiscriminatorTypo = validateExternalPlugin(
    basePlugin({ source: { soruce: "github", repo: "example/example-plugin", ref: "v1.2.3" } }),
    0
  );
  assert.ok(hasWarning(sourceDiscriminatorTypo, "unknown source field `source.soruce`"));
  assert.ok(hasError(sourceDiscriminatorTypo, '"source.source" must be one of'));

  // Supported fields never warn.
  const clean = validateExternalPlugin(basePlugin({ homepage: "https://github.com/example/example-plugin" }), 0);
  assert.equal(
    clean.warnings.filter((message) => message.includes("unknown")).length,
    0
  );
});

test("unknown field warning collapses malicious key markdown into one inline code span", () => {
  const maliciousKey = "evil\n- injected [x](https://evil.example)";
  const result = validateExternalPlugin(basePlugin({ [maliciousKey]: true }), 0);

  assert.deepEqual(result.errors, []);
  const warning = result.warnings.find((message) => message.includes("unknown top-level field"));
  assert.ok(warning);
  assert.ok(!warning.includes("\n"));
  assert.ok(warning.includes("unknown top-level field `evil - injected [x](https://evil.example)`"));
  assert.ok(warning.includes("(possible typo)"));
});

test("immutable locator: marketplace warns, publicSubmission errors", () => {
  const noLocator = basePlugin({ source: { source: "github", repo: "example/example-plugin" } });

  const marketplace = validateExternalPlugin(noLocator, 0, { policy: "marketplace" });
  assert.deepEqual(marketplace.errors, []);
  assert.ok(hasWarning(marketplace, "immutable tag ref or commit SHA is recommended"));

  const publicSubmission = validateExternalPlugin(noLocator, 0, { policy: "publicSubmission" });
  assert.ok(hasError(publicSubmission, 'one of "source.ref" or "source.sha" is required'));
});

test("committed external.json passes marketplace policy with zero errors", () => {
  const plugins = JSON.parse(fs.readFileSync(EXTERNAL_PLUGINS_FILE, "utf8"));
  const { errors } = validateExternalPlugins(plugins, { policy: "marketplace" });
  assert.deepEqual(errors, [], `Committed external.json produced errors:\n${errors.join("\n")}`);
});
