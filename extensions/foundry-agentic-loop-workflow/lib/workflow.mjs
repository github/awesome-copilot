import { META } from "./args.mjs";
import { runLoop } from "./loop.mjs";

// The SDK is injected, so tests check the wiring without the runtime's @github/copilot-sdk.
export function createWorkflow({ defineWorkflow, extensionDir }) {
    return defineWorkflow({
        meta: META,
        run: ctx => runLoop(ctx, { extensionDir }),
    });
}
