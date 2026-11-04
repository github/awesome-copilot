import assert from "node:assert/strict";
import { test } from "node:test";

import { MAX_COMMENT_LENGTH, buildRequestFixesCommand, mapBoardIssues, normalizeFreeformComment } from "./github.mjs";

test("request fixes builds the router command and requires a reason", () => {
    assert.equal(buildRequestFixesCommand("  Pin a commit SHA.\n- Add a LICENSE "), "/request-fixes Pin a commit SHA.\n- Add a LICENSE");
    assert.equal(buildRequestFixesCommand("/request-fixes Add a README"), "/request-fixes Add a README");
    for (const reason of ["", "   ", "/request-fixes", null]) {
        assert.throws(() => buildRequestFixesCommand(reason), /needs a description/);
    }
});

test("free-form comments are trimmed and posted as written", () => {
    assert.equal(normalizeFreeformComment("  Could you add a README?\n/approve is not needed  "),
        "Could you add a README?\n/approve is not needed");
});

test("free-form comments reject empty bodies", () => {
    for (const body of ["", "   \n\t", null, undefined]) {
        assert.throws(() => normalizeFreeformComment(body), /cannot be empty/);
    }
});

test("free-form comments cannot start with a slash command", () => {
    for (const body of ["/approve", "  /reject nope", "/rerun-intake", "/mark-ready-for-review", "/anything"]) {
        assert.throws(() => normalizeFreeformComment(body), /could trigger issue automation/);
    }
});

test("free-form comments enforce a maximum length", () => {
    assert.equal(normalizeFreeformComment("a".repeat(MAX_COMMENT_LENGTH)).length, MAX_COMMENT_LENGTH);
    assert.throws(() => normalizeFreeformComment("a".repeat(MAX_COMMENT_LENGTH + 1)), /too long/);
});

test("board feed includes submissions in each active intake state", () => {
    const issues = ["ready-for-review", "awaiting-review", "requires-submitter-fixes", "rejected"].map(
        (state, index) => ({
            number: index + 1,
            title: `Submission ${index + 1}`,
            author: { login: "contributor" },
            labels: [{ name: "external-plugin" }, { name: state }],
            url: `https://github.com/github/awesome-copilot/issues/${index + 1}`,
        }),
    );

    assert.deepEqual(
        mapBoardIssues(issues).map((issue) => issue.number),
        [1, 2, 3],
    );
});
