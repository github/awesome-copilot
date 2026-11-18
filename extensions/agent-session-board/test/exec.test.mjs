import test from "node:test";
import assert from "node:assert/strict";
import { run } from "../lib/exec.mjs";

test("run refuses commands outside the allowlist and non-string arguments", async () => {
    await assert.rejects(run("rm", ["-rf", "/tmp/x"]), { code: "not_allowed" });
    await assert.rejects(run("sh", ["-c", "echo hi"]), { code: "not_allowed" });
    await assert.rejects(run("gh", "--version"), { code: "not_allowed" });
    await assert.rejects(run("gh", [{ toString: () => "--version" }]), { code: "not_allowed" });
});
