// agent-browser screenshot driver for the canvas preview server.
//
// Captures every canvas state to ./shots/ and drives the two interaction flows
// that keep regressing:
//   1. catalog -> click Connect -> sign-in modal with the spinning .si-spin
//   2. restart banner visible -> click dismiss -> banner gone
//
// Requires the preview server to be running:
//   node extensions/connector-namespaces/preview/server.mjs
// And agent-browser installed:
//   npm i -g agent-browser && agent-browser install
//
// If agent-browser is not installed, this script prints how to install it and
// exits 0 (so it never breaks an unattended run). This is a visual-evidence
// helper; the deterministic regression gate is renderer.test.mjs.

import { spawnSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const SHOTS = join(HERE, "shots");
const BASE = "http://127.0.0.1:7331";

function hasAgentBrowser() {
    const probe = spawnSync("agent-browser", ["--version"], { encoding: "utf8", shell: true });
    return probe.status === 0;
}

function ab(args) {
    const r = spawnSync("agent-browser", args, { encoding: "utf8", shell: true });
    if (r.status !== 0) {
        console.error(`agent-browser ${args.join(" ")} failed:\n${r.stderr || r.stdout}`);
    }
    return r;
}

function serverUp() {
    // Node 18+ has global fetch. Confirm the preview server is reachable.
    return fetch(`${BASE}/api/state`).then(() => true).catch(() => false);
}

async function main() {
    if (!hasAgentBrowser()) {
        console.log("agent-browser is not installed -> skipping screenshots.");
        console.log("Install it with:  npm i -g agent-browser && agent-browser install");
        console.log("Then re-run:      node extensions/connector-namespaces/preview/shots.mjs");
        process.exit(0);
    }

    if (!(await serverUp())) {
        console.error("preview server is not reachable at " + BASE);
        console.error("start it first:  node extensions/connector-namespaces/preview/server.mjs");
        process.exit(1);
    }

    mkdirSync(SHOTS, { recursive: true });

    // Static states.
    const states = [
        ["catalog", `${BASE}/`],
        ["catalog-restart-banner", `${BASE}/?restart=1`],
        ["catalog-installed", `${BASE}/?installed=1`],
        ["setup", `${BASE}/setup`],
        ["error", `${BASE}/error`],
    ];
    for (const [name, target] of states) {
        ab(["open", target]);
        ab(["screenshot", join(SHOTS, `${name}.png`)]);
        console.log(`captured ${name}`);
    }

    // Flow 1: connect -> connecting spinner. The preview /api/install returns
    // needsConsent and /oauth-status stays pending, so the .si-spin modal
    // spinner keeps animating. Best-effort selector; adjust if markup changes.
    ab(["open", `${BASE}/`]);
    ab(["click", ".item-add[data-api]"]);
    ab(["screenshot", join(SHOTS, "connecting-spinner.png")]);
    console.log("captured connecting-spinner (verify the spinner is mid-rotation)");

    // Flow 2: banner -> dismiss -> gone. Screenshot before and after the click
    // so a frozen/broken dismiss button is visible as a diff.
    ab(["open", `${BASE}/?restart=1`]);
    ab(["screenshot", join(SHOTS, "banner-before-dismiss.png")]);
    ab(["click", ".restart-banner .rb-dismiss"]);
    ab(["screenshot", join(SHOTS, "banner-after-dismiss.png")]);
    console.log("captured banner-before-dismiss / banner-after-dismiss (after should have no banner)");

    console.log(`\nshots written to ${SHOTS}`);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
