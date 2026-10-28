import { test } from "node:test";
import assert from "node:assert/strict";
import { assertSession, sessionUsage } from "../lib/usage.mjs";

test("usage is bound to its owning session, not a different canvas session", async () => {
    const calls = [];
    const session = id => ({ sessionId: id, rpc: { usage: { getMetrics: async () => {
        calls.push(id);
        return { modelMetrics: { [id]: { requests: { count: 1 } } }, totalNanoAiu: id === "first" ? 1e9 : 2e9 };
    } } } });
    const first = session("first");
    const second = session("second");
    assert.equal((await sessionUsage(first, "first")).totalNanoAiu, 1e9);
    assert.equal((await sessionUsage(second, "second")).totalNanoAiu, 2e9);
    await assert.rejects(sessionUsage(first, "second"), /not attached/);
    assert.throws(() => assertSession({}, undefined), /not attached/);
    assert.deepEqual(calls, ["first", "second"]);
});

test("session accounting and live counters remain distinct, fresh and privacy-limited", async () => {
    let requests = 2;
    const session = { sessionId: "current", rpc: { usage: { getMetrics: async () => ({
        modelMetrics: { model: { usage: { inputTokens: 10 }, requests: { count: requests++ } } },
        tokenDetails: { output: { tokenCount: 5000 } },
        totalNanoAiu: 100e9, totalUserRequests: 2,
        codeChanges: { filesModified: ["private-path"] },
    }) } } };
    const metrics = await sessionUsage(session, "current");
    assert.equal(metrics.sessionId, "current");
    assert.equal(metrics.totalNanoAiu, 100e9);
    assert.equal(metrics.tokenDetails.output.tokenCount, 5000);
    assert.equal(metrics.modelMetrics.model.requests.count, 2);
    assert.equal(metrics.modelMetrics.model.usage.outputTokens, undefined);
    assert(!Object.hasOwn(metrics, "codeChanges"));
    assert(Number.isFinite(Date.parse(metrics.checkedAt)));
    assert.equal((await sessionUsage(session, "current")).modelMetrics.model.requests.count, 3);
});

test("usage failures and unavailable metric payloads are explicit", async () => {
    const session = { sessionId: "current", rpc: { usage: { getMetrics: async () => { throw new Error("RPC unavailable"); } } } };
    await assert.rejects(sessionUsage(session, "current"), /RPC unavailable/);
    session.rpc.usage.getMetrics = async () => null;
    await assert.rejects(sessionUsage(session, "current"), /did not return/);
});
