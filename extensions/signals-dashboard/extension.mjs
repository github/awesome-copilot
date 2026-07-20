// Extension: signals-dashboard
// Live dashboard showing agent signals from workshop desks.
// Scans desks/*/.signals/ for JSON files, renders the latest signal per desk.
// Supports stashing desks (48hr hold) and restoring them.

import { createServer } from "node:http";
import { statSync, accessSync, realpathSync, constants as fsConstants } from "node:fs";
import { readdir, readFile, writeFile, stat } from "node:fs/promises";
import { join, delimiter, sep } from "node:path";
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { joinSession, createCanvas } from "@github/copilot-sdk/extension";

const servers = new Map();
const STASH_TTL_MS = 48 * 60 * 60 * 1000;

// Serialize stash read-modify-write per workshop. The UI fires stash/restore
// POSTs without awaiting each other, so two overlapping mutations could both
// read the same array and the last write would silently drop the other. Each
// workshop gets a promise chain so its mutations run one at a time.
const stashLocks = new Map();
function withStashLock(workshopDir, fn) {
    const prev = stashLocks.get(workshopDir) || Promise.resolve();
    const run = prev.then(fn, fn);
    stashLocks.set(workshopDir, run.then(() => {}, () => {}));
    return run;
}

// Desk names are single path segments (folder names under desks/ or classroom/).
// Reject anything that could escape the workshop dir via path traversal.
function isValidDeskName(name) {
    return typeof name === "string" && name.length > 0 && name.length <= 128 &&
        !name.includes("/") && !name.includes("\\") && !name.includes("\0") &&
        name !== "." && name !== "..";
}

// Launch a desk as an in-place Copilot CLI session — the canvas counterpart to
// WorkshopRoom's ConsoleLauncher. A desk is a seat that independent sessions
// pick up over time, so "open" starts a fresh copilot in the desk's own folder,
// oriented to read the journal and continue. This keeps every desk inside the
// one workshop repo (coordinated through journals + .signals + Cairn) instead
// of spinning off an isolated worktree elsewhere on disk.
//
// deskPath has already been confirmed to exist by the caller. We additionally
// reject a path containing a double-quote before quoting it onto a command line
// (a real Windows path cannot contain one), mirroring ConsoleLauncher.SafeDir,
// so a planted workshop path can never break out of the -d "..." argument.
function deskOrientPrompt(deskName) {
    return `You are sitting down at the ${deskName} desk in this workshop. ` +
        `Read journal.md in this folder first to pick up where the last session ` +
        `left off, then continue the desk's work. Write your journal before you stop.`;
}

// Spawn detached and resolve true only once the OS confirms the process
// started ('spawn'), false on failure ('error', e.g. the binary is missing) so
// the caller can fall back. A short timer guards the rare case neither fires.
function trySpawn(cmd, args, opts = {}) {
    return new Promise((resolve) => {
        let settled = false;
        const done = (v, child) => {
            if (settled) return;
            settled = true;
            if (v && child) { try { child.unref(); } catch {} }
            resolve(v);
        };
        try {
            const child = spawn(cmd, args, { detached: true, stdio: "ignore", ...opts });
            child.on("error", () => done(false));
            child.on("spawn", () => done(true, child));
            setTimeout(() => done(true, child), 600);
        } catch { resolve(false); }
    });
}

// Resolve an executable on PATH (honoring PATHEXT on Windows), mirroring
// WorkshopRoom's AgentClis.IsOnPath. Used to prefer Agency when the machine has
// it installed, falling back to vanilla Copilot.
// A PATH hit only counts if it resolves to a real, runnable file. existsSync
// alone would treat a directory or a non-executable file named `agency` as a
// match, so auto-detection would pick the wrapper and the terminal would then
// fail to run it with no fallback.
function isExecutableFile(p) {
    try {
        if (!statSync(p).isFile()) return false;
        if (process.platform !== "win32") accessSync(p, fsConstants.X_OK);
        return true;
    } catch { return false; }
}

function isOnPath(command) {
    try {
        const dirs = (process.env.PATH || "").split(delimiter);
        const exts = process.platform === "win32"
            ? (process.env.PATHEXT || ".EXE;.CMD;.BAT").split(";").filter(Boolean)
            : [];
        for (const dir of dirs) {
            if (!dir) continue;
            // On Windows only a PATHEXT match is runnable; on POSIX check the bare
            // name, and isExecutableFile confirms the execute bit either way.
            if (exts.length) {
                for (const ext of exts) if (isExecutableFile(join(dir, command + ext))) return true;
            } else if (isExecutableFile(join(dir, command))) {
                return true;
            }
        }
    } catch {}
    return false;
}

// The agent argv a desk opens with. Default: prefer Agency (the internal
// wrapper around Copilot) when it's installed, so a desk comes up with its
// MCPs/plugin already configured instead of bare GHCP; otherwise vanilla
// Copilot. Agency can't take Copilot's --name (it clashes with Agency's own
// --resume), matching AgentClis. Override with WORKSHOP_DESK_AGENT=copilot to
// force vanilla, or =agency to insist on the wrapper.
function deskAgentArgv(deskName) {
    const pref = (process.env.WORKSHOP_DESK_AGENT || "").trim().toLowerCase();
    // An explicit override is authoritative: =agency insists on the wrapper even
    // when it isn't detected on PATH, and =copilot forces vanilla. Only when the
    // override is unset do we auto-detect and prefer Agency if it's installed.
    const useAgency = pref === "agency" ? true
        : pref === "copilot" ? false
        : isOnPath("agency");
    return useAgency ? ["agency", "copilot"] : ["copilot", "--name", deskName];
}

// A desk name flows onto a command line, and on the no-wt Windows fallback
// through cmd.exe. isValidDeskName still allows shell metacharacters such as
// & | > % ^, so the launcher additionally requires a conservative slug before
// any shell can see the name; anything else refuses to launch and the caller
// falls back to copying the path. Combined with the quote-free orientation
// prompt, no untrusted text ever reaches a shell parser.
function isSafeDeskNameForLaunch(name) {
    return isValidDeskName(name) && /^[A-Za-z0-9._-]+$/.test(name);
}

// POSIX single-quote a value for the macOS `do script` command line, escaping
// any embedded single quotes.
function shSingleQuote(s) {
    return "'" + String(s).replace(/'/g, "'\\''") + "'";
}

// AppleScript string literal: escape backslashes and double quotes.
function osaStringLiteral(s) {
    return '"' + String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"') + '"';
}

// Resolve symlinks on both sides and confirm the target is the workshop root
// itself or lives beneath it. The callers locate a desk with stat(), which
// follows symlinks, so a committed desks/foo -> /outside symlink would otherwise
// launch the agent with an external working directory, breaking the inside-repo
// guarantee.
function isInsideRoot(root, target) {
    try {
        const r = realpathSync(root);
        const t = realpathSync(target);
        return t === r || t.startsWith(r + sep);
    } catch { return false; }
}

async function launchDeskConsole(deskPath, deskName, workshopDir) {
    // deskPath can't contain a double quote (a real Windows path never does and
    // it would break out of a quoted argument). deskName must be a plain slug so
    // it is safe on every command line and shell below, and the resolved desk
    // must still live inside the workshop root (which defeats a symlinked desk
    // that escapes the repo).
    if (!deskPath || deskPath.includes('"')) return false;
    if (!isSafeDeskNameForLaunch(deskName)) return false;
    if (!isInsideRoot(workshopDir, deskPath)) return false;
    const run = [...deskAgentArgv(deskName), "-i", deskOrientPrompt(deskName)];
    if (process.platform === "win32") {
        // Windows Terminal is a GUI app, so it always surfaces its own visible
        // window even though the extension host is windowless. It is spawned via
        // argv (no shell), so the contents of run are passed literally.
        if (await trySpawn("wt.exe", ["-d", deskPath, ...run])) return true;
        // Fallback when wt.exe is absent: a fresh console window via `start`.
        // `start` re-parses its tail through cmd, so this path is only safe
        // because deskName is a slug and the orientation prompt carries no shell
        // metacharacters or quotes; nothing untrusted reaches the parser.
        return await trySpawn("cmd.exe", ["/c", "start", "", ...run], { cwd: deskPath });
    }
    if (process.platform === "darwin") {
        // macOS: `open` can't inject a command, so drive Terminal via AppleScript
        // to cd into the desk and exec the agent. Each argv element is POSIX
        // single-quoted so the shell can't reinterpret it, and osascript itself
        // is spawned via argv (no shell).
        const line = "cd " + shSingleQuote(deskPath) + " && exec " +
            run.map(shSingleQuote).join(" ");
        const script = 'tell application "Terminal"\n' +
            "  activate\n" +
            "  do script " + osaStringLiteral(line) + "\n" +
            "end tell";
        return await trySpawn("osascript", ["-e", script]);
    }
    // Linux/other: best-effort across common terminal emulators. Each is spawned
    // via argv (no shell) with the agent command after the emulator's exec flag,
    // so the desk actually comes up running its agent instead of a bare shell.
    const linuxTerms = [
        ["x-terminal-emulator", ["-e", ...run]],
        ["gnome-terminal", ["--", ...run]],
        ["konsole", ["-e", ...run]],
        ["xterm", ["-e", ...run]],
    ];
    for (const [term, args] of linuxTerms) {
        if (await trySpawn(term, args, { cwd: deskPath })) return true;
    }
    return false;
}

// Signal JSON is agent-produced and unvalidated. Coerce numeric fields before
// they reach the renderer so a nonnumeric value cannot inject markup or break
// layout. toScore clamps self-assessment/quality scores to 0..max; toCount
// keeps token counts as finite nonnegative integers.
function toScore(v, max = 5) {
    const n = Number(v);
    if (!Number.isFinite(n)) return 0;
    return Math.max(0, Math.min(max, n));
}
function toCount(v) {
    const n = Number(v);
    if (!Number.isFinite(n) || n < 0) return 0;
    return Math.floor(n);
}

// Prefer an explicit, persisted timestamp over filesystem mtime. A git
// clone/checkout resets mtimes (often to a single instant), which would
// otherwise scramble "latest" ordering and outcome pairing. Signals may carry
// an ISO-8601 `timestamp` (or `emitted_at`); fall back to mtime when absent.
function signalTime(parsed, mtimeMs) {
    const explicit = parsed && (parsed.timestamp || parsed.emitted_at);
    if (explicit) {
        const t = Date.parse(explicit);
        if (Number.isFinite(t)) return t;
    }
    return mtimeMs;
}

// Reject cross-site POSTs to the state-changing /api/* routes (CSRF). The panel
// loads as a top-level loopback document, so its own fetches are same-origin
// (Origin === our loopback origin) and header-less / non-web-scheme callers fall
// through as allowed; a browser page on another origin is blocked.
function isCrossSiteRequest(req) {
    const origin = req.headers.origin;
    if (origin) {
        if (origin === `http://${req.headers.host}`) return false;
        if (origin === "null") return true;
        if (/^https?:\/\//i.test(origin)) return true;
        return false;
    }
    const site = req.headers["sec-fetch-site"];
    return site === "cross-site" || site === "same-site";
}

// Pin the Host header to the exact loopback authority we bound. A DNS-rebinding
// page reaches us under its own hostname (Host: attacker.example:<port>), so an
// exact match against 127.0.0.1:<port> refuses those requests before any state
// change — Origin/Host equality alone doesn't, since the attacker controls both.
function isCanonicalHost(req, canonicalHost) {
    return String(req.headers.host || "").toLowerCase() === String(canonicalHost || "").toLowerCase();
}

// Capability check for the per-server token minted at startup and embedded in
// the page we serve. Only the loopback document we rendered knows it, so a blind
// cross-origin/rebinding caller can't forge a mutating request even if it
// reached the socket.
function hasCapabilityToken(req, token) {
    const header = req.headers["x-workshop-token"];
    const provided = Array.isArray(header) ? header[0] : header;
    return typeof provided === "string" && provided.length > 0 && provided === token;
}

// --- Stash management ---

async function readStash(workshopDir) {
    const fp = join(workshopDir, ".desk-stash.json");
    try {
        const raw = await readFile(fp, "utf-8");
        const stash = JSON.parse(raw);
        const now = Date.now();
        const live = stash.filter(e => (now - new Date(e.stashedAt).getTime()) < STASH_TTL_MS);
        if (live.length !== stash.length) await writeStash(workshopDir, live);
        return live;
    } catch { return []; }
}

async function writeStash(workshopDir, entries) {
    const fp = join(workshopDir, ".desk-stash.json");
    await writeFile(fp, JSON.stringify(entries, null, 2), "utf-8");
}

async function stashDesk(workshopDir, deskName) {
    return withStashLock(workshopDir, async () => {
        const stash = await readStash(workshopDir);
        if (stash.some(e => e.name === deskName)) return stash;
        stash.push({ name: deskName, stashedAt: new Date().toISOString() });
        await writeStash(workshopDir, stash);
        return stash;
    });
}

async function restoreDesk(workshopDir, deskName) {
    return withStashLock(workshopDir, async () => {
        let stash = await readStash(workshopDir);
        stash = stash.filter(e => e.name !== deskName);
        await writeStash(workshopDir, stash);
        return stash;
    });
}

// --- Signal reading ---

async function scanSignals(workshopDir) {
    const results = [];
    for (const subdir of ["desks", "classroom"]) {
        const parent = join(workshopDir, subdir);
        let entries;
        try { entries = await readdir(parent, { withFileTypes: true }); }
        catch { continue; }

        for (const entry of entries) {
            if (!entry.isDirectory() || entry.name.startsWith(".")) continue;
            const sigDir = join(parent, entry.name, ".signals");
            let sigFiles;
            try { sigFiles = await readdir(sigDir); }
            catch {
                results.push({
                    deskName: entry.name, signalType: "none", agentName: entry.name,
                    confidence: 0, accuracy: 0, completeness: 0, intent: 0,
                    whatWorked: "", whatWasHard: "", skillGap: "",
                    escalationReason: null, escalationBlocked: null, recommendation: null,
                    emittedAt: null, signalCount: 0, tokensIn: 0, tokensOut: 0, model: null,
                });
                continue;
            }

            const jsonFiles = sigFiles.filter(f => f.endsWith(".json"));
            if (jsonFiles.length === 0) {
                results.push({
                    deskName: entry.name, signalType: "none", agentName: entry.name,
                    confidence: 0, accuracy: 0, completeness: 0, intent: 0,
                    whatWorked: "", whatWasHard: "", skillGap: "",
                    escalationReason: null, escalationBlocked: null, recommendation: null,
                    emittedAt: null, signalCount: 0, tokensIn: 0, tokensOut: 0, model: null,
                });
                continue;
            }

            // Read all signals, separate by type, find latest execution/partnership + any outcome signals
            let latest = null, latestTime = 0;
            const allSignals = [];
            for (const f of jsonFiles) {
                const fp = join(sigDir, f);
                try {
                    const s = await stat(fp);
                    const raw = await readFile(fp, "utf-8");
                    const parsed = JSON.parse(raw);
                    const emittedMs = signalTime(parsed, s.mtimeMs);
                    allSignals.push({ parsed, mtimeMs: emittedMs, path: fp });
                    // Latest non-outcome signal (execution, partnership, escalation)
                    if ((parsed.signal_type || "execution") !== "outcome" && emittedMs > latestTime) {
                        latestTime = emittedMs; latest = { parsed, mtimeMs: emittedMs };
                    }
                } catch {}
            }
            if (!latest) {
                // Files exist but none parsed into a usable non-outcome signal
                // (malformed JSON, or outcome-only). Keep the desk visible as
                // "awaiting" instead of silently dropping it from the board.
                results.push({
                    deskName: entry.name, signalType: "none", agentName: entry.name,
                    confidence: 0, accuracy: 0, completeness: 0, intent: 0,
                    whatWorked: "", whatWasHard: "", skillGap: "",
                    escalationReason: null, escalationBlocked: null, recommendation: null,
                    emittedAt: null, signalCount: 0, tokensIn: 0, tokensOut: 0, model: null,
                });
                continue;
            }
            try {
                const sig = latest.parsed;
                const intentRaw = sig.intent || sig.self_assessment?.intent || null;

                // Find outcome signal matched by run_id (if any)
                let outcome = null;
                if (sig.run_id) {
                    const outcomeSignals = allSignals
                        .filter(s => s.parsed.signal_type === "outcome" && s.parsed.run_id === sig.run_id);
                    if (outcomeSignals.length > 0) {
                        outcome = outcomeSignals.sort((a, b) => b.mtimeMs - a.mtimeMs)[0].parsed;
                    }
                }
                // Also check for any recent outcome (within 1hr of latest signal) if no run_id match
                if (!outcome) {
                    const recentOutcomes = allSignals
                        .filter(s => s.parsed.signal_type === "outcome" && s.mtimeMs >= latestTime && (s.mtimeMs - latestTime) < 3600000)
                        .sort((a, b) => a.mtimeMs - b.mtimeMs);
                    if (recentOutcomes.length > 0) outcome = recentOutcomes[0].parsed;
                }

                // Compute honesty gap if we have both self-assessment and outcome
                let honestyGap = null;
                if (outcome && sig.self_assessment) {
                    const selfConf = toScore(sig.self_assessment.confidence);
                    const outcomeRating = toScore(outcome.quality_rating);
                    if (selfConf > 0 && outcomeRating > 0) {
                        honestyGap = Math.abs(selfConf - outcomeRating);
                    }
                }

                results.push({
                    deskName: entry.name,
                    signalType: sig.signal_type || "execution",
                    subtype: sig.subtype || sig.signal_type || "execution",
                    agentName: sig.agent_name || entry.name,
                    intentText: typeof intentRaw === "string" ? intentRaw : null,
                    intentScore: toScore(intentRaw),
                    confidence: toScore(sig.self_assessment?.confidence),
                    accuracy: toScore(sig.self_assessment?.accuracy),
                    completeness: toScore(sig.self_assessment?.completeness),
                    whatWorked: sig.patterns?.what_worked || "",
                    whatWasHard: sig.patterns?.what_was_hard || "",
                    skillGap: sig.patterns?.skill_gap || "",
                    escalationReason: sig.escalation?.reason || null,
                    escalationBlocked: sig.escalation?.blocked_on || null,
                    recommendation: sig.escalation?.recommendation || null,
                    emittedAt: new Date(latestTime).toISOString(),
                    signalCount: jsonFiles.length,
                    tokensIn: toCount(sig.usage?.tokens_in),
                    tokensOut: toCount(sig.usage?.tokens_out),
                    model: sig.usage?.model || null,
                    // Outcome signal fields
                    outcomeRating: outcome ? (toScore(outcome.quality_rating) || null) : null,
                    outcomeEffort: outcome?.effort_to_merge || null,
                    outcomeIssues: Array.isArray(outcome?.issues_found) ? outcome.issues_found : [],
                    outcomeAgent: outcome?.agent_name || null,
                    honestyGap: honestyGap,
                });
            } catch {}
        }
    }
    return results;
}

// --- Sorting: escalations → recent signals → no signals ---

function signalSortKey(sig) {
    if (sig.signalType === "escalation") return 0;
    if (sig.signalType === "execution") return 1;
    if (sig.signalType === "partnership") return 1;
    return 2; // "none"
}

function sortSignals(signals) {
    return signals.sort((a, b) => {
        const ka = signalSortKey(a), kb = signalSortKey(b);
        if (ka !== kb) return ka - kb;
        if (a.emittedAt && b.emittedAt) return new Date(b.emittedAt) - new Date(a.emittedAt);
        if (a.emittedAt) return -1;
        if (b.emittedAt) return 1;
        return a.deskName.localeCompare(b.deskName);
    });
}

// --- HTML rendering ---

function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function truncate(s, len) {
    const str = String(s);
    return str.length > len ? str.slice(0, len) + "…" : str;
}
function formatTokens(n) {
    if (!n) return null;
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
    return `${n}`;
}

function scoreBar(value, label, max = 5) {
    const pct = (value / max) * 100;
    const color = value >= 4 ? "#22c55e" : value >= 3 ? "#eab308" : value >= 1 ? "#ef4444" : "#262626";
    return `<div>
        <div style="display:flex;justify-content:space-between;margin-bottom:2px;">
            <span style="font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:.04em;">${label}</span>
            <span style="font-size:10px;color:#94a3b8;">${value}/5</span>
        </div>
        <div style="height:4px;background:#1e293b;border-radius:2px;overflow:hidden;">
            <div style="width:${pct}%;height:100%;background:${color};border-radius:2px;transition:width .3s;"></div>
        </div>
    </div>`;
}

function timeSince(isoDate) {
    if (!isoDate) return "—";
    const diff = Date.now() - new Date(isoDate).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
}

function timeRemaining(stashedAt) {
    const remaining = STASH_TTL_MS - (Date.now() - new Date(stashedAt).getTime());
    if (remaining <= 0) return "expiring";
    const hrs = Math.floor(remaining / 3600000);
    return hrs >= 1 ? `${hrs}h left` : `${Math.floor(remaining / 60000)}m left`;
}

function avgScore(signals) {
    const withSignals = signals.filter(s => s.signalType !== "none");
    if (withSignals.length === 0) return null;
    const avg = (field) => {
        const vals = withSignals.map(s => s[field]).filter(v => v > 0);
        return vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : "—";
    };
    return { confidence: avg("confidence"), accuracy: avg("accuracy"), completeness: avg("completeness"), intent: avg("intentScore") };
}

function renderSummaryBar(activeSignals) {
    const escalations = activeSignals.filter(s => s.signalType === "escalation").length;
    const withSignals = activeSignals.filter(s => s.signalType !== "none").length;
    const awaiting = activeSignals.filter(s => s.signalType === "none").length;
    const avg = avgScore(activeSignals);

    const totalTokens = activeSignals.reduce((sum, s) => sum + (s.tokensIn || 0) + (s.tokensOut || 0), 0);
    const withOutcomes = activeSignals.filter(s => s.outcomeRating !== null).length;
    const avgGap = (() => {
        const gaps = activeSignals.filter(s => s.honestyGap !== null).map(s => s.honestyGap);
        return gaps.length ? (gaps.reduce((a, b) => a + b, 0) / gaps.length).toFixed(1) : null;
    })();

    const escBadge = escalations > 0
        ? `<span style="background:#7f1d1d;color:#fca5a5;padding:3px 10px;border-radius:12px;font-size:12px;font-weight:600;">⚠ ${escalations} escalation${escalations > 1 ? "s" : ""}</span>`
        : "";

    const tokenBadge = totalTokens > 0
        ? `<span style="font-size:11px;color:#475569;">🪙 ${formatTokens(totalTokens)}</span>`
        : "";

    const calibrationBadge = avgGap !== null
        ? `<span style="font-size:11px;color:${avgGap <= 1 ? '#22c55e' : avgGap <= 2 ? '#eab308' : '#ef4444'};" title="${withOutcomes} outcome signal${withOutcomes > 1 ? 's' : ''}, avg gap: ${avgGap}">🔍 gap ${avgGap}</span>`
        : "";

    const avgBlock = avg ? `
        <div style="display:flex;gap:12px;font-size:11px;color:#64748b;">
            <span>intent <b style="color:#94a3b8;">${avg.intent}</b></span>
            <span>conf <b style="color:#94a3b8;">${avg.confidence}</b></span>
            <span>acc <b style="color:#94a3b8;">${avg.accuracy}</b></span>
            <span>comp <b style="color:#94a3b8;">${avg.completeness}</b></span>
        </div>` : "";

    return `
    <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 14px;
                background:#0f172a;border:1px solid #1e293b;border-radius:8px;margin-bottom:14px;">
        <div style="display:flex;align-items:center;gap:12px;">
            <span style="font-size:13px;color:#cbd5e1;"><b style="color:#f1f5f9;">${activeSignals.length}</b> desk${activeSignals.length !== 1 ? "s" : ""}</span>
            <span style="font-size:11px;color:#475569;">${withSignals} reporting · ${awaiting} awaiting</span>
            ${tokenBadge}
            ${calibrationBadge}
            ${escBadge}
        </div>
        ${avgBlock}
    </div>`;
}

function renderSignalCard(sig) {
    const isEscalation = sig.signalType === "escalation";
    const isPartnership = sig.signalType === "partnership";
    const noSignal = sig.signalType === "none";
    const borderColor = isEscalation ? "#dc2626" : noSignal ? "#1e293b" : "#1e3a5f";
    const bgColor = isEscalation ? "#0f0604" : "#0f172a";

    const typeLabel = isEscalation
        ? (sig.subtype === "blocked"
            ? `<span style="background:#7f1d1d;color:#fca5a5;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600;">⚠ BLOCKED</span>`
            : `<span style="background:#7f1d1d;color:#fca5a5;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600;">⚠ HANDS-UP</span>`)
        : noSignal
        ? `<span style="background:#1e293b;color:#64748b;padding:2px 8px;border-radius:4px;font-size:11px;">📡 awaiting</span>`
        : isPartnership
        ? `<span style="background:#1e3a5f;color:#7dd3fc;padding:2px 8px;border-radius:4px;font-size:11px;">🤝 partnership</span>`
        : sig.subtype === "done"
        ? `<span style="background:#052e16;color:#86efac;padding:2px 8px;border-radius:4px;font-size:11px;">✓ done</span>`
        : `<span style="background:#0c2d48;color:#7dd3fc;padding:2px 8px;border-radius:4px;font-size:11px;">✓ checkpoint</span>`;

    const stashBtn = `<button data-act="stash" data-desk="${esc(sig.deskName)}"
        style="background:none;border:1px solid #1e293b;color:#475569;padding:2px 8px;border-radius:4px;
               font-size:11px;cursor:pointer;transition:all .15s;"
        onmouseover="this.style.borderColor='#dc2626';this.style.color='#fca5a5'"
        onmouseout="this.style.borderColor='#1e293b';this.style.color='#475569'">stash</button>`;

    const openBtnStyle = isEscalation
        ? "background:#7f1d1d;border:1px solid #dc2626;color:#fca5a5;padding:2px 10px;border-radius:4px;font-size:11px;cursor:pointer;font-weight:600;transition:all .15s;"
        : "background:none;border:1px solid #1e3a5f;color:#7dd3fc;padding:2px 8px;border-radius:4px;font-size:11px;cursor:pointer;transition:all .15s;";
    const openBtn = noSignal ? "" : `<button data-act="open" data-desk="${esc(sig.deskName)}"
        style="${openBtnStyle}"
        onmouseover="this.style.background='#1e3a5f'"
        onmouseout="this.style.background='${isEscalation ? '#7f1d1d' : 'transparent'}'"
        title="Open this desk as a Copilot CLI session in its folder">open</button>`;

    let escalationBlock = "";
    if (isEscalation && sig.escalationReason) {
        escalationBlock = `
        <div style="margin-top:10px;padding:8px 10px;background:#1c1917;border-left:3px solid #dc2626;border-radius:0 4px 4px 0;">
            <div style="font-size:11px;color:#fca5a5;font-weight:600;">Blocked on:</div>
            <div style="font-size:12px;color:#e2e8f0;margin-top:2px;">${esc(sig.escalationBlocked || sig.escalationReason)}</div>
            ${sig.recommendation ? `<div style="font-size:11px;color:#94a3b8;margin-top:4px;">→ ${esc(sig.recommendation)}</div>` : ""}
        </div>`;
    }

    // --- Intent text (execution signals with text intent) ---
    const intentBlock = sig.intentText ? `
        <div style="font-size:13px;color:#e2e8f0;line-height:1.5;margin-bottom:10px;padding:8px 10px;
                    background:#020617;border-left:3px solid #3b82f6;border-radius:0 4px 4px 0;">
            ${esc(sig.intentText)}
        </div>` : "";

    // --- Scores: shown for partnership signals, or legacy execution signals with numeric scores ---
    const hasScores = isPartnership
        ? true
        : (sig.intentScore > 0 || sig.confidence > 0 || sig.accuracy > 0 || sig.completeness > 0);

    const scoresBlock = noSignal ? `
        <div style="padding:12px 0;text-align:center;color:#334155;font-size:12px;">
            No signals yet — this desk is waiting for its first session.
        </div>` : isPartnership ? `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px 16px;margin-bottom:12px;">
            ${scoreBar(sig.intentScore, "intent")}
            ${scoreBar(sig.confidence, "confidence")}
            ${scoreBar(sig.accuracy, "accuracy")}
            ${scoreBar(sig.completeness, "completeness")}
        </div>` : hasScores ? `
        <details style="margin-bottom:8px;">
            <summary style="font-size:10px;color:#475569;cursor:pointer;text-transform:uppercase;letter-spacing:.04em;">scores</summary>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px 16px;margin-top:6px;">
                ${sig.intentScore > 0 ? scoreBar(sig.intentScore, "intent") : ""}
                ${sig.confidence > 0 ? scoreBar(sig.confidence, "confidence") : ""}
                ${sig.accuracy > 0 ? scoreBar(sig.accuracy, "accuracy") : ""}
                ${sig.completeness > 0 ? scoreBar(sig.completeness, "completeness") : ""}
            </div>
        </details>` : "";

    // --- Patterns: primary for execution, secondary for partnership ---
    const patternsBlock = (sig.whatWorked || sig.whatWasHard || sig.skillGap) ? `
        <div style="${isPartnership ? 'border-top:1px solid #1e293b;padding-top:8px;margin-top:4px;' : 'margin-bottom:8px;'}">
            ${sig.whatWorked ? `<div style="font-size:12px;margin-bottom:3px;line-height:1.4;"><span style="color:#22c55e;margin-right:4px;">✓</span><span style="color:#94a3b8;">${esc(truncate(sig.whatWorked, 160))}</span></div>` : ""}
            ${sig.whatWasHard ? `<div style="font-size:12px;margin-bottom:3px;line-height:1.4;"><span style="color:#eab308;margin-right:4px;">△</span><span style="color:#94a3b8;">${esc(truncate(sig.whatWasHard, 160))}</span></div>` : ""}
            ${sig.skillGap ? `<div style="font-size:12px;line-height:1.4;"><span style="color:#ef4444;margin-right:4px;">✗</span><span style="color:#94a3b8;">${esc(truncate(sig.skillGap, 160))}</span></div>` : ""}
        </div>` : "";

    // --- Outcome signal / honesty gap ---
    let outcomeBlock = "";
    if (sig.outcomeRating !== null && !noSignal) {
        const gapColor = sig.honestyGap === null ? "#475569"
            : sig.honestyGap <= 1 ? "#22c55e"
            : sig.honestyGap === 2 ? "#eab308"
            : "#ef4444";
        const gapLabel = sig.honestyGap === null ? "—"
            : sig.honestyGap <= 1 ? "well-calibrated"
            : sig.honestyGap === 2 ? "moderate gap"
            : "significant gap";
        const effortColor = sig.outcomeEffort === "minimal" ? "#22c55e"
            : sig.outcomeEffort === "moderate" ? "#eab308"
            : sig.outcomeEffort === "significant" ? "#ef4444" : "#475569";

        outcomeBlock = `
        <div style="margin-top:8px;padding:8px 10px;background:#020617;border:1px solid #1e293b;border-radius:6px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                <span style="font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:.04em;">🔍 outcome${sig.outcomeAgent ? ` · ${esc(sig.outcomeAgent)}` : ""}</span>
                ${sig.honestyGap !== null ? `<span style="font-size:10px;color:${gapColor};font-weight:600;">${gapLabel} (gap: ${sig.honestyGap})</span>` : ""}
            </div>
            <div style="display:flex;gap:16px;align-items:center;">
                <div style="flex:1;">
                    <div style="display:flex;justify-content:space-between;margin-bottom:2px;">
                        <span style="font-size:10px;color:#64748b;">quality</span>
                        <span style="font-size:10px;color:#94a3b8;">${sig.outcomeRating}/5</span>
                    </div>
                    <div style="height:4px;background:#1e293b;border-radius:2px;overflow:hidden;">
                        <div style="width:${(sig.outcomeRating / 5) * 100}%;height:100%;background:${sig.outcomeRating >= 4 ? '#22c55e' : sig.outcomeRating >= 3 ? '#eab308' : '#ef4444'};border-radius:2px;"></div>
                    </div>
                </div>
                <span style="font-size:11px;color:${effortColor};">${esc(sig.outcomeEffort || "—")} effort</span>
            </div>
            ${sig.outcomeIssues?.length ? `<div style="margin-top:6px;font-size:11px;color:#94a3b8;">
                ${sig.outcomeIssues.map(i => `<div style="margin-top:2px;">· ${esc(truncate(i, 120))}</div>`).join("")}
            </div>` : ""}
        </div>`;
    }

    return `
    <div style="background:${bgColor};border:1px solid ${borderColor};border-radius:8px;padding:14px;margin-bottom:8px;
                ${isEscalation ? "animation:pulse 2s ease-in-out infinite;" : ""}">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
            <div style="display:flex;align-items:center;gap:8px;">
                <span style="font-size:15px;font-weight:600;color:#f1f5f9;">${esc(sig.deskName)}</span>
                ${typeLabel}
            </div>
            <div style="display:flex;align-items:center;gap:8px;">
                ${(sig.tokensIn || sig.tokensOut) ? `<span style="font-size:10px;color:#334155;background:#0f172a;border:1px solid #1e293b;padding:1px 6px;border-radius:3px;" title="in: ${sig.tokensIn} · out: ${sig.tokensOut}${sig.model ? ' · ' + esc(sig.model) : ''}">🪙 ${formatTokens(sig.tokensIn + sig.tokensOut)}</span>` : ""}
                <span style="font-size:11px;color:#475569;">${timeSince(sig.emittedAt)}${sig.signalCount ? ` · ${sig.signalCount}` : ""}</span>
                ${openBtn}
                ${stashBtn}
            </div>
        </div>
        ${isPartnership ? `${scoresBlock}${patternsBlock}` : `${intentBlock}${patternsBlock}${scoresBlock}`}
        ${outcomeBlock}
        ${escalationBlock}
    </div>`;
}

function renderStashedCard(entry) {
    return `
    <div style="background:#080808;border:1px solid #1a1a1a;border-radius:6px;padding:8px 12px;margin-bottom:6px;
                display:flex;justify-content:space-between;align-items:center;">
        <div style="display:flex;align-items:center;gap:8px;">
            <span style="font-size:13px;color:#525252;">${esc(entry.name)}</span>
            <span style="font-size:10px;color:#3f3f46;background:#18181b;padding:1px 6px;border-radius:3px;">${timeRemaining(entry.stashedAt)}</span>
        </div>
        <button data-act="restore" data-desk="${esc(entry.name)}"
            style="background:none;border:1px solid #262626;color:#525252;padding:2px 8px;border-radius:4px;
                   font-size:11px;cursor:pointer;transition:all .15s;"
            onmouseover="this.style.borderColor='#22c55e';this.style.color='#86efac'"
            onmouseout="this.style.borderColor='#262626';this.style.color='#525252'">restore</button>
    </div>`;
}

function renderDashboard(signals, stashed, capabilityToken) {
    const activeSignals = sortSignals(signals.filter(s => !stashed.some(e => e.name === s.deskName)));

    const cards = activeSignals.length > 0
        ? activeSignals.map(renderSignalCard).join("")
        : `<div style="text-align:center;padding:30px 20px;color:#475569;">
            <div style="font-size:28px;margin-bottom:10px;">🪨</div>
            <div style="font-size:14px;color:#94a3b8;margin-bottom:16px;">No active desks yet</div>
            <div style="text-align:left;background:#0f172a;border:1px solid #1e293b;border-radius:8px;padding:16px;max-width:360px;margin:0 auto;">
                <div style="font-size:12px;font-weight:600;color:#cbd5e1;margin-bottom:10px;">Get started</div>
                <div style="font-size:12px;color:#94a3b8;line-height:1.6;margin-bottom:8px;">
                    Ask the <b style="color:#7dd3fc;">Workshop TA</b> in chat:
                </div>
                <div style="background:#020617;border:1px solid #1e293b;border-radius:4px;padding:8px 10px;margin-bottom:12px;">
                    <code style="font-size:12px;color:#e2e8f0;background:none;padding:0;">"open a desk called scanning in ~/my-workshop"</code>
                </div>
                <div style="font-size:11px;color:#64748b;line-height:1.5;">
                    The TA uses the <b>desk-open</b> skill to create a desk with a journal. Once a desk emits signals, they'll appear here automatically.
                </div>
                <div style="border-top:1px solid #1e293b;margin-top:12px;padding-top:10px;font-size:11px;color:#475569;">
                    <div style="margin-bottom:4px;">💡 <b style="color:#64748b;">Quick commands to try:</b></div>
                    <div style="color:#64748b;line-height:1.8;">
                        • "open a desk for code review"<br/>
                        • "what's everyone working on?"<br/>
                        • "show me the signals"
                    </div>
                </div>
            </div>
           </div>`;

    const summaryBar = activeSignals.length > 0 ? renderSummaryBar(activeSignals) : "";

    const stashedSection = stashed.length > 0 ? `
        <div style="margin-top:20px;padding-top:12px;border-top:1px solid #1a1a1a;">
            <div style="font-size:11px;font-weight:600;color:#3f3f46;margin-bottom:8px;text-transform:uppercase;letter-spacing:.06em;">
                Stashed · ${stashed.length}
            </div>
            ${stashed.map(renderStashedCard).join("")}
        </div>` : "";

    return `<!doctype html>
<html>
<head>
    <meta charset="utf-8" />
    <title>Cairn · Signals</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
               background: #020617; color: #e2e8f0; padding: 16px; }
        code { background: #1e293b; padding: 1px 5px; border-radius: 3px; font-size: 12px; }
        @keyframes pulse {
            0%, 100% { border-color: #dc2626; }
            50% { border-color: #7f1d1d; }
        }
        #content { transition: opacity .15s; }
        @media (prefers-reduced-motion: reduce) {
            * { animation: none !important; transition: none !important; }
        }
    </style>
</head>
<body>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
        <h1 style="font-size:16px;font-weight:600;color:#f8fafc;">🪨 Cairn</h1>
        <span id="status" style="font-size:11px;color:#334155;">live</span>
    </div>
    <div id="content">
        ${summaryBar}
        ${cards}
        ${stashedSection}
    </div>

    <script>
        // Minted per server, echoed on every mutating fetch so the loopback
        // document proves it actually loaded this page (defense-in-depth with the
        // Host pin + CSRF check on the server).
        const WORKSHOP_TOKEN = ${JSON.stringify(capabilityToken)};
        const POST_OPTS = { method: 'POST', headers: { 'x-workshop-token': WORKSHOP_TOKEN } };
        async function stashDesk(name) {
            await fetch('/api/stash/' + encodeURIComponent(name), POST_OPTS);
            refresh();
        }
        async function restoreDesk(name) {
            await fetch('/api/restore/' + encodeURIComponent(name), POST_OPTS);
            refresh();
        }
        function showToast(title, detail) {
            const toast = document.createElement('div');
            toast.setAttribute('role', 'status');
            toast.setAttribute('aria-live', 'polite');
            toast.style.cssText = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);' +
                'background:#1e3a5f;color:#7dd3fc;padding:10px 20px;border-radius:8px;font-size:13px;' +
                'border:1px solid #3b82f6;z-index:999;max-width:90%;text-align:center;';
            const head = document.createElement('div');
            const strong = document.createElement('b');
            strong.textContent = title;
            head.append('📂 ', strong);
            toast.appendChild(head);
            if (detail) {
                const sub = document.createElement('div');
                sub.style.cssText = 'font-size:10px;color:#93c5fd;margin-top:4px;word-break:break-all;';
                sub.textContent = detail;
                toast.appendChild(sub);
            }
            document.body.appendChild(toast);
            setTimeout(() => toast.remove(), 4000);
        }
        async function openDesk(name) {
            const res = await fetch('/api/open/' + encodeURIComponent(name), POST_OPTS);
            const data = await res.json();
            if (data.ok) {
                const path = data.deskPath || name;
                if (data.launched) {
                    // A successful open shouldn't hijack the user's clipboard.
                    showToast('opening ' + name + ' desk…', path);
                } else {
                    // No terminal launched from here, so copy the path as the
                    // fallback handle, but only claim the copy when it actually
                    // succeeded. The path shows in the toast either way.
                    let copied = false;
                    try { await navigator.clipboard.writeText(path); copied = true; } catch {}
                    showToast(copied ? (name + ' · path copied') : (name + ' · copy this path'), path);
                }
            } else {
                showToast(name + ' · not found', '');
            }
        }
        document.addEventListener('click', (e) => {
            const btn = e.target.closest('button[data-act]');
            if (!btn) return;
            const name = btn.getAttribute('data-desk');
            if (!name) return;
            const act = btn.getAttribute('data-act');
            if (act === 'stash') stashDesk(name);
            else if (act === 'restore') restoreDesk(name);
            else if (act === 'open') openDesk(name);
        });
        async function refresh() {
            try {
                const res = await fetch('/');
                const html = await res.text();
                const parser = new DOMParser();
                const doc = parser.parseFromString(html, 'text/html');
                const newContent = doc.getElementById('content');
                const content = document.getElementById('content');
                if (newContent && content && content.innerHTML !== newContent.innerHTML) {
                    // Preserve keyboard focus across the subtree swap so keyboard
                    // users don't lose their place on every 5s refresh.
                    const active = document.activeElement;
                    let focusKey = null;
                    if (active && active.matches && active.matches('button[data-act]')) {
                        focusKey = active.getAttribute('data-act') + '|' + active.getAttribute('data-desk');
                    }
                    content.innerHTML = newContent.innerHTML;
                    if (focusKey) {
                        const bar = focusKey.indexOf('|');
                        const act = focusKey.slice(0, bar);
                        const desk = focusKey.slice(bar + 1);
                        const escDesk = (window.CSS && CSS.escape) ? CSS.escape(desk) : desk;
                        const target = content.querySelector('button[data-act="' + act + '"][data-desk="' + escDesk + '"]');
                        if (target) target.focus();
                    }
                }
            } catch {}
        }
        // Smooth auto-refresh every 5s (no full page reload)
        setInterval(refresh, 5000);
    </script>
</body>
</html>`;
}

// --- Server ---

async function startServer(instanceId, workshopDir) {
    // Minted once per server: embedded in the page we render and required back on
    // every mutating request. canonicalHost is filled in after listen() so the
    // Host pin knows the exact port we bound.
    const capabilityToken = randomBytes(32).toString("base64url");
    let canonicalHost = null;

    const server = createServer(async (req, res) => {
        try {
        const url = new URL(req.url, `http://${req.headers.host}`);

        // Layered guard for the state-changing /api/* routes (cf.
        // connector-namespaces/server.mjs): the canonical-Host pin defeats DNS
        // rebinding, the CSRF check blocks cross-site browser POSTs, and the
        // capability token proves the caller actually loaded our page.
        if (req.method === "POST" && url.pathname.startsWith("/api/")) {
            if (!isCanonicalHost(req, canonicalHost) || isCrossSiteRequest(req)) {
                res.writeHead(403, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ ok: false, error: "cross_site_blocked" }));
                return;
            }
            if (!hasCapabilityToken(req, capabilityToken)) {
                res.writeHead(403, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ ok: false, error: "missing_capability_token" }));
                return;
            }
        }

        if (req.method === "POST" && url.pathname.startsWith("/api/stash/")) {
            const deskName = decodeURIComponent(url.pathname.split("/api/stash/")[1]);
            if (!isValidDeskName(deskName)) {
                res.writeHead(400, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ ok: false, error: "Invalid desk name" }));
                return;
            }
            await stashDesk(workshopDir, deskName);
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ ok: true }));
            return;
        }
        if (req.method === "POST" && url.pathname.startsWith("/api/restore/")) {
            const deskName = decodeURIComponent(url.pathname.split("/api/restore/")[1]);
            if (!isValidDeskName(deskName)) {
                res.writeHead(400, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ ok: false, error: "Invalid desk name" }));
                return;
            }
            await restoreDesk(workshopDir, deskName);
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ ok: true }));
            return;
        }
        if (req.method === "POST" && url.pathname.startsWith("/api/open/")) {
            const deskName = decodeURIComponent(url.pathname.split("/api/open/")[1]);
            if (!isValidDeskName(deskName)) {
                res.writeHead(400, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ ok: false, error: "Invalid desk name" }));
                return;
            }
            for (const subdir of ["desks", "classroom"]) {
                const deskPath = join(workshopDir, subdir, deskName);
                try {
                    const s = await stat(deskPath);
                    if (s.isDirectory()) {
                        const launched = await launchDeskConsole(deskPath, deskName, workshopDir);
                        res.writeHead(200, { "Content-Type": "application/json" });
                        res.end(JSON.stringify({ ok: true, deskName, deskPath, launched }));
                        return;
                    }
                } catch {}
            }
            res.writeHead(404, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ ok: false, error: "Desk not found" }));
            return;
        }

        const signals = await scanSignals(workshopDir);
        const stashed = await readStash(workshopDir);
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.end(renderDashboard(signals, stashed, capabilityToken));
        } catch (err) {
            // Top-level boundary: never leave a request hanging or let a
            // rejection become an unhandled crash — e.g. malformed %-encoding
            // in the path, a read-only workshop on a stash write, or a scan
            // failure. Return a controlled error instead.
            if (!res.headersSent) {
                res.writeHead(500, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ ok: false, error: "internal_error" }));
            } else {
                try { res.end(); } catch {}
            }
        }
    });
    await new Promise((resolve, reject) => {
        const onError = (err) => { server.removeListener("listening", onListening); reject(err); };
        const onListening = () => { server.removeListener("error", onError); resolve(); };
        server.once("error", onError);
        server.once("listening", onListening);
        server.listen(0, "127.0.0.1");
    });
    const address = server.address();
    const port = typeof address === "object" && address ? address.port : 0;
    canonicalHost = `127.0.0.1:${port}`;
    return { server, url: `http://127.0.0.1:${port}/` };
}

// --- Canvas registration ---

const session = await joinSession({
    canvases: [
        createCanvas({
            id: "signals-dashboard",
            displayName: "Workshop Signals",
            description: "Live dashboard showing agent signals from workshop desks. Pass workshopDir to point at your workshop root.",
            inputSchema: {
                type: "object",
                properties: {
                    workshopDir: { type: "string", description: "Absolute path to the workshop root (the folder containing desks/)" },
                },
                required: ["workshopDir"],
            },
            actions: [
                {
                    name: "refresh",
                    description: "Force-refresh the signals dashboard and return current signal data as JSON",
                    handler: async (ctx) => {
                        const entry = servers.get(ctx.instanceId);
                        if (!entry) return { error: "Dashboard not open" };
                        const signals = await scanSignals(entry.workshopDir);
                        const stashed = await readStash(entry.workshopDir);
                        return { signals, stashed, activeCount: signals.filter(s => !stashed.some(e => e.name === s.deskName)).length };
                    },
                },
                {
                    name: "stash",
                    description: "Stash a desk (hides it for 48hrs, then it drops off). Use to pause a workstream.",
                    inputSchema: {
                        type: "object",
                        properties: { deskName: { type: "string", description: "Name of the desk to stash" } },
                        required: ["deskName"],
                    },
                    handler: async (ctx) => {
                        const entry = servers.get(ctx.instanceId);
                        if (!entry) return { error: "Dashboard not open" };
                        if (!isValidDeskName(ctx.input.deskName)) return { error: "Invalid desk name" };
                        const stash = await stashDesk(entry.workshopDir, ctx.input.deskName);
                        return { ok: true, stashed: stash };
                    },
                },
                {
                    name: "restore",
                    description: "Restore a stashed desk back to active.",
                    inputSchema: {
                        type: "object",
                        properties: { deskName: { type: "string", description: "Name of the desk to restore" } },
                        required: ["deskName"],
                    },
                    handler: async (ctx) => {
                        const entry = servers.get(ctx.instanceId);
                        if (!entry) return { error: "Dashboard not open" };
                        if (!isValidDeskName(ctx.input.deskName)) return { error: "Invalid desk name" };
                        const stash = await restoreDesk(entry.workshopDir, ctx.input.deskName);
                        return { ok: true, stashed: stash };
                    },
                },
                {
                    name: "get_desk_path",
                    description: "Resolve a desk name to its filesystem path. Does not open a session — returns the path so the caller can create_session or navigate to it.",
                    inputSchema: {
                        type: "object",
                        properties: { deskName: { type: "string", description: "Name of the desk to open" } },
                        required: ["deskName"],
                    },
                    handler: async (ctx) => {
                        const entry = servers.get(ctx.instanceId);
                        if (!entry) return { error: "Dashboard not open" };
                        if (!isValidDeskName(ctx.input.deskName)) return { error: "Invalid desk name" };
                        // Check both desks/ and classroom/
                        for (const subdir of ["desks", "classroom"]) {
                            const deskPath = join(entry.workshopDir, subdir, ctx.input.deskName);
                            try {
                                const s = await stat(deskPath);
                                if (s.isDirectory()) {
                                    return { ok: true, deskName: ctx.input.deskName, deskPath, workshopDir: entry.workshopDir };
                                }
                            } catch {}
                        }
                        return { error: `Desk '${ctx.input.deskName}' not found` };
                    },
                },
                {
                    name: "open_desk",
                    description: "Open a desk as an in-place Copilot CLI session: launches a terminal in the desk's folder (inside the workshop repo) running copilot, oriented to read the desk journal and continue. This is the Model A 'sit down at the desk' — no new worktree, no session spun off elsewhere. Returns the desk path and whether a terminal was launched.",
                    inputSchema: {
                        type: "object",
                        properties: { deskName: { type: "string", description: "Name of the desk to open" } },
                        required: ["deskName"],
                    },
                    handler: async (ctx) => {
                        const entry = servers.get(ctx.instanceId);
                        if (!entry) return { error: "Dashboard not open" };
                        if (!isValidDeskName(ctx.input.deskName)) return { error: "Invalid desk name" };
                        for (const subdir of ["desks", "classroom"]) {
                            const deskPath = join(entry.workshopDir, subdir, ctx.input.deskName);
                            try {
                                const s = await stat(deskPath);
                                if (s.isDirectory()) {
                                    const launched = await launchDeskConsole(deskPath, ctx.input.deskName, entry.workshopDir);
                                    return { ok: true, deskName: ctx.input.deskName, deskPath, launched, workshopDir: entry.workshopDir };
                                }
                            } catch {}
                        }
                        return { error: `Desk '${ctx.input.deskName}' not found` };
                    },
                },
            ],
            open: async (ctx) => {
                const workshopDir = ctx.input?.workshopDir || process.cwd();
                let entry = servers.get(ctx.instanceId);
                if (!entry) {
                    entry = await startServer(ctx.instanceId, workshopDir);
                    entry.workshopDir = workshopDir;
                    servers.set(ctx.instanceId, entry);
                }
                return { title: "🪨 Cairn · Signals", url: entry.url };
            },
            onClose: async (ctx) => {
                const entry = servers.get(ctx.instanceId);
                if (entry) {
                    servers.delete(ctx.instanceId);
                    await new Promise((resolve) => entry.server.close(() => resolve()));
                }
            },
        }),
    ],
});
