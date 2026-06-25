// Extension: chromium-control-canvas
// Launches a real headful Chromium window via Playwright and uses the canvas
// panel as a control strip (URL bar, back, forward, reload, screenshot,
// snapshot/click/type).
//
// Why this shape: the host app renders canvases in a WebKit (WKWebView) webview,
// not Chromium. To get a true Chromium engine we run the browser as a separate
// headful window owned by this extension process and drive it with Playwright.
// The canvas iframe is only the control surface; it POSTs commands to a
// per-instance loopback HTTP server, which calls Playwright on the page. The
// same handlers are exposed as agent-callable canvas actions.
//
// Patterns borrowed from AndreaGriffiths11/claw-relay (grep "[claw-relay]" below
// for the exact spots):
//   - persistent profile so logins survive restarts
//   - optional connect-to-existing-Chrome over CDP instead of relaunching
//   - a real action set (snapshot/click/type/screenshot), not just navigation
//   - ref-based element resolution from a snapshot, or raw CSS selector
//   - a site blocklist guard and a JSONL audit log
// Intentionally omitted: raw `evaluate` (arbitrary JS execution).

import { randomUUID } from "node:crypto";
import { appendFile, mkdir, readFile, readlink, rm, stat, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
	CanvasError,
	createCanvas,
	joinSession,
} from "@github/copilot-sdk/extension";
import { chromium } from "playwright";

const __dirname = dirname(fileURLToPath(import.meta.url));

const COPILOT_HOME = process.env.COPILOT_HOME || join(homedir(), ".copilot");
const EXT_HOME = join(COPILOT_HOME, "extensions", "chromium-control-canvas");
// [claw-relay] Persistent profile: cookies/logins survive canvas closes,
// reloads, and sessions, so a hand-login in the window sticks.
const PROFILE_DIR = join(EXT_HOME, "profile");
const ARTIFACTS_DIR = join(EXT_HOME, "artifacts");
const AUDIT_LOG = join(EXT_HOME, "audit.log");

// [claw-relay] Site blocklist guard.
// Sites the agent may never drive. Edit this list to taste. Patterns match the
// hostname; a leading "*." matches any subdomain. Navigation to a blocked host
// is refused before Chromium is told to go there.
const BLOCKLIST = [
	"*.bank.com",
	"*.chase.com",
	"*.paypal.com",
	"accounts.google.com",
];

// One Chromium context + control-strip server per open canvas instance.
const instances = new Map(); // instanceId -> { context, browser, page, server, url, mode }

// Per-launch secret, templated into index.html and required on every state route
// so cross-origin pages in the user's normal browser can't POST to this server.
const TOKEN = randomUUID();

let log = (..._args) => {};

function hostMatches(host, pattern) {
	if (pattern.startsWith("*.")) {
		const base = pattern.slice(2);
		return host === base || host.endsWith(`.${base}`);
	}
	return host === pattern;
}

function blockedReason(targetUrl) {
	let host;
	try {
		host = new URL(targetUrl).hostname;
	} catch (_) {
		return null;
	}
	const hit = BLOCKLIST.find((p) => hostMatches(host, p));
	return hit ? `${host} is blocked by the Chromium Control Canvas blocklist (${hit})` : null;
}

function normalizeUrl(input) {
	const raw = String(input ?? "").trim();
	if (!raw) return "about:blank";
	if (raw === "about:blank") return raw;
	const scheme = raw.match(/^([a-z][a-z0-9+.-]*):/i)?.[1]?.toLowerCase();
	if (scheme) {
		if (scheme === "http" || scheme === "https") return raw;
		throw new CanvasError("unsupported_scheme", "Only http and https URLs are supported.");
	}
	// Local dev servers have no dot; send them to http, not search.
	if (/^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?([/?#]|$)/i.test(raw)) return `http://${raw}`;
	if (!/\s/.test(raw) && /\.[a-z]{2,}/i.test(raw)) return `https://${raw}`;
	return `https://www.google.com/search?q=${encodeURIComponent(raw)}`;
}

// [claw-relay] JSONL audit log: one line per action (panel or agent) for a
// reviewable trail of what drove the browser.
async function audit(entry) {
	const line = JSON.stringify({ at: new Date().toISOString(), ...entry });
	await mkdir(EXT_HOME, { recursive: true }).catch(() => {});
	await appendFile(AUDIT_LOG, `${line}\n`).catch(() => {});
}

// Keep secrets out of the audit log: redact free-text fields (e.g. a typed
// password) while preserving the rest of the entry for the trail.
function redactInput(input) {
	if (input && typeof input === "object" && "text" in input) {
		return { ...input, text: "[redacted]" };
	}
	return input;
}

async function pageState(page) {
	let url = "about:blank";
	let title = "";
	try {
		url = page.url();
	} catch (_) {}
	try {
		title = await page.title();
	} catch (_) {}
	return { url, title };
}

function getInstance(instanceId) {
	const entry = instances.get(instanceId);
	if (!entry) {
		throw new CanvasError(
			"no_instance",
			"No open Chromium canvas for this instance. Open the canvas first.",
		);
	}
	return entry;
}

// Return a usable page for the instance, recovering if the user closed the tab
// or window. Reuses an open tab, opens a new one in the live context, or (for
// persistent mode) relaunches the browser in place.
async function livePage(entry) {
	if (entry.page && !entry.page.isClosed()) return entry.page;
	try {
		const open = entry.context?.pages().find((p) => !p.isClosed());
		entry.page = open || (await entry.context.newPage());
		return entry.page;
	} catch (_) {
		// Context/browser is gone below.
	}
	if (entry.mode === "persistent") {
		// Memoize the relaunch so two concurrent panel requests after a crash
		// don't race launchPersistentContext into the lock error we handle below.
		if (!entry.relaunching) {
			entry.relaunching = (async () => {
				await mkdir(PROFILE_DIR, { recursive: true });
				await clearStaleLockIfDead();
				const context = await chromium.launchPersistentContext(PROFILE_DIR, PERSISTENT_OPTS);
				await installGuards(context);
				entry.context = context;
				entry.page = context.pages()[0] || (await context.newPage());
				return entry.page;
			})();
			entry.relaunching.then(
				() => {
					entry.relaunching = null;
				},
				() => {
					entry.relaunching = null;
				},
			);
		}
		return entry.relaunching;
	}
	throw new CanvasError(
		"disconnected",
		"The Chrome connection was lost. Close this panel and reopen the canvas.",
	);
}

async function navigate(page, rawUrl) {
	const url = normalizeUrl(rawUrl);
	const reason = blockedReason(url);
	if (reason) throw new CanvasError("site_blocked", reason);
	await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
	return pageState(page);
}

// [claw-relay] ref-based element resolution. Resolve an element target to a
// Playwright selector. `selector` wins over `ref` when both are given. `ref`
// values come from a prior snapshot and are stamped onto the DOM as
// data-cc-ref attributes.
function resolveTarget(input) {
	if (input?.selector) return input.selector;
	if (input?.ref) return `[data-cc-ref="${String(input.ref).replace(/"/g, "")}"]`;
	throw new CanvasError("bad_target", "Provide a `ref` (from snapshot) or a `selector`.");
}

// [claw-relay] Accessibility-style page snapshot: enumerate visible interactive
// elements and stamp each with a stable ref (e1, e2, ...) the agent can target.
const SNAPSHOT_FN = () => {
	const sel = [
		"a[href]",
		"button",
		"input",
		"textarea",
		"select",
		"[role=button]",
		"[role=link]",
		"[role=textbox]",
		"[role=checkbox]",
		"[onclick]",
		'[contenteditable=""]',
		'[contenteditable="true"]',
	].join(",");
	const out = [];
	let i = 0;
	// Clear refs from a prior snapshot so a renumbered ref can't match a stale
	// element that scrolled out of view.
	for (const stamped of document.querySelectorAll("[data-cc-ref]")) {
		stamped.removeAttribute("data-cc-ref");
	}
	for (const el of document.querySelectorAll(sel)) {
		const rect = el.getBoundingClientRect();
		const style = getComputedStyle(el);
		const visible =
			rect.width > 0 &&
			rect.height > 0 &&
			style.visibility !== "hidden" &&
			style.display !== "none";
		if (!visible) continue;
		i += 1;
		if (i > 200) break;
		const ref = `e${i}`;
		el.setAttribute("data-cc-ref", ref);
		const name = (
			el.getAttribute("aria-label") ||
			el.getAttribute("placeholder") ||
			(el.type === "password" ? "" : el.value) ||
			el.innerText ||
			el.getAttribute("title") ||
			""
		)
			.trim()
			.replace(/\s+/g, " ")
			.slice(0, 80);
		out.push({
			ref,
			tag: el.tagName.toLowerCase(),
			type: el.getAttribute("type") || el.getAttribute("role") || "",
			name,
		});
	}
	return out;
};

async function snapshot(page) {
	const elements = await page.evaluate(SNAPSHOT_FN);
	return { ...(await pageState(page)), elements };
}

async function clickTarget(page, input) {
	const selector = resolveTarget(input);
	await page.click(selector, { timeout: 15000 });
	return pageState(page);
}

async function typeTarget(page, input) {
	const text = String(input?.text ?? "");
	const selector = resolveTarget(input);
	const locator = page.locator(selector).first();
	await locator.fill(text, { timeout: 15000 });
	if (input?.submit) await locator.press("Enter").catch(() => {});
	return pageState(page);
}

async function screenshot(page, opts = {}) {
	await mkdir(ARTIFACTS_DIR, { recursive: true });
	const stamp = new Date().toISOString().replace(/[:.]/g, "-");
	const name = `shot-${stamp}.png`;
	const buffer = await page.screenshot({ fullPage: !!opts.fullPage });
	await writeFile(join(ARTIFACTS_DIR, name), buffer);
	return { name, path: join(ARTIFACTS_DIR, name), size: buffer.length };
}

function sendJson(res, status, body) {
	res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
	res.end(JSON.stringify(body));
}

function publicErrorMessage(err, fallback) {
	return err instanceof CanvasError ? err.message : fallback;
}

async function readBody(req) {
	const chunks = [];
	for await (const chunk of req) chunks.push(chunk);
	return Buffer.concat(chunks).toString("utf-8");
}

async function readJson(req) {
	try {
		const body = await readBody(req);
		return body ? JSON.parse(body) : {};
	} catch (_) {
		throw new CanvasError("bad_json", "Invalid JSON request body.");
	}
}

function makeHandler(entry) {
	return async function handleRequest(req, res) {
		const reqUrl = new URL(req.url, "http://127.0.0.1");
		const { pathname } = reqUrl;

		if (req.method === "GET" && (pathname === "/" || pathname === "/index.html")) {
			if (reqUrl.searchParams.get("token") !== TOKEN) {
				sendJson(res, 403, { error: "forbidden" });
				return;
			}
			const html = (await readFile(join(__dirname, "index.html"), "utf-8")).replaceAll("__TOKEN__", TOKEN);
			res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
			res.end(html);
			return;
		}

		if (req.method === "GET" && pathname.startsWith("/shot/")) {
			if (req.headers["x-canvas-token"] !== TOKEN && reqUrl.searchParams.get("token") !== TOKEN) {
				sendJson(res, 403, { error: "forbidden" });
				return;
			}
			const name = decodeURIComponent(pathname.slice("/shot/".length));
			if (!/^shot-[\w-]+\.png$/.test(name)) {
				sendJson(res, 400, { error: "invalid name" });
				return;
			}
			const shotPath = join(ARTIFACTS_DIR, name);
			const exists = await stat(shotPath).then(() => true, () => false);
			if (!exists) {
				sendJson(res, 404, { error: "not found" });
				return;
			}
			const bytes = await readFile(shotPath);
			res.writeHead(200, { "Content-Type": "image/png", "Cache-Control": "no-store" });
			res.end(bytes);
			return;
		}

		// Every state route below requires the per-launch token templated into
		// index.html. A cross-origin page can't read it, and the custom header
		// also forces a CORS preflight this server never answers with allow.
		if (req.headers["x-canvas-token"] !== TOKEN) {
			sendJson(res, 403, { error: "forbidden" });
			return;
		}

		const page = await livePage(entry);

		if (req.method === "GET" && pathname === "/state") {
			sendJson(res, 200, { ...(await pageState(page)), mode: entry.mode });
			return;
		}

		if (req.method === "POST" && pathname === "/navigate") {
			try {
				const body = await readJson(req);
				const state = await navigate(page, body?.url);
				await audit({ source: "panel", instanceId: entry.instanceId, action: "navigate", input: body?.url, url: state.url, ok: true });
				sendJson(res, 200, state);
			} catch (err) {
				await audit({ source: "panel", instanceId: entry.instanceId, action: "navigate", ok: false, error: publicErrorMessage(err, "Navigation failed.") });
				sendJson(res, 200, { ...(await pageState(page)), error: publicErrorMessage(err, "Navigation failed.") });
			}
			return;
		}

		const simple = { "/back": "goBack", "/forward": "goForward", "/reload": "reload" };
		if (req.method === "POST" && simple[pathname]) {
			const actionName = pathname.slice(1);
			try {
				await page[simple[pathname]]({ waitUntil: "domcontentloaded" });
				const state = await pageState(page);
				await audit({ source: "panel", instanceId: entry.instanceId, action: actionName, url: state.url, ok: true });
				sendJson(res, 200, state);
			} catch (err) {
				await audit({ source: "panel", instanceId: entry.instanceId, action: actionName, ok: false, error: publicErrorMessage(err, `${actionName} failed.`) });
				sendJson(res, 200, { ...(await pageState(page)), error: publicErrorMessage(err, `${actionName} failed.`) });
			}
			return;
		}

		if (req.method === "POST" && pathname === "/screenshot") {
			try {
				const shot = await screenshot(page);
				await audit({ source: "panel", instanceId: entry.instanceId, action: "screenshot", url: page.url(), ok: true });
				sendJson(res, 200, shot);
			} catch (err) {
				await audit({ source: "panel", instanceId: entry.instanceId, action: "screenshot", ok: false, error: publicErrorMessage(err, "Screenshot failed.") });
				sendJson(res, 200, { error: publicErrorMessage(err, "Screenshot failed.") });
			}
			return;
		}

		sendJson(res, 404, { error: "not found" });
	};
}

async function startServer(entry) {
	const handler = makeHandler(entry);
	const server = createServer((req, res) => {
		handler(req, res).catch((err) => {
			sendJson(res, 500, { error: publicErrorMessage(err, "Request failed.") });
		});
	});
	await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
	const address = server.address();
	const port = typeof address === "object" && address ? address.port : 0;
	return { server, url: `http://127.0.0.1:${port}/?token=${encodeURIComponent(TOKEN)}` };
}

const PERSISTENT_OPTS = { headless: false, viewport: null };

// [claw-relay] Enforce the blocklist on real navigations, not just explicit
// navigate() calls, so in-page redirects are caught too. Every request
// round-trips through Node, which is fine at agent/human browsing pace.
async function installGuards(context) {
	await context.route("**/*", (route) => {
		const req = route.request();
		if (req.isNavigationRequest() && blockedReason(req.url())) {
			return route.abort("blockedbyclient");
		}
		return route.continue();
	});
}

// Chromium writes a SingletonLock symlink (target: "<host>-<pid>") into the
// profile while a window owns it. A reload or killed process can leave that
// lock behind even though no Chromium is running. If the referenced PID is
// dead, the lock is stale and safe to clear; if it's alive, a real window
// owns the profile and we must not touch it.
async function clearStaleLockIfDead() {
	const lockPath = join(PROFILE_DIR, "SingletonLock");
	let target;
	try {
		target = await readlink(lockPath);
	} catch (_) {
		return false; // no lock present
	}
	const pid = Number(target.split("-").pop());
	if (Number.isFinite(pid) && pid > 0) {
		try {
			process.kill(pid, 0); // throws if the process is gone
			return false; // alive -> a real window owns the profile
		} catch (err) {
			if (err?.code === "EPERM") return false; // exists, not ours -> leave it
		}
	}
	for (const f of ["SingletonLock", "SingletonSocket", "SingletonCookie"]) {
		await rm(join(PROFILE_DIR, f), { force: true }).catch(() => {});
	}
	return true;
}

async function openInstance(instanceId, input) {
	const cdpUrl = input?.cdpUrl;
	let context;
	let browser = null;
	let mode;
	if (cdpUrl) {
		// [claw-relay] Connect to an already-running Chrome over CDP (started with
		// --remote-debugging-port) instead of launching our own window.
		browser = await chromium.connectOverCDP(cdpUrl);
		context = browser.contexts()[0] || (await browser.newContext());
		mode = "cdp";
	} else {
		// One shared persistent profile can only back one live Chromium window.
		// Refuse a second persistent instance with a readable message instead of
		// a cryptic Playwright lock dump.
		for (const e of instances.values()) {
			if (e.mode === "persistent") {
				throw new CanvasError(
					"profile_busy",
					"A Chromium canvas is already open. Close it before opening another — they share one logged-in profile.",
				);
			}
		}
		// Persistent profile: same Chromium user-data-dir every time, so logins
		// you complete by hand in the window survive across sessions.
		await mkdir(PROFILE_DIR, { recursive: true });
		try {
			context = await chromium.launchPersistentContext(PROFILE_DIR, PERSISTENT_OPTS);
		} catch (err) {
			if (!/existing browser session/i.test(String(err?.message))) throw err;
			const cleared = await clearStaleLockIfDead();
			if (!cleared) {
				throw new CanvasError(
					"profile_busy",
					"The Chromium profile is in use by another live window. Close that Chromium window first.",
				);
			}
			context = await chromium.launchPersistentContext(PROFILE_DIR, PERSISTENT_OPTS);
		}
		mode = "persistent";
	}
	await installGuards(context);
	const page = context.pages()[0] || (await context.newPage());
	const entry = { instanceId, context, browser, page, mode };
	if (input?.url) {
		await navigate(page, input.url);
	}
	const { server, url } = await startServer(entry);
	entry.server = server;
	entry.url = url;
	instances.set(instanceId, entry);
	await audit({ instanceId, action: "open", mode, url: input?.url || "about:blank" });
	return entry;
}

async function closeInstance(instanceId) {
	const entry = instances.get(instanceId);
	if (!entry) return;
	instances.delete(instanceId);
	await new Promise((resolve) => {
		entry.server.closeAllConnections?.();
		entry.server.close(() => resolve());
	}).catch(() => {});
	if (entry.mode === "cdp") {
		// Don't kill the user's own Chrome; just disconnect.
		await entry.browser?.close().catch(() => {});
	} else {
		await entry.context.close().catch(() => {});
	}
	await audit({ instanceId, action: "close", mode: entry.mode });
}

// Wrap a canvas action handler so every agent-driven call is audited.
function action(name, description, run, inputSchema) {
	return {
		name,
		description,
		...(inputSchema ? { inputSchema } : {}),
		handler: async (ctx) => {
			const entry = getInstance(ctx.instanceId);
			try {
				const page = await livePage(entry);
				const result = await run(page, ctx.input, entry);
				const state = result?.url ? result : await pageState(page);
				await audit({ source: "agent", instanceId: ctx.instanceId, action: name, input: redactInput(ctx.input), url: state.url, ok: true });
				return result;
			} catch (err) {
				await audit({ source: "agent", instanceId: ctx.instanceId, action: name, input: redactInput(ctx.input), ok: false, error: publicErrorMessage(err, "Action failed.") });
				throw err;
			}
		},
	};
}

const session = await joinSession({
	canvases: [
		createCanvas({
			id: "chromium-control-canvas",
			displayName: "Chromium Control Canvas",
			description:
				"Opens a real Chromium window you can navigate and interact with from a Copilot canvas control panel and agent actions.",
			inputSchema: {
				type: "object",
				properties: {
					url: { type: "string", description: "Optional URL to open on launch." },
					cdpUrl: {
						type: "string",
						description:
							"Optional CDP endpoint (e.g. http://localhost:9222) to attach to an existing Chrome instead of launching one.",
					},
				},
			},
			actions: [
				action(
					"navigate",
					"Navigate to a URL or search query (blocklist enforced).",
					(page, input) => navigate(page, input?.url),
					{
						type: "object",
						properties: { url: { type: "string", description: "URL (https assumed) or search query." } },
						required: ["url"],
					},
				),
				action("back", "Go back in history.", async (page) => {
					await page.goBack({ waitUntil: "domcontentloaded" }).catch(() => {});
					return pageState(page);
				}),
				action("forward", "Go forward in history.", async (page) => {
					await page.goForward({ waitUntil: "domcontentloaded" }).catch(() => {});
					return pageState(page);
				}),
				action("reload", "Reload the current page.", async (page) => {
					await page.reload({ waitUntil: "domcontentloaded" }).catch(() => {});
					return pageState(page);
				}),
				action("current_url", "Get the current URL and page title.", (page) => pageState(page)),
				action(
					"snapshot",
					"List visible interactive elements with stable refs (e1, e2, ...) for click/type.",
					(page) => snapshot(page),
				),
				action(
					"click",
					"Click an element by `ref` (from snapshot) or CSS `selector`.",
					(page, input) => clickTarget(page, input),
					{
						type: "object",
						properties: {
							ref: { type: "string", description: "Element ref from a snapshot, e.g. e3." },
							selector: { type: "string", description: "CSS selector (takes priority over ref)." },
						},
					},
				),
				action(
					"type",
					"Fill text into an input by `ref` or `selector`; set submit to press Enter.",
					(page, input) => typeTarget(page, input),
					{
						type: "object",
						properties: {
							text: { type: "string", description: "Text to enter." },
							ref: { type: "string", description: "Element ref from a snapshot." },
							selector: { type: "string", description: "CSS selector (takes priority over ref)." },
							submit: { type: "boolean", description: "Press Enter after filling." },
						},
						required: ["text"],
					},
				),
				action(
					"screenshot",
					"Capture a PNG of the page, saved under the extension artifacts dir.",
					(page, input) => screenshot(page, { fullPage: input?.fullPage }),
					{
						type: "object",
						properties: { fullPage: { type: "boolean", description: "Capture the full scrollable page." } },
					},
				),
			],
			open: async (ctx) => {
				let entry = instances.get(ctx.instanceId);
				if (!entry) {
					entry = await openInstance(ctx.instanceId, ctx.input || {});
					log(`Launched Chromium (${entry.mode}) for instance ${ctx.instanceId}`, {
						level: "info",
						ephemeral: true,
					});
				}
				return { title: "Chromium Control Canvas", url: entry.url };
			},
			onClose: async (ctx) => {
				await closeInstance(ctx.instanceId);
			},
		}),
	],
});

log = (message, opts) => session.log(message, opts);

// Close Chromium contexts on shutdown so reloading the extension doesn't orphan
// the window and leave a stale profile lock behind. The runtime sends SIGTERM
// (then SIGKILL after ~5s), so keep teardown fast.
let shuttingDown = false;
async function shutdown() {
	if (shuttingDown) return;
	shuttingDown = true;
	await Promise.allSettled(
		[...instances.keys()].map((id) => closeInstance(id)),
	);
	process.exit(0);
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
