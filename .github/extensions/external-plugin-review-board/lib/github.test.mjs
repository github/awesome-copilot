import assert from "node:assert/strict";
import { test } from "node:test";

import { mapBoardIssues } from "./github.mjs";

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
