import assert from "node:assert/strict";
import fs from "fs";
import { test } from "node:test";
import {
  EXTERNAL_PLUGINS_FILE,
  validateExternalPlugin,
  validateExternalPlugins,
} from "./external-plugin-validation.mjs";

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
  assert.deepEqual(validateExternalPlugin(basePlugin({ license: "GPL-2.0-or-later WITH GCC-exception" }), 0).errors, []);
  assert.deepEqual(validateExternalPlugin(basePlugin({ license: "LicenseRef-Custom" }), 0).errors, []);
});

test("license warns on well-formed but unrecognized SPDX id", () => {
  const result = validateExternalPlugin(basePlugin({ license: "SSAL-1.0" }), 0);
  assert.deepEqual(result.errors, []);
  assert.ok(hasWarning(result, "not a recognized SPDX identifier"));
});

test("license errors on malformed expressions", () => {
  assert.ok(hasError(validateExternalPlugin(basePlugin({ license: "MIT OR" }), 0), "operator"));
  assert.ok(hasError(validateExternalPlugin(basePlugin({ license: "MIT Apache-2.0" }), 0), "not a valid SPDX expression"));
  assert.ok(hasError(validateExternalPlugin(basePlugin({ license: "@bad@" }), 0), "invalid SPDX identifier"));
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
  assert.ok(hasWarning(topLevel, 'unknown top-level field "licence"'));

  const authorTypo = validateExternalPlugin(
    basePlugin({ author: { name: "Example", emial: "dev@example.com" } }),
    0
  );
  assert.ok(hasWarning(authorTypo, 'unknown author field "author.emial"'));

  const sourceTypo = validateExternalPlugin(
    basePlugin({ source: { source: "github", repo: "example/example-plugin", ref: "v1.2.3", branch: "main" } }),
    0
  );
  assert.ok(hasWarning(sourceTypo, 'unknown source field "source.branch"'));

  // Supported fields never warn.
  const clean = validateExternalPlugin(basePlugin({ homepage: "https://github.com/example/example-plugin" }), 0);
  assert.equal(
    clean.warnings.filter((message) => message.includes("unknown")).length,
    0
  );
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
