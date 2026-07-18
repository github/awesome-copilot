// Standalone preview server for the connector-namespaces connector catalog.
//
// Renders every canvas state with no Copilot app, no ARM, and no real OAuth by
// importing the *pure* HTML builders from renderer.mjs and stubbing every
// /api/* endpoint the inline client script calls. Point any browser (or the
// agent-browser driver in shots.mjs) at it to see exactly what ships.
//
// Run:  node extensions/connector-namespaces/preview/server.mjs
// Then open http://127.0.0.1:7331/ (catalog), /setup, /error.
//
// This process is NOT the JSON-RPC extension provider, so console.log here is
// fine and intentional — it is how you watch which stubbed endpoints get hit.

import { createServer } from "node:http";

import {
    renderCatalogHtml,
    renderSetupHtml,
    renderErrorHtml,
} from "../renderer.mjs";
import * as fixtures from "./fixtures.mjs";

const HOST = "127.0.0.1";
const PORT = 7331;
const INSTANCE = "preview";

// Whatever /api/state should report next. The catalog route updates this from
// its query flags so a page load can force the banner / "added" tile on, and a
// real Connect click flips pendingRestart on via showRestartBanner().
let activeState = fixtures.stateEmpty;

function selectState(query) {
    const restart = query.get("restart") === "1";
    const installed = query.get("installed") === "1";
    if (restart && installed) return fixtures.stateInstalledRestart;
    if (installed) return { state: fixtures.stateInstalledRestart.state, pendingRestart: false };
    if (restart) return { state: {}, pendingRestart: true };
    return fixtures.stateEmpty;
}

function sendHtml(res, body) {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.end(body);
}

function sendJson(res, obj, status = 200) {
    res.statusCode = status;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify(obj));
}

async function readBody(req) {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    if (!chunks.length) return {};
    try {
        return JSON.parse(Buffer.concat(chunks).toString("utf8"));
    } catch {
        return {};
    }
}

const server = createServer(async (req, res) => {
    const url = new URL(req.url, `http://${HOST}:${PORT}`);
    const path = url.pathname;
    const q = url.searchParams;
    // Strip CR/LF/tab so a crafted request line can't forge extra log entries.
    console.log(`${req.method} ${req.url}`.replace(/[\r\n\t]/g, " "));

    // --- Page routes ---------------------------------------------------------
    if (req.method === "GET" && (path === "/" || path === "/catalog")) {
        activeState = selectState(q);
        return sendHtml(
            res,
            renderCatalogHtml(INSTANCE, fixtures.catalog, {
                filter: q.get("filter") || "",
                category: q.get("category") || "all",
                source: q.get("source") || "",
                config: fixtures.config,
            }),
        );
    }
    if (req.method === "GET" && path === "/setup") {
        return sendHtml(res, renderSetupHtml(fixtures.subscriptions));
    }
    if (req.method === "GET" && path === "/error") {
        return sendHtml(res, renderErrorHtml(q.get("message") || "Something went wrong loading connectors."));
    }
    if (req.method === "GET" && path === "/fake-consent") {
        return sendHtml(res, "<!doctype html><meta charset=utf-8><title>Consent</title><body style=\"font-family:sans-serif;padding:2rem\">Fake Microsoft consent page (preview). Close this tab.</body>");
    }

    // --- Stubbed API endpoints ----------------------------------------------
    if (req.method === "GET" && path === "/api/state") {
        return sendJson(res, activeState);
    }
    if (req.method === "GET" && path === "/api/gateways") {
        return sendJson(res, { gateways: fixtures.gateways, hasMore: false });
    }
    if (req.method === "GET" && path === "/oauth-status") {
        // Stay pending forever so the connecting spinner keeps animating for a
        // screenshot. Flip to { done: true } if you want the full success flow.
        return sendJson(res, { done: false });
    }

    if (req.method === "POST") {
        await readBody(req);
        switch (path) {
            case "/api/select-gateway":
                return sendJson(res, { ok: true });
            case "/api/install":
                return sendJson(res, fixtures.installNeedsConsent);
            case "/api/finish-install":
                activeState = { ...activeState, pendingRestart: true };
                return sendJson(res, { ok: true });
            case "/api/ack-restart":
                activeState = { ...activeState, pendingRestart: false };
                return sendJson(res, { ok: true });
            case "/api/uninstall":
                return sendJson(res, { ok: true });
            case "/api/open-url":
                // Preview no-op: do NOT actually launch a browser tab.
                return sendJson(res, { ok: true });
            case "/api/rollback-connection":
                return sendJson(res, { ok: true });
            default:
                return sendJson(res, { error: `unstubbed POST ${path}` }, 404);
        }
    }

    res.statusCode = 404;
    res.end("not found");
});

server.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
        console.error(`Port ${PORT} is already in use. Stop the other process or change PORT in server.mjs.`);
        process.exit(1);
    }
    throw err;
});

server.listen(PORT, HOST, () => {
    console.log(`canvas preview server: http://${HOST}:${PORT}/`);
    console.log("  /                 catalog (empty state)");
    console.log("  /?restart=1       catalog with restart banner visible");
    console.log("  /?installed=1     catalog with one connector added");
    console.log("  /setup            namespace picker");
    console.log("  /error            error state");
    console.log("Press Ctrl+C to stop.");
});
