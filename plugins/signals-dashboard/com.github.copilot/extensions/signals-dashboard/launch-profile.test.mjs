import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { EventEmitter } from "node:events";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import vm from "node:vm";
import {
    buildDeskAgentArgv,
    isDeskProfile,
    isSafeQuotedWindowsCmdArg,
    isSafeWindowsCmdShim,
    isWindowsAppExecutionAlias,
    normalizeDeskProfile,
    parsePluginMcpNames,
    quoteWindowsCmdArgument,
    resolveDeskLaunchPreferences,
} from "./launch-profile.mjs";

async function loadDashboard(t, platform = process.platform, { wrapStat } = {}) {
    const root = mkdtempSync(join(tmpdir(), "workshop-launch-"));
    t.after(() => rmSync(root, { recursive: true, force: true }));
    const bin = join(root, "bin");
    const workshopDir = join(root, "workshop");
    mkdirSync(bin);
    mkdirSync(join(workshopDir, "desks", "probe"), { recursive: true });
    for (const name of ["copilot", "copilot.exe", "sh", "xterm"]) {
        writeFileSync(join(bin, name), "#!/bin/sh\nprintf 'agent-started\\n'\n", { mode: 0o755 });
    }
    const imports = new Map();
    for (const specifier of [
        "node:http", "node:fs", "node:fs/promises", "node:path", "node:child_process", "node:crypto",
        "./launch-profile.mjs", "./local-delegation.mjs",
    ]) {
        imports.set(specifier, await import(specifier.startsWith(".")
            ? new URL(specifier, import.meta.url).href : specifier));
    }
    const spawned = [];
    let canvas;
    const context = vm.createContext({
        process: {
            ...process,
            platform,
            env: { ...process.env, PATH: bin, PATHEXT: ".EXE", WORKSHOP_DESK_AGENT: "copilot" },
        },
        Buffer, URL, console, setTimeout, clearTimeout,
    });
    const module = new vm.SourceTextModule(
        readFileSync(new URL("./extension.mjs", import.meta.url), "utf8"),
        { context },
    );
    await module.link((specifier) => {
        let exports;
        if (specifier === "@github/copilot-sdk/extension") {
            exports = {
                createCanvas: (definition) => definition,
                joinSession: async (options) => { [canvas] = options.canvases; return {}; },
            };
        } else {
            exports = imports.get(specifier);
            if (specifier === "node:child_process") {
                exports = {
                    ...exports,
                    spawn: (command, args, options) => {
                        spawned.push({ command, args, options });
                        const child = new EventEmitter();
                        child.unref = () => {};
                        queueMicrotask(() => child.emit("spawn"));
                        return child;
                    },
                };
            } else if (specifier === "node:fs") {
                const fs = exports;
                const systemTools = new Set(["/bin/sh", "/usr/bin/osascript"]);
                exports = {
                    ...fs,
                    statSync: (file) => systemTools.has(file)
                        ? { isFile: () => true } : fs.statSync(file),
                    accessSync: (file, mode) => {
                        if (!systemTools.has(file)) fs.accessSync(file, mode);
                    },
                    realpathSync: (file) => file === "/bin/sh" || file === join(bin, "sh")
                        ? "/bin/busybox" : fs.realpathSync(file),
                };
            } else if (specifier === "./local-delegation.mjs") {
                exports = {
                    ...exports,
                    resolveLocalDelegationAvailability: () => ({ available: false, reason: "test fixture" }),
                };
            } else if (specifier === "node:fs/promises" && wrapStat) {
                exports = { ...exports, stat: wrapStat(exports.stat) };
            }
        }
        return new vm.SyntheticModule(Object.keys(exports), function () {
            for (const [name, value] of Object.entries(exports)) this.setExport(name, value);
        }, { context });
    });
    await module.evaluate();
    const instanceId = "launch-test";
    t.after(() => canvas.onClose({ instanceId }));
    const open = (input = {}) => canvas.open({ instanceId, input: { workshopDir, ...input } });
    const launch = (input = {}) => canvas.actions.find((action) => action.name === "open_desk")
        .handler({ instanceId, input: { deskName: "probe", profile: "connected", ...input } });
    const action = (name, input = {}) => canvas.actions.find((candidate) => candidate.name === name)
        .handler({ instanceId, input });
    return { open, launch, action, spawned, workshopDir, bin };
}

test("normalizes supported profiles and defaults unknown values to repo", () => {
    assert.equal(isDeskProfile("repo"), true);
    assert.equal(isDeskProfile("CONNECTED"), true);
    assert.equal(isDeskProfile("other"), false);
    assert.equal(normalizeDeskProfile("CONNECTED"), "connected");
    assert.equal(normalizeDeskProfile("other"), "repo");
});

test("recognizes Windows App Execution Alias paths without trusting repository executables", () => {
    assert.equal(isWindowsAppExecutionAlias(
        "C:\\Users\\person\\AppData\\Local\\Microsoft\\WindowsApps\\wt.exe",
        "C:\\Users\\person\\AppData\\Local"), true);
    assert.equal(isWindowsAppExecutionAlias(
        "C:\\repo\\wt.exe",
        "C:\\Users\\person\\AppData\\Local"), false);
    assert.equal(isWindowsAppExecutionAlias(
        "C:\\Users\\person\\AppData\\Local\\Microsoft\\WindowsApps\\wt.cmd",
        "C:\\Users\\person\\AppData\\Local"), false);
});

test("quotes trusted cmd shim arguments and rejects percent-bearing paths", () => {
    assert.equal(
        quoteWindowsCmdArgument("C:\\Program Files\\Agency\\agency.cmd"),
        "\"C:\\Program Files\\Agency\\agency.cmd\"");
    assert.equal(quoteWindowsCmdArgument("--scope"), "\"--scope\"");
    assert.equal(isSafeWindowsCmdShim("C:\\Program Files\\Agency\\agency.cmd"), true);
    assert.equal(isSafeWindowsCmdShim("C:\\Users\\%USERNAME%\\agency.cmd"), false);
    // Quoted args may contain parentheses (common workshop folders).
    assert.equal(isSafeQuotedWindowsCmdArg("C:\\Work\\Project (1)"), true);
    assert.equal(isSafeQuotedWindowsCmdArg("C:\\Users\\%USERNAME%\\w"), false);
    assert.equal(isSafeQuotedWindowsCmdArg("C:\\Users\\!DELAY!\\w"), false);
});

test("executes a Windows cmd shim with safe quoting", {
    skip: process.platform !== "win32",
}, () => {
    const root = mkdtempSync(join(tmpdir(), "workshop-profile-"));
    const shimDir = join(root, "Shim Name");
    mkdirSync(shimDir);
    const shim = join(shimDir, "copilot.cmd");
    writeFileSync(shim, "@echo off\r\necho {\"plugins\":[]}\r\n");

    const cmd = join(process.env.SystemRoot, "System32", "cmd.exe");
    const commandLine = `"${[shim, "plugins", "list"]
        .map(quoteWindowsCmdArgument)
        .join(" ")}"`;
    const result = spawnSync(cmd, ["/d", "/s", "/c", commandLine], {
        encoding: "utf8",
        windowsHide: true,
        windowsVerbatimArguments: true,
    });

    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /\{"plugins":\[\]\}/);
});

test("extracts enabled plugin-scoped MCP names and rejects unsafe names", () => {
    const names = parsePluginMcpNames(JSON.stringify({
        plugins: [
            { kind: "mcp", name: "teams", scope: "plugin", enabled: true },
            { kind: "mcp", name: "repo-mcp", source: "plugin", enabled: true },
            { kind: "mcp", name: "teams", scope: "plugin", enabled: true },
            { kind: "mcp", name: "disabled", scope: "plugin", enabled: false },
            { kind: "mcp", name: "workspace", scope: "repository", enabled: true },
            { kind: "skill", name: "not-an-mcp", scope: "plugin", enabled: true },
            { kind: "mcp", name: "bad;name", scope: "plugin", enabled: true },
        ],
    }));

    assert.deepEqual(names, ["teams", "repo-mcp"]);
    assert.deepEqual(parsePluginMcpNames(`Agency startup\n${JSON.stringify({
        plugins: [{ kind: "mcp", name: "ado", scope: "plugin", enabled: true }],
    })}`), ["ado"]);
    assert.equal(parsePluginMcpNames("not json"), null);
    assert.equal(parsePluginMcpNames("{}"), null);
});

test("builds an Agency repo profile on top of the existing wrapper", () => {
    assert.deepEqual(buildDeskAgentArgv({
        deskName: "cost-desk",
        workshopDir: "C:\\workshop",
        useAgency: true,
        agencyCommand: "C:\\tools\\agency.exe",
        profile: "repo",
        pluginMcpNames: ["teams", "ado"],
    }).slice(0, -2), [
        "C:\\tools\\agency.exe", "copilot", "--no-default-mcps",
        "--disable-mcp-server", "teams",
        "--disable-mcp-server", "ado",
        "--add-dir", "C:\\workshop",
    ]);
});

test("builds a plain Copilot repo profile without Agency-only flags", () => {
    assert.deepEqual(buildDeskAgentArgv({
        deskName: "cost-desk",
        workshopDir: "/workshop",
        useAgency: false,
        copilotCommand: "/usr/local/bin/copilot",
        profile: "repo",
        pluginMcpNames: ["calendar"],
    }).slice(0, -2), [
        "/usr/local/bin/copilot", "--name", "cost-desk",
        "--disable-mcp-server", "calendar",
        "--add-dir", "/workshop",
    ]);
});

test("connected preserves tools while Agency discovery failure still removes defaults", () => {
    assert.deepEqual(buildDeskAgentArgv({
        deskName: "cost-desk",
        workshopDir: "/workshop",
        useAgency: true,
        profile: "connected",
        pluginMcpNames: ["teams"],
    }).slice(0, -2), [
        "agency", "copilot", "--add-dir", "/workshop",
    ]);

    assert.deepEqual(buildDeskAgentArgv({
        deskName: "cost-desk",
        workshopDir: "/workshop",
        useAgency: true,
        profile: "repo",
        pluginMcpNames: [],
        discoverySucceeded: false,
    }).slice(0, -2), [
        "agency", "copilot", "--no-default-mcps", "--add-dir", "/workshop",
    ]);
});

test("launches use independent session UUIDs and explicit preferences across both routes and profiles", () => {
    const ids = new Set();
    for (const useAgency of [false, true]) {
        for (const profile of ["repo", "connected"]) {
            const argv = buildDeskAgentArgv({
                deskName: "probe",
                workshopDir: "C:\\workshop",
                useAgency,
                profile,
                pluginMcpNames: ["teams"],
                launchPreferences: {
                    model: "example-model",
                    reasoningEffort: "max",
                    context: "long_context",
                },
            });
            const sessionIndex = argv.indexOf("--session-id");
            assert.notEqual(sessionIndex, -1);
            const id = argv[sessionIndex + 1];
            assert.match(id, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
            assert.equal(ids.has(id), false);
            ids.add(id);
            assert.equal(argv[argv.indexOf("--model") + 1], "example-model");
            assert.equal(argv[argv.indexOf("--reasoning-effort") + 1], "max");
            assert.equal(argv[argv.indexOf("--context") + 1], "long_context");
            assert.equal(argv.includes("--no-default-mcps"), useAgency && profile === "repo");
            assert.equal(argv.includes("--disable-mcp-server"), profile === "repo");
            assert.equal(argv.includes("--resume"), false);
            assert.equal(argv.includes("--continue"), false);
        }
    }
});

test("explicit launch preferences reject invalid values instead of silently using defaults", () => {
    for (const [key, value] of [
        ["model", 'model" & echo unexpected'],
        ["reasoningEffort", "unlimited"],
        ["context", "1M"],
        ["model", null],
        ["context", ""],
        ["reasoningEffort", 5],
    ]) {
        assert.throws(() => buildDeskAgentArgv({
            deskName: "probe",
            workshopDir: "C:\\workshop",
            useAgency: false,
            launchPreferences: { [key]: value },
        }), /Invalid desk launch/);
    }
});

test("per-launch preferences override the panel selection without resetting other fields", () => {
    assert.deepEqual(resolveDeskLaunchPreferences({
        reasoningEffort: "low",
    }, {
        model: "example-model",
        reasoningEffort: "high",
        context: "long_context",
    }), {
        model: "example-model",
        reasoningEffort: "low",
        context: "long_context",
    });
    assert.deepEqual(resolveDeskLaunchPreferences(), {});
});

test("reopening a panel without preferences clears its previous selection", async (t) => {
    const dashboard = await loadDashboard(t);
    const preferences = { model: "example-model", reasoningEffort: "max", context: "long_context" };
    await dashboard.open(preferences);
    assert.deepEqual((await dashboard.launch()).launchPreferences, preferences);

    await dashboard.open();
    assert.deepEqual((await dashboard.launch()).launchPreferences, {});
    assert.deepEqual((await dashboard.launch({ reasoningEffort: "low" })).launchPreferences,
        { reasoningEffort: "low" });
    assert.deepEqual((await dashboard.launch()).launchPreferences, {});
});

test("open_desk returns invalid launch preferences as an input error without spawning", async (t) => {
    const dashboard = await loadDashboard(t);
    await dashboard.open();
    const result = await dashboard.launch({ model: "model with spaces" });
    assert.equal(result.error, "Invalid desk launch model");
    assert.equal(dashboard.spawned.length, 0);
});

test("Linux launches preserve the sh invocation when its executable resolves to BusyBox", async (t) => {
    const dashboard = await loadDashboard(t, "linux");
    await dashboard.open();
    assert.equal((await dashboard.launch()).launched, true);
    assert.deepEqual(Array.from(dashboard.spawned.at(-1).args).slice(0, 3), ["-e", "/bin/sh", "-c"]);
});

test("macOS terminal command does not launch if the desk disappears", {
    skip: process.platform === "win32",
}, async (t) => {
    const dashboard = await loadDashboard(t, "darwin");
    await dashboard.open();
    const launch = await dashboard.launch();
    assert.equal(launch.launched, true);
    const script = dashboard.spawned.at(-1).args[1];
    const command = JSON.parse(script.match(/^\s*do script (".*")$/m)[1]);
    rmSync(launch.deskPath, { recursive: true });
    const result = spawnSync("/bin/sh", ["-c", command], { encoding: "utf8", timeout: 10000 });
    assert.equal(result.error, undefined);
    assert.notEqual(result.status, 0);
    assert.equal(result.stdout, "");
});

function makeDesks(workshopDir, ...desks) {
    for (const desk of desks) mkdirSync(join(workshopDir, ...desk.split("/")), { recursive: true });
}

function writeSignal(workshopDir, desk, signal, file = "signal.json") {
    const dir = join(workshopDir, ...desk.split("/"), ".signals");
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, file), JSON.stringify(signal));
}

const minutesAgo = (minutes) => new Date(Date.now() - minutes * 60000).toISOString();
const sectionOrder = (html) => Array.from(html.matchAll(/<section data-group="([^"]+)"/g), (m) => m[1]);

test("discovers desks in desks/, classroom/, and every *-desks/ group folder", async (t) => {
    const dashboard = await loadDashboard(t);
    makeDesks(dashboard.workshopDir, "classroom/legacy", "team-desks/forge", "team-desks/scout", "Ops-DESKS/runner");
    await dashboard.open();

    const { signals } = await dashboard.action("refresh");
    assert.deepEqual([...new Set(Array.from(signals, (s) => s.group))],
        ["desks", "classroom", "Ops-DESKS", "team-desks"]);
    assert.deepEqual(Array.from(signals, (s) => s.deskId).sort(), [
        "Ops-DESKS/runner", "classroom/legacy", "desks/probe", "team-desks/forge", "team-desks/scout",
    ]);
    const forge = signals.find((s) => s.deskId === "team-desks/forge");
    assert.equal(forge.deskName, "forge");
    assert.equal(forge.group, "team-desks");

    const found = await dashboard.action("get_desk_path", { deskName: "forge" });
    assert.equal(found.deskId, "team-desks/forge");
    assert.equal(found.deskPath, join(dashboard.workshopDir, "team-desks", "forge"));
});

test("ignores top-level folders that are not desk roots", async (t) => {
    const dashboard = await loadDashboard(t);
    makeDesks(dashboard.workshopDir, "bench/notes", "desks-archive/old", "-desks/blank", ".team-desks/hidden");
    writeFileSync(join(dashboard.workshopDir, "notes-desks"), "a file, not a folder");
    await dashboard.open();

    const { signals } = await dashboard.action("refresh");
    assert.deepEqual(Array.from(signals, (s) => s.deskId), ["desks/probe"]);
    for (const deskName of ["bench/notes", ".team-desks/hidden", "../desks/probe", "team-desks/../probe"]) {
        assert.equal((await dashboard.action("get_desk_path", { deskName })).error, "Invalid desk name");
    }
});

test("refuses to launch a desk whose path holds ';', which Windows Terminal splits commands on", {
    skip: process.platform !== "win32",
}, async (t) => {
    const dashboard = await loadDashboard(t);
    writeFileSync(join(dashboard.bin, "wt.exe"), "");
    makeDesks(dashboard.workshopDir, "team-desks/probe", "a;b-desks/probe");
    await dashboard.open();

    assert.equal((await dashboard.launch({ deskName: "team-desks/probe" })).launched, true);
    assert.deepEqual(Array.from(dashboard.spawned, (s) => s.args[0]), ["-d"]);

    const unsafe = await dashboard.launch({ deskName: "a;b-desks/probe" });
    assert.equal(unsafe.deskId, "a;b-desks/probe");
    assert.equal(unsafe.launched, false);
    assert.equal(dashboard.spawned.length, 1);
});

test("stash and restore keep same-named desks in different groups apart", async (t) => {
    const dashboard = await loadDashboard(t);
    makeDesks(dashboard.workshopDir, "team-desks/probe");
    // An entry written before desk groups holds only a name. Group folders didn't
    // exist then, so it never covered team-desks/probe.
    writeFileSync(join(dashboard.workshopDir, ".desk-stash.json"),
        JSON.stringify([{ name: "probe", stashedAt: new Date().toISOString() }]));
    await dashboard.open();
    const state = async () => {
        const { signals, stashed, activeCount } = await dashboard.action("refresh");
        const stashedIds = Array.from(stashed, (e) => e.id).sort();
        const active = Array.from(signals, (s) => s.deskId).filter((id) => !stashedIds.includes(id));
        return { stashed: stashedIds, active, activeCount };
    };

    assert.deepEqual(await state(), { stashed: ["desks/probe"], active: ["team-desks/probe"], activeCount: 1 });

    await dashboard.action("stash", { deskName: "team-desks/probe" });
    assert.deepEqual(await state(), { stashed: ["desks/probe", "team-desks/probe"], active: [], activeCount: 0 });

    await dashboard.action("restore", { deskName: "team-desks/probe" });
    assert.deepEqual(await state(), { stashed: ["desks/probe"], active: ["team-desks/probe"], activeCount: 1 });

    await dashboard.action("restore", { deskName: "desks/probe" });
    assert.deepEqual((await state()).stashed, []);
    assert.equal((await state()).activeCount, 2);
});

test("stash entries from before desk groups still hide that desk in desks/ and classroom/", async (t) => {
    const dashboard = await loadDashboard(t);
    makeDesks(dashboard.workshopDir, "classroom/legacy", "classroom/probe", "team-desks/probe");
    const stashedAt = new Date().toISOString();
    writeFileSync(join(dashboard.workshopDir, ".desk-stash.json"),
        JSON.stringify([{ name: "legacy", stashedAt }, { name: "probe", stashedAt }]));
    await dashboard.open();
    const state = async () => {
        const { signals, stashed } = await dashboard.action("refresh");
        const stashedIds = Array.from(stashed, (e) => e.id).sort();
        const active = Array.from(signals, (s) => s.deskId).filter((id) => !stashedIds.includes(id)).sort();
        return { stashed: stashedIds, active };
    };

    assert.deepEqual(await state(), {
        stashed: ["classroom/legacy", "classroom/probe", "desks/probe"],
        active: ["team-desks/probe"],
    });

    await dashboard.action("restore", { deskName: "classroom/probe" });
    assert.deepEqual(await state(), {
        stashed: ["classroom/legacy", "desks/probe"],
        active: ["classroom/probe", "team-desks/probe"],
    });
});

test("a refresh that overlaps a restore can't stash the restored desk again", { timeout: 10000 }, async (t) => {
    let hold = null;
    const dashboard = await loadDashboard(t, process.platform, {
        wrapStat: (stat) => async (file, ...rest) => {
            if (file === hold?.file) {
                const { reached, released } = hold;
                hold = null;
                reached();
                await released;
            }
            return stat(file, ...rest);
        },
    });
    makeDesks(dashboard.workshopDir, "classroom/probe");
    // An entry from before desk groups covers both desks/probe and classroom/probe.
    writeFileSync(join(dashboard.workshopDir, ".desk-stash.json"),
        JSON.stringify([{ name: "probe", stashedAt: new Date().toISOString() }]));
    await dashboard.open();

    // Hold a refresh after it has read the stash file, while it checks which
    // roots hold "probe", and restore classroom/probe in the meantime.
    let release;
    const released = new Promise((resolve) => { release = resolve; });
    const reached = new Promise((resolve) => {
        hold = { file: join(dashboard.workshopDir, "classroom", "probe"), reached: resolve, released };
    });
    const refresh = dashboard.action("refresh");
    await reached;
    await dashboard.action("restore", { deskName: "classroom/probe" });
    release();
    await refresh;

    const { stashed } = await dashboard.action("refresh");
    assert.deepEqual(Array.from(stashed, (e) => e.id), ["desks/probe"]);
});

test("the board adds group headers only when desks come from more than one root", async (t) => {
    const dashboard = await loadDashboard(t);
    const { url } = await dashboard.open();

    const single = await (await fetch(url)).text();
    assert.equal(single.includes("<section data-group="), false);
    assert.match(single, /data-desk="desks\/probe" data-label="probe"/);

    makeDesks(dashboard.workshopDir, "team-desks/probe");
    const grouped = await (await fetch(url)).text();
    const desksAt = grouped.indexOf('<section data-group="desks"');
    const teamAt = grouped.indexOf('<section data-group="team-desks"');
    assert.ok(desksAt !== -1 && teamAt > desksAt);
    assert.match(grouped, /data-desk="team-desks\/probe" data-label="team-desks\/probe"/);
});

test("a grouped board pins escalations from every group above the group sections", async (t) => {
    const dashboard = await loadDashboard(t);
    writeSignal(dashboard.workshopDir, "desks/alpha", { signal_type: "execution", timestamp: minutesAgo(1) });
    writeSignal(dashboard.workshopDir, "team-desks/forge", {
        signal_type: "escalation", subtype: "blocked", timestamp: minutesAgo(30),
        escalation: { reason: "needs a decision", blocked_on: "which flag ships" },
    });
    makeDesks(dashboard.workshopDir, "team-desks/scout");
    const { url } = await dashboard.open();

    const html = await (await fetch(url)).text();
    assert.deepEqual(sectionOrder(html), ["escalations", "desks", "team-desks"]);
    assert.equal(html.split('data-act="stash" data-desk="team-desks/forge"').length - 1, 1);
    const pinned = html.slice(html.indexOf('<section data-group="escalations"'), html.indexOf('<section data-group="desks"'));
    assert.match(pinned, /data-act="stash" data-desk="team-desks\/forge"/);
    assert.match(pinned, />team-desks\/forge<\/span>/);
    const teamAt = html.indexOf('<section data-group="team-desks"');
    assert.match(html.slice(teamAt, html.indexOf("</h2>", teamAt)), /⚠ 1/);
});

test("a grouped board orders groups by their newest active signal, then scan order", async (t) => {
    const dashboard = await loadDashboard(t);
    makeDesks(dashboard.workshopDir, "classroom/legacy");
    writeSignal(dashboard.workshopDir, "ops-desks/runner", { signal_type: "execution", timestamp: minutesAgo(60) });
    writeSignal(dashboard.workshopDir, "ops-desks/paused", { signal_type: "execution", timestamp: minutesAgo(1) });
    writeSignal(dashboard.workshopDir, "team-desks/forge", { signal_type: "execution", timestamp: minutesAgo(5) });
    // A stashed desk's newer signal must not lift its group.
    writeFileSync(join(dashboard.workshopDir, ".desk-stash.json"),
        JSON.stringify([{ id: "ops-desks/paused", name: "paused", stashedAt: new Date().toISOString() }]));
    const { url } = await dashboard.open();

    const html = await (await fetch(url)).text();
    assert.deepEqual(sectionOrder(html), ["team-desks", "ops-desks", "desks", "classroom"]);
});

test("the summary bar shows a real honesty gap while another desk awaits its first signal", async (t) => {
    const dashboard = await loadDashboard(t);
    writeSignal(dashboard.workshopDir, "desks/alpha", {
        signal_type: "execution", run_id: "run-1", timestamp: minutesAgo(10), self_assessment: { confidence: 4 },
    });
    writeSignal(dashboard.workshopDir, "desks/alpha",
        { signal_type: "outcome", run_id: "run-1", quality_rating: 3, timestamp: minutesAgo(5) }, "outcome.json");
    const { url } = await dashboard.open();

    const html = await (await fetch(url)).text();
    assert.doesNotMatch(html, /gap NaN/);
    assert.match(html, /title="1 outcome signal, avg gap: 1\.0">🔍 gap 1\.0</);
});
