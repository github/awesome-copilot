import assert from "node:assert/strict";
import test from "node:test";
import { coalesce } from "../public/coalesce.mjs";
import { escape, isLoopback } from "../public/escape.mjs";
import { DISCONNECT_AFTER, LiveConnection } from "../public/live-conn.mjs";
import { autoSwitch, isEditable } from "../public/tab-policy.mjs";
import { TargetSaver } from "../public/target-save.mjs";

const deferred = () => {
    let resolve, reject;
    const promise = new Promise((done, fail) => { resolve = done; reject = fail; });
    return { promise, resolve, reject };
};
const tick = () => new Promise(resolve => setImmediate(resolve));

function fakeTimers() {
    const timers = new Map();
    let id = 0;
    return {
        setTimer: (fn, ms) => { timers.set(++id, { fn, ms }); return id; },
        clearTimer: handle => { timers.delete(handle); },
        fire() { for (const [handle, { fn }] of [...timers]) { timers.delete(handle); fn(); } },
        get size() { return timers.size; },
    };
}

test("target saver merges debounced edits and a send flushes them before it continues", async () => {
    const timers = fakeTimers();
    const saved = [];
    const order = [];
    const saver = new TargetSaver({ save: async input => { await tick(); saved.push(input); order.push("saved"); }, ...timers });
    saver.schedule({ environmentName: "con" });
    saver.schedule({ environmentName: "contoso" });
    saver.schedule({ location: "eastus2" });
    assert.equal(saver.saving, true);
    assert.equal(timers.size, 1, "one debounce timer");
    const result = await saver.flush();
    order.push("send");
    assert.deepEqual(result, { ok: true });
    assert.deepEqual(saved, [{ environmentName: "contoso", location: "eastus2" }]);
    assert.deepEqual(order, ["saved", "send"], "the send waits for the save");
    assert.equal(timers.size, 0, "flush cancels the debounce");
    assert.equal(saver.saving, false);
    assert.deepEqual(await saver.flush(), { ok: true }, "nothing pending resolves at once");
});

test("target saver runs saves one at a time and a send waits for an edit made during a save", async () => {
    const timers = fakeTimers();
    const gates = [deferred(), deferred()];
    const saved = [];
    let active = 0, overlap = false;
    const saver = new TargetSaver({
        save: async input => {
            active++;
            overlap ||= active > 1;
            await gates[saved.length].promise;
            saved.push(input);
            active--;
        },
        ...timers,
    });
    saver.schedule({ subscriptionId: "sub-a" });
    saver.flush();
    saver.schedule({ environmentName: "contoso" });
    const send = saver.flush();
    let sent = false;
    send.then(() => { sent = true; });
    gates[0].resolve();
    await tick();
    assert.equal(sent, false, "the send is still waiting for the second save");
    gates[1].resolve();
    assert.deepEqual(await send, { ok: true });
    assert.deepEqual(saved, [{ subscriptionId: "sub-a" }, { environmentName: "contoso" }]);
    assert.equal(overlap, false);
});

test("target saver reports a failed save, restores the server target and then no longer blocks", async () => {
    const timers = fakeTimers();
    const restored = [];
    const changes = [];
    const saver = new TargetSaver({
        save: async () => { throw new Error("Invalid location."); },
        restore: async error => { restored.push(error.message); },
        onChange: saving => changes.push(saving),
        ...timers,
    });
    saver.schedule({ location: "nowhere" });
    const result = await saver.flush();
    assert.equal(result.ok, false);
    assert.equal(result.error.message, "Invalid location.");
    assert.deepEqual(restored, ["Invalid location."]);
    assert.deepEqual(changes, [true, false]);
    assert.deepEqual(await saver.flush(), { ok: true }, "the reported failure does not block the next send");
});

test("target saver leaves a newer edit alone when an older save fails", async () => {
    const timers = fakeTimers();
    const gate = deferred();
    const restored = [];
    const saved = [];
    const saver = new TargetSaver({
        save: async input => {
            if (input.location === "bad") { await gate.promise; throw new Error("Rejected."); }
            saved.push(input);
        },
        restore: async () => { restored.push("restore"); },
        ...timers,
    });
    saver.schedule({ location: "bad" });
    saver.flush();
    saver.schedule({ location: "eastus2" });
    gate.resolve();
    const result = await saver.flush();
    assert.deepEqual(result, { ok: true });
    assert.deepEqual(saved, [{ location: "eastus2" }]);
    assert.deepEqual(restored, [], "the newer edit wins without a rollback");
});

test("target saver still reports a failed field when a different field saves afterwards", async () => {
    const timers = fakeTimers();
    const gate = deferred();
    const restored = [];
    const saved = [];
    const saver = new TargetSaver({
        save: async input => {
            if (input.subscriptionId) { await gate.promise; throw new Error("No access."); }
            saved.push(input);
        },
        restore: async error => { restored.push(error.message); },
        ...timers,
    });
    saver.schedule({ subscriptionId: "other" });
    saver.flush();
    saver.schedule({ environmentName: "contoso" });
    const send = saver.flush();
    gate.resolve();
    const result = await send;
    assert.equal(result.ok, false, "a send must not proceed with a target the user did not select");
    assert.equal(result.error.message, "No access.");
    assert.deepEqual(saved, [{ environmentName: "contoso" }]);
    assert.deepEqual(restored, ["No access."]);
    assert.deepEqual(await saver.flush(), { ok: true });
});

test("target saver reports a failed field once the queued edit after it is discarded", async () => {
    const timers = fakeTimers();
    const gate = deferred();
    const restored = [];
    const saver = new TargetSaver({
        save: async () => { await gate.promise; throw new Error("Rejected."); },
        restore: async error => { restored.push(error.message); },
        ...timers,
    });
    saver.schedule({ location: "bad" });
    const first = saver.flush();
    saver.schedule({ environmentName: "x" });
    gate.resolve();
    assert.equal((await first).ok, false);
    assert.deepEqual(restored, []);
    saver.discard("environmentName");
    await saver.chain;
    assert.deepEqual(restored, ["Rejected."]);
    assert.equal(saver.saving, false);
});

test("target saver keeps blocking after a failed restore and retries the restore on the next flush", async () => {
    const timers = fakeTimers();
    let restores = 0;
    const saver = new TargetSaver({
        save: async () => { throw new Error("Invalid location."); },
        restore: async () => { if (++restores === 1) throw new Error("Offline."); },
        ...timers,
    });
    saver.schedule({ location: "nowhere" });
    assert.equal((await saver.flush()).ok, false);
    const retry = await saver.flush();
    assert.equal(retry.ok, false, "a send must not proceed while the controls may differ from the server");
    assert.equal(retry.error.message, "Invalid location.");
    assert.equal(restores, 2);
    assert.deepEqual(await saver.flush(), { ok: true }, "once restored, the failure no longer blocks");
});

test("target saver discards an invalid pending field", () => {
    const timers = fakeTimers();
    const saver = new TargetSaver({ save: async () => {}, ...timers });
    saver.schedule({ environmentName: "contoso" });
    saver.discard("environmentName");
    assert.equal(saver.saving, false);
    assert.equal(timers.size, 0);
    saver.schedule({ location: "eastus2", environmentName: "x1" });
    saver.discard("environmentName");
    assert.deepEqual(saver.pending, { location: "eastus2" });
});

test("target saver calls the default timers without a receiver, as browsers require", async () => {
    const original = { setTimeout: globalThis.setTimeout, clearTimeout: globalThis.clearTimeout };
    const guard = fn => function (...args) {
        if (this !== undefined && this !== globalThis) throw new TypeError("Illegal invocation");
        return fn(...args);
    };
    globalThis.setTimeout = guard(original.setTimeout);
    globalThis.clearTimeout = guard(original.clearTimeout);
    try {
        const saver = new TargetSaver({ save: async () => {}, delay: 1 });
        saver.schedule({ location: "eastus2" });
        assert.deepEqual(await saver.flush(), { ok: true });
    } finally { Object.assign(globalThis, original); }
});

test("live connection reports a disconnect after the threshold and recovers on success", () => {
    let now = 0;
    const conn = new LiveConnection({ now: () => now });
    assert.equal(DISCONNECT_AFTER, 15_000);
    now = 60_000;
    assert.equal(conn.failed(), false, "a first failure after a long successful poll is not a disconnect");
    now += 14_999;
    assert.equal(conn.failed(), false);
    assert.equal(conn.disconnected, false);
    now += 1;
    assert.equal(conn.failed(), true);
    assert.equal(conn.disconnected, true);
    assert.equal(conn.failed(), false, "only the transition is reported");
    assert.equal(conn.succeeded(), true);
    assert.equal(conn.disconnected, false);
    assert.equal(conn.succeeded(), false);
    now += 1000;
    assert.equal(conn.failed(), false, "the clock restarts after a recovery");
});

test("live connection backs off exponentially up to its cap and resets on success", () => {
    const conn = new LiveConnection({ now: () => 0 });
    assert.deepEqual(Array.from({ length: 6 }, () => conn.backoff()), [1000, 2000, 4000, 8000, 15_000, 15_000]);
    conn.succeeded();
    assert.equal(conn.backoff(), 1000);
});

test("live connection run loop applies snapshots, signals state changes and aborts the poll in flight on stop", async () => {
    let now = 0;
    const conn = new LiveConnection({ now: () => now });
    const applied = [], states = [];
    let calls = 0, lastSignal;
    const hang = deferred();
    const running = conn.run({
        request: async signal => {
            lastSignal = signal;
            calls++;
            if (calls === 1) return { version: 1 };
            if (calls <= 4) throw new Error("offline");
            if (calls === 5) return { version: 2 };
            signal.addEventListener("abort", () => hang.reject(new Error("aborted")));
            return hang.promise;
        },
        apply: value => applied.push(value.version),
        sleep: async ms => { now += ms; },
        onState: disconnected => states.push(disconnected),
    });
    while (calls < 6) await tick();
    assert.deepEqual(applied, [1, 2]);
    assert.deepEqual(states, [], "three failures within 3 s stay below the threshold");
    conn.stop();
    await running;
    assert.equal(lastSignal.aborted, true);
    assert.deepEqual(applied, [1, 2], "an aborted poll is not applied");
});

test("live connection run loop reports a disconnect once failures pass 15 s", async () => {
    let now = 0;
    const conn = new LiveConnection({ now: () => now });
    const states = [];
    let calls = 0;
    const running = conn.run({
        request: async () => { calls++; if (calls > 8) conn.stop(); throw new Error("offline"); },
        apply: () => {},
        sleep: async ms => { now += ms; },
        onState: disconnected => states.push({ disconnected, at: now }),
    });
    await running;
    assert.deepEqual(states, [{ disconnected: true, at: 15_000 }], "1+2+4+8 s of backoff reaches 15 s on the fifth failure");
});

const element = props => ({ tagName: "DIV", disabled: false, readOnly: false, isContentEditable: false, ...props });

test("auto tab switch defers to a notice while the user is editing or a dialog is open", () => {
    const text = element({ tagName: "INPUT", type: "text" });
    assert.equal(isEditable(text), true);
    assert.equal(isEditable(element({ tagName: "INPUT" })), true, "an input without a type is text");
    assert.equal(isEditable(element({ tagName: "TEXTAREA" })), true);
    assert.equal(isEditable(element({ tagName: "TEXTAREA", readOnly: true })), false);
    assert.equal(isEditable(element({ tagName: "SELECT" })), true);
    assert.equal(isEditable(element({ isContentEditable: true })), true);
    assert.equal(isEditable(element({ tagName: "INPUT", type: "text", disabled: true })), false);
    for (const type of ["button", "submit", "checkbox", "radio"]) assert.equal(isEditable(element({ tagName: "INPUT", type })), false, type);
    assert.equal(isEditable(element({ tagName: "BUTTON" })), false);
    assert.equal(isEditable(null), false);

    assert.equal(autoSwitch({ current: "start", target: "build", active: element({ tagName: "BODY" }) }), "switch");
    assert.equal(autoSwitch({ current: "start", target: "build", active: element({ tagName: "BUTTON" }) }), "switch");
    assert.equal(autoSwitch({ current: "start", target: "build", active: element({ tagName: "TEXTAREA" }) }), "notice");
    assert.equal(autoSwitch({ current: "start", target: "build", active: text }), "notice");
    assert.equal(autoSwitch({ current: "build", target: "explore", dialogOpen: true }), "notice");
    assert.equal(autoSwitch({ current: "explore", target: "explore", active: text }), "none");
});

test("coalesced refresh joins a background poll and runs a forced refresh again right after it", async () => {
    const calls = [];
    const gates = [];
    const refresh = coalesce(async force => {
        calls.push(force);
        const gate = deferred();
        gates.push(gate);
        await gate.promise;
    });
    const poll = refresh();
    const joined = refresh();
    assert.equal(joined, poll, "a background call joins the poll in flight");
    const forced = refresh(true);
    assert.equal(forced, poll);
    gates[0].resolve();
    await tick();
    assert.deepEqual(calls, [false, true], "the forced refresh runs immediately after the poll settles");
    gates[1].resolve();
    await forced;
    assert.deepEqual(calls, [false, true]);
    const next = refresh();
    assert.notEqual(next, poll, "a new call after settling starts a new run");
    gates[2].resolve();
    await next;
});

test("coalesced refresh rejects only when the last run failed", async () => {
    let fail = true;
    const gate = deferred();
    let runs = 0;
    const refresh = coalesce(async () => {
        runs++;
        if (runs === 1) { await gate.promise; if (fail) throw new Error("first failed"); }
    });
    const first = refresh();
    refresh(true);
    gate.resolve();
    await first;
    assert.equal(runs, 2, "the retry ran and its success settles the batch");
    const failing = coalesce(async () => { throw new Error("down"); });
    await assert.rejects(failing(true), /down/);
});

test("escape neutralizes hostile strings and isLoopback recognizes only local URLs", () => {
    const hostile = `<img src=x onerror="alert('x')">&amp;</script>`;
    const escaped = escape(hostile);
    assert.equal(escaped, "&lt;img src=x onerror=&quot;alert(&#39;x&#39;)&quot;&gt;&amp;amp;&lt;/script&gt;");
    assert.doesNotMatch(escaped, /[<>"']/);
    assert.equal(escape(null), "");
    assert.equal(escape(42), "42");
    assert.equal(escape(`" autofocus onfocus="x`), "&quot; autofocus onfocus=&quot;x");
    assert.equal(isLoopback("http://localhost:5173/"), true);
    assert.equal(isLoopback("http://127.0.0.1:8000"), true);
    assert.equal(isLoopback("http://[::1]:3000/"), true);
    assert.equal(isLoopback("https://app.example.azurecontainerapps.io/"), false);
    assert.equal(isLoopback("http://localhost.evil.com/"), false);
    assert.equal(isLoopback("not a url"), false);
});
