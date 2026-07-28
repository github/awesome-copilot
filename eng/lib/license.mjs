// Shared license validation used by both the external plugin catalog validator
// (eng/external-plugin-validation.mjs) and the local plugin.json validator
// (eng/validate-plugins.mjs). Keeping it here avoids one validator importing from
// the other and gives license rules a single, dedicated home.
//
// The agent-plugins-spec schema (https://github.com/agentplugins/agent-plugins-spec)
// does not enforce SPDX, and plugins may legitimately use proprietary or non-OSS
// licenses. A non-SPDX license is therefore a warning, never an error.

// A single SPDX license identifier token (e.g. "MIT", "Apache-2.0", "LicenseRef-Foo").
const SPDX_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9.-]*\+?$/;
const SPDX_EXPRESSION_OPERATORS = new Set(["AND", "OR", "WITH"]);

// Curated set of common SPDX license identifiers. Not exhaustive: unrecognized
// but well-formed identifiers produce a warning rather than an error.
const KNOWN_SPDX_IDS = new Set([
  "0BSD",
  "AGPL-3.0",
  "AGPL-3.0-only",
  "AGPL-3.0-or-later",
  "Apache-2.0",
  "BSD-2-Clause",
  "BSD-3-Clause",
  "BSL-1.0",
  "CC-BY-4.0",
  "CC-BY-SA-4.0",
  "CC0-1.0",
  "EPL-2.0",
  "GPL-2.0",
  "GPL-2.0-only",
  "GPL-2.0-or-later",
  "GPL-3.0",
  "GPL-3.0-only",
  "GPL-3.0-or-later",
  "ISC",
  "LGPL-2.1",
  "LGPL-2.1-only",
  "LGPL-2.1-or-later",
  "LGPL-3.0",
  "LGPL-3.0-only",
  "LGPL-3.0-or-later",
  "MIT",
  "MPL-2.0",
  "Unlicense",
  "WTFPL",
  "Zlib",
]);

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isRecognizedSpdxIdToken(token) {
  if (token.startsWith("LicenseRef-") || token.startsWith("DocumentRef-")) {
    return true;
  }

  if (!SPDX_ID_PATTERN.test(token)) {
    return false;
  }

  const normalized = token.endsWith("+") ? token.slice(0, -1) : token;
  return KNOWN_SPDX_IDS.has(normalized);
}

// Returns true only for a well-formed SPDX license expression composed of
// recognized identifiers joined by AND/OR/WITH operators (optionally parenthesized).
// Anything else (proprietary strings, free text, unrecognized ids) returns false so
// the caller can warn without rejecting it — the plugin spec does not enforce SPDX.
export function isRecognizedSpdxExpression(license) {
  if (typeof license !== "string") {
    return false;
  }

  const tokens = license
    .replace(/[()]/g, " ")
    .trim()
    .split(/\s+/)
    .filter((token) => token.length > 0);

  if (tokens.length === 0) {
    return false;
  }

  let expectOperator = false;
  for (const token of tokens) {
    if (SPDX_EXPRESSION_OPERATORS.has(token.toUpperCase())) {
      if (!expectOperator) {
        return false;
      }
      expectOperator = false;
      continue;
    }

    if (expectOperator || !isRecognizedSpdxIdToken(token)) {
      return false;
    }

    expectOperator = true;
  }

  return expectOperator;
}

// Canonical license validation. A non-SPDX license is a warning (never an error)
// so authors may use proprietary or non-OSS licenses. Returns collected
// errors/warnings so each caller can integrate them into its own reporting.
//
// Options:
//   required — when true, a missing license is an error (default false).
//   prefix   — optional message prefix (e.g. "external.json[3]") for context.
export function validateLicenseField(license, options = {}) {
  const { required = false } = options;
  const prefix = options.prefix ? `${options.prefix}: ` : "";
  const errors = [];
  const warnings = [];

  if (license === undefined) {
    if (required) {
      errors.push(`${prefix}"license" is required`);
    }
    return { errors, warnings };
  }

  if (!isNonEmptyString(license)) {
    errors.push(`${prefix}"license" must be a non-empty string`);
    return { errors, warnings };
  }

  if (!isRecognizedSpdxExpression(license)) {
    warnings.push(
      `${prefix}"license" value "${license}" is not a recognized SPDX identifier; prefer a standard SPDX id (https://spdx.org/licenses), though non-SPDX or proprietary licenses are allowed`
    );
  }

  return { errors, warnings };
}
