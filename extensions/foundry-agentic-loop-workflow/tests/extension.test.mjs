import { test } from "node:test";
import assert from "node:assert/strict";
import module from "node:module";
import { META } from "../lib/args.mjs";

// The installed root @github/copilot-sdk can be older than the runtime's (no defineWorkflow), so the real entry point is loaded
// with the SDK specifier mapped to a stub that records how extension.mjs uses it.
const STUB = `data:text/javascript,${encodeURIComponent(`
const sdk = globalThis.__agenticLoopSdk = { defined: [], joined: [] };
export function defineWorkflow(definition) { sdk.defined.push(definition); return { workflow: definition }; }
export async function joinSession(options) { sdk.joined.push(options); }
`)}`;

test("extension.mjs defines the workflow with META and joins the session with it", { skip: typeof module.registerHooks !== "function" && "module.registerHooks needs Node 22.15 or later" }, async () => {
    const hooks = module.registerHooks({
        resolve(specifier, context, next) {
            return specifier === "@github/copilot-sdk/extension" ? { url: STUB, shortCircuit: true } : next(specifier, context);
        },
    });
    try { await import("../extension.mjs"); }
    finally { hooks.deregister(); }
    const sdk = globalThis.__agenticLoopSdk;
    assert.equal(sdk.defined.length, 1);
    assert.equal(sdk.defined[0].meta, META);
    assert.equal(typeof sdk.defined[0].run, "function");
    assert.equal(sdk.joined.length, 1);
    assert.deepEqual(sdk.joined[0].workflows, [{ workflow: sdk.defined[0] }]);
    await assert.rejects(sdk.defined[0].run({ args: { brief: "too short" } }), /args.brief is required/);
});
