import assert from "node:assert/strict";
import { test } from "node:test";
import {
    assertNoPendingFixesRequest,
    confirmRequestFixes,
} from "../.github/extensions/external-plugin-review-board/lib/request-fixes.mjs";

test("pending fixes requests block conflicting GitHub actions", () => {
    const item = { pendingFixesRequest: { at: "request-time" } };

    assert.throws(
        () => assertNoPendingFixesRequest(item, 42),
        error => /#42 has a fixes request awaiting workflow confirmation/.test(error.message) && error.handoff === false,
    );
    assert.doesNotThrow(() => assertNoPendingFixesRequest({}, 42));
});

test("fixes confirmation polling treats status failures as pending and logs them", async () => {
    const warnings = [];
    const result = await confirmRequestFixes({
        number: 42,
        getIssueStatus: async () => { throw new Error("GitHub unavailable"); },
        onConfirmed: async () => assert.fail("must not resolve without status"),
        refresh: async () => assert.fail("must not refresh without confirmation"),
        sleep: async () => {},
        log: (error) => warnings.push(error.message),
    });

    assert.equal(result, false);
    assert.deepEqual(warnings, ["GitHub unavailable"]);
});

test("fixes confirmation polling treats refresh failures as pending after the label is seen", async () => {
    const warnings = [];
    let resolved = false;
    const result = await confirmRequestFixes({
        number: 42,
        getIssueStatus: async () => ({ state: "OPEN", labels: ["requires-submitter-fixes"] }),
        onConfirmed: async () => { resolved = true; },
        refresh: async () => { throw new Error("Issue list unavailable"); },
        sleep: async () => {},
        log: (error) => warnings.push(error.message),
    });

    assert.equal(result, false);
    assert.equal(resolved, true);
    assert.deepEqual(warnings, ["Issue list unavailable"]);
});

test("fixes confirmation polling returns pending when workflow labels have not changed", async () => {
    let statusChecks = 0;
    const result = await confirmRequestFixes({
        number: 42,
        getIssueStatus: async () => {
            statusChecks += 1;
            return { state: "OPEN", labels: ["ready-for-review"] };
        },
        onConfirmed: async () => assert.fail("must not resolve before the label transition"),
        refresh: async () => assert.fail("must not refresh before the label transition"),
        sleep: async () => {},
        log: () => assert.fail("ordinary polling timeout is not an error"),
    });

    assert.equal(result, false);
    assert.equal(statusChecks, 3);
});
