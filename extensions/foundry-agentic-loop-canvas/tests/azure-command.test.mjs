import { test } from "node:test";
import assert from "node:assert/strict";
import { AZD_MINIMUM, Azure, azdVersion, resolveCommand, versionAtLeast } from "../lib/azure.mjs";

const comSpec = "C:\\Windows\\System32\\cmd.exe";
const scriptPath = "C:\\Program Files (x86)\\Microsoft SDKs\\Azure\\CLI2\\wbin\\az.cmd";
const windows = (files, env = {}) => ({
    platform: "win32",
    env: { PATH: `C:\\Windows\\System32;${scriptPath.slice(0, scriptPath.lastIndexOf("\\"))}`, ComSpec: comSpec, ...env },
    exists: file => files.includes(file),
});

// cmd.exe phase 1 on a command line: defined %NAME% references expand; undefined ones stay as typed.
const expandPercent = (line, env) => line.replace(/%([^%]+)%/g, (match, name) => Object.hasOwn(env, name) ? env[name] : match);

// cmd.exe phase 2: outside quotes a caret escapes the next character; unescaped quotes toggle quoting.
function cmdUnescape(line) {
    let output = "";
    let quoted = false;
    for (let index = 0; index < line.length; index++) {
        const char = line[index];
        if (!quoted && char === "^") { output += line[++index] ?? ""; continue; }
        if (char === '"') quoted = !quoted;
        else if (!quoted && /[&|<>()]/.test(char)) throw new Error(`Unescaped ${char} would be parsed by cmd.exe: ${line}`);
        output += char;
    }
    return output;
}

// CommandLineToArgvW: 2n backslashes + quote -> n backslashes and toggle; 2n+1 -> n backslashes and a literal quote.
function parseArgv(line) {
    const args = [];
    let current = "";
    let quoted = false;
    let started = false;
    for (let index = 0; index < line.length; index++) {
        const char = line[index];
        if (char === "\\") {
            let count = 0;
            while (line[index] === "\\") { count += 1; index += 1; }
            if (line[index] === '"') {
                current += "\\".repeat(Math.floor(count / 2));
                if (count % 2) current += '"';
                else quoted = !quoted;
            } else {
                current += "\\".repeat(count);
                index -= 1;
            }
            started = true;
        } else if (char === '"') {
            quoted = !quoted;
            started = true;
        } else if (!quoted && (char === " " || char === "\t")) {
            if (started) args.push(current);
            current = "";
            started = false;
        } else {
            current += char;
            started = true;
        }
    }
    if (started) args.push(current);
    return args;
}

test("commands run unchanged outside Windows", () => {
    const args = ["account", "list", "--query", "[?name=='a b']"];
    assert.deepEqual(resolveCommand("az", args, { platform: "darwin", env: {}, exists: () => true }), { file: "az", args, options: {} });
    assert.deepEqual(resolveCommand("azd", ["version"], { platform: "linux", env: {}, exists: () => true }), { file: "azd", args: ["version"], options: {} });
});

test("Windows resolves commands across PATH directories, then PATHEXT, running only .cmd and .bat through ComSpec", () => {
    const env = { PATH: 'C:\\one;"C:\\two";;', ComSpec: comSpec };
    const run = (files, extra = {}, file = "az") => resolveCommand(file, ["version"], { platform: "win32", env: { ...env, ...extra }, exists: candidate => files.includes(candidate) });

    const viaCmd = run(["C:\\one\\az.cmd", "C:\\two\\az.exe"]);
    assert.equal(viaCmd.file, comSpec, "an earlier PATH directory wins over a preferred extension");
    assert.deepEqual(viaCmd.args, ["/d", "/s", "/c", '""C:\\one\\az.cmd" ^^^"version^^^""']);
    assert.deepEqual(viaCmd.options, { windowsVerbatimArguments: true });

    assert.deepEqual(run(["C:\\two\\az.cmd", "C:\\two\\az.exe"]), { file: "C:\\two\\az.exe", args: ["version"], options: {} }, "quoted PATH entries are unquoted and .EXE precedes .CMD");
    assert.equal(run(["C:\\two\\az.cmd", "C:\\two\\az.exe"], { PATHEXT: ".CMD;.EXE" }).args[3], '""C:\\two\\az.cmd" ^^^"version^^^""', "PATHEXT order is honored");
    assert.deepEqual(run(["C:\\one\\az.com"]), { file: "C:\\one\\az.com", args: ["version"], options: {} });
    assert.equal(run(["C:\\one\\az.bat"]).file, comSpec);
    assert.equal(run(["C:\\one\\az.cmd"], { ComSpec: "" }).file, "cmd.exe");
    assert.deepEqual(run([]), { file: "az", args: ["version"], options: {} }, "a missing command keeps its name so execFile reports ENOENT");
    assert.deepEqual(run(["C:\\azd\\azd.exe"], { PATH: undefined, Path: "C:\\azd" }, "azd"), { file: "C:\\azd\\azd.exe", args: ["version"], options: {} });
    assert.deepEqual(run(["C:\\one\\azd.exe"], {}, "azd.exe"), { file: "C:\\one\\azd.exe", args: ["version"], options: {} });
});

test("Windows rejects line breaks in arguments passed through cmd.exe", () => {
    for (const value of ["a\rb", "a\nb", "a\r\nb"]) {
        assert.throws(() => resolveCommand("az", ["rest", "--body", value], windows([scriptPath])), /az: an argument contains a line break/);
    }
    assert.equal(resolveCommand("azd", ["a\nb"], windows(["C:\\Windows\\System32\\azd.exe"])).file, "C:\\Windows\\System32\\azd.exe", "executables receive arguments directly");
});

test("cmd.exe escaping round-trips tricky arguments through az.cmd", () => {
    const tricky = [
        "rest", "plain", "a b", "  padded  ", "", 'say "hi"', '"', '""', "C:\\dir\\", "C:\\dir with space\\", "trailing\\\\",
        'a\\"b', 'a\\\\"b', "a\\\\b", "&|<>^%!", "^", "%PATH%", "%PATH:a=b%", "!PATH!", "(x)", ")", "a,b;c=d", "*?", "`tick`",
        "[?name=='a b'].{id:id}", JSON.stringify({ query: "a & b | c", path: "C:\\x\\", quote: '"q"' }),
        "https://management.azure.com/subscriptions/x?api-version=2025-06-01&$skiptoken=a%3D%3D",
    ];
    const resolved = resolveCommand("az", tricky, windows([scriptPath]));
    assert.equal(resolved.file, comSpec);
    const line = resolved.args[3];
    assert(line.startsWith('""') && line.endsWith('"'));
    const commandLine = line.slice(1, -1);
    assert.doesNotMatch(commandLine, /(?<!\^)%/, "every percent sign is caret-escaped");
    const parsed = cmdUnescape(expandPercent(commandLine, { PATH: "C:\\Windows" }));
    const reparsed = cmdUnescape(parsed);
    assert.deepEqual(parseArgv(reparsed), [scriptPath, ...tricky]);
});

test("azd versions parse from azd version output and compare numerically", () => {
    assert.equal(AZD_MINIMUM, "1.32.0");
    assert.deepEqual(azdVersion("azd version 1.35.1 (commit 0a1b2c3d) (stable)"), [1, 35, 1]);
    assert.deepEqual(azdVersion("azd version 1.32.0-beta.1-daily.5 (commit 0a1b2c3d)"), [1, 32, 0]);
    for (const unknown of ["Available", "", null, "version 1.35.1"]) assert.equal(azdVersion(unknown), null);
    for (const ok of [[1, 32, 0], [1, 32, 1], [1, 35, 1], [1, 100, 0], [2, 0, 0]]) assert(versionAtLeast(ok, AZD_MINIMUM), ok.join("."));
    for (const old of [[1, 31, 9], [1, 27, 1], [0, 99, 99]]) assert(!versionAtLeast(old, AZD_MINIMUM), old.join("."));
});

test("setup flags an azd older than the minimum and treats unparsable output as unknown", async () => {
    const azdCheck = async output => {
        const azure = new Azure(async (file, args) => {
            if (file === "azd" && args.join(" ") === "version") return output;
            if (file === "az") return args[0] === "version" ? { "azure-cli": "2.75.0" } : { expiresOn: "2030-01-01" };
            return "Available";
        });
        return (await azure.prerequisites([], [])).checks.find(check => check.id === "azd");
    };
    assert.deepEqual(await azdCheck("azd version 1.35.1 (commit 0a1b2c3d) (stable)"),
        { id: "azd", label: "Azure Developer CLI", status: "ready", data: "azd version 1.35.1 (commit 0a1b2c3d) (stable)" });
    const old = await azdCheck("azd version 1.27.1 (commit 0a1b2c3d) (stable)");
    assert.equal(old.status, "error");
    assert.match(old.error, /^azd 1\.27\.1 is older than 1\.32\.0, which the Agentic Loop needs\. Update azd .*then recheck\.$/);
    assert.deepEqual(await azdCheck("Available"), { id: "azd", label: "Azure Developer CLI", status: "ready", data: "Available" });
});
