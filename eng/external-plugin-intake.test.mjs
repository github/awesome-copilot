import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { evaluateExternalPluginIssue } from "./external-plugin-intake.mjs";

const ORIGINAL_FETCH = global.fetch;
const REPO = "octo/example";
const RESOLVED_REF_SHA = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const PROVIDED_SHA = "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";

afterEach(() => {
  global.fetch = ORIGINAL_FETCH;
});

function buildIssueBody({ ref, sha }) {
  return [
    "<!-- external-plugin-submission -->",
    "### Plugin name",
    "",
    "intake-ref-sha-consistency-test-plugin",
    "",
    "### Short description",
    "",
    "Test plugin for external intake validation.",
    "",
    "### GitHub repository",
    "",
    REPO,
    "",
    "### Plugin path inside the repository",
    "",
    "_No response_",
    "",
    "### Ref to review",
    "",
    ref,
    "",
    "### Commit SHA to review",
    "",
    sha,
    "",
    "### Version",
    "",
    "1.2.3",
    "",
    "### License identifier",
    "",
    "MIT",
    "",
    "### Author name",
    "",
    "Copilot Test",
    "",
    "### Author URL",
    "",
    "_No response_",
    "",
    "### Homepage URL",
    "",
    "_No response_",
    "",
    "### Keywords",
    "",
    "testing",
    "",
    "### Additional notes for reviewers",
    "",
    "_No response_",
    "",
    "### Submission checklist",
    "",
    "- [x] The plugin lives in a public GitHub repository.",
    "- [x] The ref and/or sha I provided is immutable (release tag and/or full 40-character commit SHA), not a branch.",
    "- [x] This submission follows this repository's contribution, security, and responsible AI policies.",
    "- [x] This plugin is not already listed in the Awesome Copilot marketplace.",
    "",
  ].join("\n");
}

function jsonResponse(payload, { status = 200 } = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 404 ? "Not Found" : "OK",
    headers: new Map(),
    async json() {
      return payload;
    },
  };
}

function installMockFetch() {
  global.fetch = async (url) => {
    const requestUrl = String(url);
    if (requestUrl === "https://api.github.com/repos/octo/example") {
      return jsonResponse({ private: false, archived: false });
    }

    if (
      requestUrl === `https://api.github.com/repos/octo/example/git/commits/${PROVIDED_SHA}` ||
      requestUrl === `https://api.github.com/repos/octo/example/git/commits/${RESOLVED_REF_SHA}`
    ) {
      const sha = requestUrl.endsWith(RESOLVED_REF_SHA) ? RESOLVED_REF_SHA : PROVIDED_SHA;
      return jsonResponse({ sha });
    }

    if (requestUrl === "https://api.github.com/repos/octo/example/git/ref/tags/v1.2.3") {
      return jsonResponse({ object: { type: "tag", sha: "cccccccccccccccccccccccccccccccccccccccc" } });
    }

    if (requestUrl === "https://api.github.com/repos/octo/example/commits/v1.2.3") {
      return jsonResponse({ sha: RESOLVED_REF_SHA });
    }

    return jsonResponse({}, { status: 404 });
  };
}

test("evaluateExternalPluginIssue fails when ref and sha resolve to different commits", async () => {
  installMockFetch();
  const issue = { body: buildIssueBody({ ref: "v1.2.3", sha: PROVIDED_SHA }) };

  const result = await evaluateExternalPluginIssue({ issue });

  assert.equal(result.valid, false);
  assert.match(
    result.commentBody,
    /must reference the same commit \(ref "v1\.2\.3" resolves to "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", sha is "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"\)/,
  );
});

test("evaluateExternalPluginIssue passes when ref and sha resolve to the same commit", async () => {
  installMockFetch();
  const issue = { body: buildIssueBody({ ref: "v1.2.3", sha: RESOLVED_REF_SHA }) };

  const result = await evaluateExternalPluginIssue({ issue });

  assert.equal(result.valid, true);
  assert.equal(
    result.errors.some((error) => error.includes("must reference the same commit")),
    false,
  );
});
